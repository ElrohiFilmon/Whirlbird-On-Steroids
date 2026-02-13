import './game.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ObstacleManager } from './game/obstacles';
import type { SubmitScoreResponse, PublishScoreResponse, CommentScoreResponse } from '../shared/api';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
interface PlayerBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/* ================================================================== */
/*  State                                                              */
/* ================================================================== */
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let player: THREE.Object3D;
let obstacleManager: ObstacleManager;
let stars: THREE.Points;

let score = 0;
let best = 0;
let isReady = false;
let isRunning = false;
let isGameOver = false;

/* ================================================================== */
/*  Tuning – all in world-units, responsive-friendly                   */
/* ================================================================== */
const PLAYER_WORLD_SIZE = 0.8;
const PLAYER_START      = new THREE.Vector3(0, 1.5, 0);
const MOVE_SPEED        = 10;
const LERP_FACTOR       = 6;
const PLAYER_BOUNDS: PlayerBounds = { minX: -8, maxX: 8, minY: -1, maxY: 6 };

const ARCH_WORLD_SIZE   = 3.5;
const RING_WORLD_SIZE   = 1.2;
const TREE_WORLD_SIZE   = 2.2;

const BASE_SPEED        = 18;
const MAX_SPEED         = 38;
const SPAWN_DISTANCE    = 100;
const DESPAWN_DISTANCE  = 14;
const SPAWN_INTERVAL    = 2.2;

const BEST_KEY = 'wirlonsteroid.best';
const clock    = new THREE.Clock();
const playerBox = new THREE.Box3();
const loader   = new GLTFLoader();
const playerTarget = new THREE.Vector3().copy(PLAYER_START);

/* ================================================================== */
/*  Input                                                              */
/* ================================================================== */
const keys: Record<string, boolean> = {};
let pointerDown  = false;
let lastPointerX = 0;
let lastPointerY = 0;

/* ================================================================== */
/*  DOM                                                                */
/* ================================================================== */
const scoreEl        = document.getElementById('score');
const bestEl         = document.getElementById('best');
const messageEl      = document.getElementById('message');
const controlsEl     = document.getElementById('controls');
const loadingEl      = document.getElementById('game-loading');
const loadBarEl      = document.getElementById('load-bar-fill');
const loadLabelEl    = document.getElementById('load-label');
const gameOverEl     = document.getElementById('game-over-overlay');
const goScoreEl      = document.getElementById('go-score');
const goBestEl       = document.getElementById('go-best');
const goNewBestEl    = document.getElementById('go-new-best');
const goRetryEl      = document.getElementById('go-retry');
const goPublishEl    = document.getElementById('go-publish');
const goCommentEl    = document.getElementById('go-comment');

/* Publish modals */
const publishOverlay   = document.getElementById('publish-overlay');
const pubScoreEl       = document.getElementById('pub-score');
const pubCloseEl       = document.getElementById('pub-close');
const pubCancelEl      = document.getElementById('pub-cancel');
const pubConfirmEl     = document.getElementById('pub-confirm') as HTMLButtonElement | null;
const publishSuccessEl = document.getElementById('publish-success');
const pubViewEl        = document.getElementById('pub-view');
const pubDoneEl        = document.getElementById('pub-done');
const commentSuccessEl = document.getElementById('comment-success');
const cmtDoneEl        = document.getElementById('cmt-done');
const toastEl          = document.getElementById('toast');

let lastPublishedUrl = '';

/* ================================================================== */
/*  Loading progress                                                   */
/* ================================================================== */
let loadedAssets = 0;
const TOTAL_ASSETS = 4;

function updateLoadProgress(label: string): void {
  loadedAssets++;
  const pct = Math.round((loadedAssets / TOTAL_ASSETS) * 100);
  if (loadBarEl)   loadBarEl.style.width = `${pct}%`;
  if (loadLabelEl) loadLabelEl.textContent = label;
}

function hideLoading(): void {
  if (loadingEl) loadingEl.style.display = 'none';
}

/* ================================================================== */
/*  Boot                                                               */
/* ================================================================== */
init();
animate();

async function init(): Promise<void> {
  /* ---- Scene: deep-space ---------------------------------------- */
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020b1a);
  scene.fog = new THREE.FogExp2(0x050e22, 0.004);

  /* ---- Camera --------------------------------------------------- */
  camera = new THREE.PerspectiveCamera(
    getResponsiveFOV(), innerWidth / innerHeight, 0.1, 300,
  );

  /* ---- Renderer ------------------------------------------------- */
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  /* ---- Lights --------------------------------------------------- */
  scene.add(new THREE.AmbientLight(0x334466, 0.6));

  const sun = new THREE.DirectionalLight(0x88bbff, 1.4);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const backLight = new THREE.PointLight(0xff4400, 0.8, 60);
  backLight.position.set(0, 2, 15);
  scene.add(backLight);

  const rimLight = new THREE.DirectionalLight(0x6644aa, 0.5);
  rimLight.position.set(-20, 10, -40);
  scene.add(rimLight);

  /* ---- Starfield ------------------------------------------------ */
  stars = createStarfield(3000);
  scene.add(stars);

  /* ---- Metallic spaceship floor --------------------------------- */
  const floorGeo = new THREE.PlaneGeometry(60, 1000, 30, 200);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e, metalness: 0.85, roughness: 0.35,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -3, -400);
  scene.add(floor);

  /* ---- Space-corridor panels ------------------------------------ */
  createSpaceCorridor();

  /* ---- Nebula clouds -------------------------------------------- */
  for (let i = 0; i < 18; i++) {
    const cloud = createNebulaCloud();
    cloud.position.set(
      THREE.MathUtils.randFloat(-35, 35),
      THREE.MathUtils.randFloat(6, 25),
      THREE.MathUtils.randFloat(-300, -30),
    );
    scene.add(cloud);
  }

  /* ---- Load models with progress -------------------------------- */
  const [balloonRaw, archRaw, ringRaw, treeRaw] = await Promise.all([
    loadGLB('/assets/ballon.glb', createBalloonFallback).then(m => { updateLoadProgress('Balloon loaded'); return m; }),
    loadGLB('/assets/Aero_Arch.glb', createArchFallback).then(m => { updateLoadProgress('Arch loaded'); return m; }),
    loadGLB('/assets/Aero_Ring.glb', createRingFallback).then(m => { updateLoadProgress('Ring loaded'); return m; }),
    loadGLB('/assets/Tree_01_Art.glb', createTreeFallback).then(m => { updateLoadProgress('Ready!'); return m; }),
  ]);

  /* ---- Normalize models ----------------------------------------- */
  player = normalizeModel(balloonRaw, PLAYER_WORLD_SIZE);
  player.position.copy(PLAYER_START);
  scene.add(player);

  const archTemplate = normalizeModel(archRaw, ARCH_WORLD_SIZE);
  const ringTemplate = normalizeModel(ringRaw, RING_WORLD_SIZE);
  const treeTemplate = normalizeModel(treeRaw, TREE_WORLD_SIZE);

  obstacleManager = new ObstacleManager(scene, archTemplate, ringTemplate, treeTemplate, {
    speed: BASE_SPEED,
    spawnDistance: SPAWN_DISTANCE,
    despawnDistance: DESPAWN_DISTANCE,
    spawnInterval: SPAWN_INTERVAL,
  });

  /* ---- Persisted best ------------------------------------------- */
  best = Number(localStorage.getItem(BEST_KEY) ?? 0);
  updateHud();

  /* ---- Input ---------------------------------------------------- */
  addEventListener('keydown', (e: KeyboardEvent) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!isRunning && !isGameOver) startGame();
      else if (isGameOver) restartGame();
    }
  });
  addEventListener('keyup', (e: KeyboardEvent) => { keys[e.code] = false; });

  addEventListener('pointerdown', (e: PointerEvent) => {
    if (isGameOver) return; // let overlay buttons handle
    if (!isRunning) { startGame(); return; }
    pointerDown = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });
  addEventListener('pointermove', (e: PointerEvent) => {
    if (!pointerDown) return;
    const sens = Math.max(0.03, 0.06 * (600 / innerWidth));
    playerTarget.x += (e.clientX - lastPointerX) * sens;
    playerTarget.y -= (e.clientY - lastPointerY) * sens;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });
  addEventListener('pointerup', () => { pointerDown = false; });

  addEventListener('touchmove', (e: TouchEvent) => e.preventDefault(), { passive: false });
  addEventListener('resize', onResize);

  /* ---- Retry button --------------------------------------------- */
  goRetryEl?.addEventListener('click', restartGame);

  /* ---- Publish flow --------------------------------------------- */
  goPublishEl?.addEventListener('click', () => {
    if (publishOverlay) {
      if (pubScoreEl) pubScoreEl.textContent = String(score);
      publishOverlay.style.display = 'flex';
    }
  });
  pubCloseEl?.addEventListener('click', closePublishModal);
  pubCancelEl?.addEventListener('click', closePublishModal);
  pubConfirmEl?.addEventListener('click', () => void publishScore());
  pubViewEl?.addEventListener('click', () => {
    if (lastPublishedUrl) window.open(lastPublishedUrl, '_blank');
  });
  pubDoneEl?.addEventListener('click', () => {
    if (publishSuccessEl) publishSuccessEl.style.display = 'none';
  });

  /* ---- Comment flow --------------------------------------------- */
  goCommentEl?.addEventListener('click', () => void commentScore());
  cmtDoneEl?.addEventListener('click', () => {
    if (commentSuccessEl) commentSuccessEl.style.display = 'none';
  });

  /* ---- Hide loading, show game ---------------------------------- */
  setTimeout(hideLoading, 400);
  isReady = true;
}

/* ================================================================== */
/*  Responsive helpers                                                 */
/* ================================================================== */
function getResponsiveFOV(): number {
  const aspect = innerWidth / innerHeight;
  if (aspect < 0.6) return 80;
  if (aspect < 1)   return 72;
  return 65;
}

/* ================================================================== */
/*  Model normalizer                                                   */
/* ================================================================== */
function normalizeModel(model: THREE.Object3D, targetSize: number): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) model.scale.multiplyScalar(targetSize / maxDim);
  return model;
}

/* ================================================================== */
/*  Lifecycle                                                          */
/* ================================================================== */
function startGame(): void {
  score = 0;
  isGameOver = false;
  isRunning = true;
  player.position.copy(PLAYER_START);
  player.rotation.set(0, 0, 0);
  playerTarget.copy(PLAYER_START);
  obstacleManager.reset();
  clock.start();
  setMessage('');
  if (controlsEl) controlsEl.style.opacity = '0';
  if (gameOverEl) gameOverEl.style.display = 'none';
  updateHud();
}

function restartGame(): void {
  if (gameOverEl) gameOverEl.style.display = 'none';
  if (publishOverlay) publishOverlay.style.display = 'none';
  if (publishSuccessEl) publishSuccessEl.style.display = 'none';
  startGame();
}

async function gameOver(): Promise<void> {
  if (isGameOver) return;
  isRunning = false;
  isGameOver = true;

  const isNewBest = score > best;
  if (isNewBest) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  updateHud();
  showGameOverOverlay(isNewBest);
  await submitScore(score);
}

function showGameOverOverlay(isNewBest: boolean): void {
  if (!gameOverEl) return;
  if (goScoreEl)   goScoreEl.textContent = String(score);
  if (goBestEl)    goBestEl.textContent = String(best);
  if (goNewBestEl) goNewBestEl.style.display = isNewBest ? 'block' : 'none';
  gameOverEl.style.display = 'flex';
  setMessage('');
}

/* ================================================================== */
/*  Score submission                                                   */
/* ================================================================== */
async function submitScore(finalScore: number): Promise<void> {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: finalScore }),
    });
    if (res.ok) {
      const data: SubmitScoreResponse = await res.json();
      // Reconcile server best with local
      if (data.bestScore > best) {
        best = data.bestScore;
        localStorage.setItem(BEST_KEY, String(best));
        if (goBestEl) goBestEl.textContent = String(best);
        updateHud();
      }
    }
  } catch {
    // Offline — score saved locally only
  }
}

/* ================================================================== */
/*  Publish to subreddit                                               */
/* ================================================================== */
function closePublishModal(): void {
  if (publishOverlay) publishOverlay.style.display = 'none';
}

async function publishScore(): Promise<void> {
  if (pubConfirmEl) {
    pubConfirmEl.disabled = true;
    pubConfirmEl.textContent = 'Publishing...';
  }

  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });

    if (res.ok) {
      const data: PublishScoreResponse = await res.json();
      lastPublishedUrl = data.postUrl;

      // Close confirmation, show success
      closePublishModal();
      if (publishSuccessEl) publishSuccessEl.style.display = 'flex';
    } else {
      const err = await res.json().catch(() => ({ message: 'publish failed' }));
      showToast(err.message ?? 'Failed to publish. Try again.');
    }
  } catch {
    showToast('Unable to reach the server. Please try again.');
  } finally {
    if (pubConfirmEl) {
      pubConfirmEl.disabled = false;
      pubConfirmEl.innerHTML = '&#10004; Yes, Publish';
    }
  }
}

/* ================================================================== */
/*  Comment score under current post                                   */
/* ================================================================== */
async function commentScore(): Promise<void> {
  const btn = goCommentEl as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Posting...';
  }

  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });

    if (res.ok) {
      const _data: CommentScoreResponse = await res.json();
      if (commentSuccessEl) commentSuccessEl.style.display = 'flex';
    } else {
      const err = await res.json().catch(() => ({ message: 'comment failed' }));
      showToast(err.message ?? 'Failed to post comment. Try again.');
    }
  } catch {
    showToast('Unable to reach the server. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💬 Comment Score';
    }
  }
}

/* ================================================================== */
/*  Main loop                                                          */
/* ================================================================== */
function animate(): void {
  requestAnimationFrame(animate);

  if (isReady && isRunning) {
    const dt = Math.min(clock.getDelta(), 0.04);

    /* Keyboard ---------------------------------------------------- */
    if (keys['ArrowLeft']  || keys['KeyA']) playerTarget.x -= MOVE_SPEED * dt;
    if (keys['ArrowRight'] || keys['KeyD']) playerTarget.x += MOVE_SPEED * dt;
    if (keys['ArrowUp']    || keys['KeyW']) playerTarget.y += MOVE_SPEED * dt;
    if (keys['ArrowDown']  || keys['KeyS']) playerTarget.y -= MOVE_SPEED * dt;

    /* Clamp ------------------------------------------------------- */
    playerTarget.x = THREE.MathUtils.clamp(playerTarget.x, PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX);
    playerTarget.y = THREE.MathUtils.clamp(playerTarget.y, PLAYER_BOUNDS.minY, PLAYER_BOUNDS.maxY);

    /* Smooth follow ----------------------------------------------- */
    player.position.x += (playerTarget.x - player.position.x) * LERP_FACTOR * dt;
    player.position.y += (playerTarget.y - player.position.y) * LERP_FACTOR * dt;

    /* Cosmetic tilt ----------------------------------------------- */
    const dx = playerTarget.x - player.position.x;
    const dy = playerTarget.y - player.position.y;
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -dx * 0.35, 4 * dt);
    player.rotation.x = THREE.MathUtils.lerp(player.rotation.x,  dy * 0.25, 4 * dt);

    /* Hover bob --------------------------------------------------- */
    player.position.y += Math.sin(clock.elapsedTime * 2) * 0.003;

    /* Camera ------------------------------------------------------ */
    camera.position.set(
      player.position.x * 0.2,
      player.position.y + 2.5,
      player.position.z + 8,
    );
    camera.lookAt(player.position.x, player.position.y + 0.3, player.position.z - 50);

    /* Scrolling stars --------------------------------------------- */
    if (stars) stars.rotation.z += dt * 0.005;

    /* Obstacles --------------------------------------------------- */
    const speed = Math.min(BASE_SPEED + score * 0.2, MAX_SPEED);
    const diff  = Math.floor(score / 5);
    obstacleManager.setSpeed(speed);
    obstacleManager.setDifficulty(diff);

    obstacleManager.update(dt, player.position, {
      onArchPass: () => {
        score += 1;
        updateHud();
        flashScore();
      },
      onArchMiss: () => {
        void gameOver();
      },
    });

    /* Hazard collision -------------------------------------------- */
    playerBox.setFromObject(player);
    playerBox.expandByScalar(-0.08);
    if (obstacleManager.checkCollision(playerBox)) {
      void gameOver();
    }
  }

  renderer?.render(scene, camera);
}

/* ================================================================== */
/*  HUD                                                                */
/* ================================================================== */
function flashScore(): void {
  if (!scoreEl) return;
  scoreEl.classList.add('flash');
  setTimeout(() => scoreEl.classList.remove('flash'), 350);
}

function updateHud(): void {
  if (scoreEl) scoreEl.textContent = String(score);
  if (bestEl)  bestEl.textContent  = String(best);
}

function setMessage(text: string): void {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.display = text ? 'block' : 'none';
}

/** Show a temporary in-app toast (replaces alert which Devvit doesn't support) */
function showToast(msg: string, durationMs = 3500): void {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), durationMs);
}

function onResize(): void {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = getResponsiveFOV();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}

/* ================================================================== */
/*  Asset loader                                                       */
/* ================================================================== */
function loadGLB(path: string, fallback: () => THREE.Object3D): Promise<THREE.Object3D> {
  return new Promise(resolve => {
    loader.load(path, gltf => resolve(gltf.scene), undefined, () => resolve(fallback()));
  });
}

/* ================================================================== */
/*  Space environment builders                                         */
/* ================================================================== */

/** Particle starfield */
function createStarfield(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3]     = THREE.MathUtils.randFloat(-150, 150);
    positions[i3 + 1] = THREE.MathUtils.randFloat(-50, 80);
    positions[i3 + 2] = THREE.MathUtils.randFloat(-300, 50);
    // Slight colour variation: white, blue-white, yellow
    const t = Math.random();
    colors[i3]     = 0.8 + t * 0.2;
    colors[i3 + 1] = 0.8 + t * 0.15;
    colors[i3 + 2] = 0.9 + t * 0.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.25, vertexColors: true, transparent: true, opacity: 0.85,
  });
  return new THREE.Points(geo, mat);
}

/** Metallic side-panels giving a spaceship corridor feel */
function createSpaceCorridor() {
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0d1b2a, metalness: 0.9, roughness: 0.3,
  });
  const panelGeo = new THREE.PlaneGeometry(4, 600);

  // Left wall
  const leftWall = new THREE.Mesh(panelGeo, panelMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-15, 3, -250);
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(panelGeo, panelMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(15, 3, -250);
  scene.add(rightWall);

  // Ceiling – very faint
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1a, metalness: 0.7, roughness: 0.5, transparent: true, opacity: 0.4,
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 600), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 12, -250);
  scene.add(ceil);

  // Glow strips along corridor
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x2266cc, transparent: true, opacity: 0.4 });
  const stripGeo = new THREE.PlaneGeometry(0.15, 600);
  for (const xPos of [-14.5, 14.5]) {
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.rotation.y = xPos < 0 ? Math.PI / 2 : -Math.PI / 2;
    strip.position.set(xPos, 0, -250);
    scene.add(strip);
  }
}

/** Nebula-style volumetric cloud */
function createNebulaCloud(): THREE.Object3D {
  const g = new THREE.Group();
  const hue = THREE.MathUtils.randFloat(0.55, 0.75); // blue-purple
  const color = new THREE.Color().setHSL(hue, 0.5, 0.3);
  const m = new THREE.MeshStandardMaterial({
    color, transparent: true, opacity: 0.15, depthWrite: false,
  });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(THREE.MathUtils.randFloat(2, 5), 6, 6), m,
    );
    puff.position.set(
      THREE.MathUtils.randFloat(-3, 3),
      THREE.MathUtils.randFloat(-1, 1),
      THREE.MathUtils.randFloat(-2, 2),
    );
    g.add(puff);
  }
  return g;
}

/* ================================================================== */
/*  Fallback geometries                                                */
/* ================================================================== */
function createBalloonFallback(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffa26b }),
  ));
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x7b4a2c }),
  );
  basket.position.y = -0.45;
  g.add(basket);
  return g;
}

function createArchFallback(): THREE.Object3D {
  const g = new THREE.Group();
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.12, 8, 20, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.7, roughness: 0.3 }),
  );
  arch.position.y = 1.5;
  const pGeo = new THREE.CylinderGeometry(0.12, 0.12, 3, 8);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.7, roughness: 0.3 });
  const l = new THREE.Mesh(pGeo, pMat); l.position.set(-1.5, 0, 0);
  const r = new THREE.Mesh(pGeo, pMat); r.position.set(1.5, 0, 0);
  g.add(arch, l, r);
  return g;
}

function createRingFallback(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.08, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.5, roughness: 0.4 }),
  );
}

function createTreeFallback(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3a5c, metalness: 0.6, roughness: 0.4 }),
  ));
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a4444, metalness: 0.3, roughness: 0.5 }),
  );
  top.position.y = 1.3;
  g.add(top);
  return g;
}
