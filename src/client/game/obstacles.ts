import * as THREE from 'three';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
export type ObstacleType = 'arch' | 'ring' | 'tree';

export interface ObstacleInstance {
  readonly mesh: THREE.Object3D;
  readonly type: ObstacleType;
  passed: boolean;
  readonly hitBox: THREE.Box3;
  readonly lane: number;
  /** For arches: the Y-range of the arch opening for pass-through check */
  archOpenMinY?: number;
  archOpenMaxY?: number;
}

export interface FPObstacleOptions {
  speed: number;
  readonly spawnDistance: number;
  readonly despawnDistance: number;
  readonly spawnInterval: number;
}

/**
 * Callback bag returned to game.ts so it can distinguish scoring
 * from arch-miss (game-over when flying over/around an arch).
 */
export interface ObstacleCallbacks {
  readonly onArchPass: () => void;
  readonly onArchMiss: () => void;
}

/* ================================================================== */
/*  Layout – single source of truth                                    */
/* ================================================================== */

/**
 * Play-field: x ∈ [-10, 10], y ∈ [-2, 10].
 * 5 lanes at x = -6, -3, 0, 3, 6  (3 units apart).
 *
 * Arches sit at y = -2 (ground level). The opening spans roughly
 * from the ground up to the arch crown (~3 world-units high).
 *
 * RULE 1: Every wave has exactly ONE arch – the player MUST fly
 *         through it. Flying over or around → game over.
 * RULE 2: Hazards (rings, trees) are placed in OTHER lanes or
 *         as approach-obstacles BEFORE the arch to create challenge.
 * RULE 3: At least 2 lanes are always free of hazards.
 */
const LANES = [-6, -3, 0, 3, 6] as const;
const ARCH_Y = -2;

/** Horizontal half-width of arch opening in world units */
const ARCH_HALF_W = 1.8;
/** Vertical range of arch opening (from ARCH_Y to ARCH_Y + height) */
const ARCH_OPEN_H = 3.2;

/* ================================================================== */
/*  Obstacle Manager                                                   */
/* ================================================================== */
export class ObstacleManager {
  private scene: THREE.Scene;
  private archTemplate: THREE.Object3D;
  private ringTemplate: THREE.Object3D;
  private treeTemplate: THREE.Object3D;

  private pool: Map<ObstacleType, THREE.Object3D[]> = new Map([
    ['arch', []], ['ring', []], ['tree', []],
  ]);

  private obstacles: ObstacleInstance[] = [];
  private spawnTimer = 0;
  private waveIndex = 0;
  private difficulty = 0;
  private options: FPObstacleOptions;

  constructor(
    scene: THREE.Scene,
    archTemplate: THREE.Object3D,
    ringTemplate: THREE.Object3D,
    treeTemplate: THREE.Object3D,
    options: FPObstacleOptions,
  ) {
    this.scene = scene;
    this.archTemplate = archTemplate;
    this.ringTemplate = ringTemplate;
    this.treeTemplate = treeTemplate;
    this.options = options;
  }

  /* ----- lifecycle ------------------------------------------------ */

  reset() {
    for (const obs of this.obstacles) this.returnToPool(obs);
    this.obstacles = [];
    this.spawnTimer = 0;
    this.waveIndex = 0;
    this.difficulty = 0;
  }

  setSpeed(s: number) { this.options.speed = s; }
  setDifficulty(d: number) { this.difficulty = d; }

  /* ----- per-frame ------------------------------------------------ */

  update(delta: number, playerPos: THREE.Vector3, cb: ObstacleCallbacks) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.options.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    for (const obs of this.obstacles) {
      obs.mesh.position.z += this.options.speed * delta;
      obs.hitBox.setFromObject(obs.mesh);

      // --- Pass detection (arch only) ---
      if (!obs.passed && obs.mesh.position.z >= playerPos.z) {
        obs.passed = true;

        if (obs.type === 'arch') {
          const dx = Math.abs(obs.mesh.position.x - playerPos.x);
          const withinX = dx < ARCH_HALF_W;
          const withinY =
            playerPos.y >= (obs.archOpenMinY ?? -999) &&
            playerPos.y <= (obs.archOpenMaxY ?? 999);

          if (withinX && withinY) {
            cb.onArchPass();
          } else {
            // Flew over, around, or into the pillars
            cb.onArchMiss();
          }
        }
      }
    }

    // Despawn
    this.obstacles = this.obstacles.filter(obs => {
      if (obs.mesh.position.z > this.options.despawnDistance) {
        this.returnToPool(obs);
        return false;
      }
      return true;
    });
  }

  /* ----- collision ------------------------------------------------ */

  checkCollision(playerBox: THREE.Box3): boolean {
    for (const obs of this.obstacles) {
      if (obs.type === 'arch') continue; // arch pass logic handled in update
      if (playerBox.intersectsBox(obs.hitBox)) return true;
    }
    return false;
  }

  /* ----- wave patterns -------------------------------------------- */

  private spawnWave() {
    const wave = this.waveIndex++;
    const occupied = new Set<number>();

    // Progressive difficulty unlocks more patterns
    const maxPattern = Math.min(2 + Math.floor(this.difficulty / 2), 8);
    const pattern = wave % maxPattern;

    // Every wave has exactly one arch – the player MUST fly through it
    let archLane: number;

    switch (pattern) {
      case 0: // Pure arch – tutorial feel
        archLane = LANES[2];
        this.spawn('arch', archLane, ARCH_Y, occupied);
        break;

      case 1: // Off-centre arch
        archLane = this.pick([LANES[1], LANES[3]]);
        this.spawn('arch', archLane, ARCH_Y, occupied);
        break;

      case 2: { // Arch + one tree on approach (offset z)
        archLane = this.pick([LANES[1], LANES[2], LANES[3]]);
        this.spawn('arch', archLane, ARCH_Y, occupied);
        const tl = this.pickClear(occupied);
        if (tl !== null) this.spawnWithZOffset('tree', tl, ARCH_Y, 8);
        break;
      }

      case 3: { // Arch centre, trees flanking
        archLane = LANES[2];
        this.spawn('arch', archLane, ARCH_Y, occupied);
        this.spawnWithZOffset('tree', LANES[0], ARCH_Y, 6);
        this.spawnWithZOffset('tree', LANES[4], ARCH_Y, 6);
        break;
      }

      case 4: { // Ring in approach lane, arch behind
        archLane = this.pick([LANES[1], LANES[2], LANES[3]]);
        this.spawn('arch', archLane, ARCH_Y, occupied);
        // Ring floats in front of a different lane
        const rl = this.pickClear(occupied);
        if (rl !== null) this.spawnWithZOffset('ring', rl, 1.5, 12);
        break;
      }

      case 5: { // Two trees approach + arch
        archLane = LANES[2];
        this.spawn('arch', archLane, ARCH_Y, occupied);
        this.spawnWithZOffset('tree', LANES[0], ARCH_Y, 10);
        this.spawnWithZOffset('tree', LANES[4], ARCH_Y, 10);
        const rl2 = this.pick([LANES[1], LANES[3]]);
        this.spawnWithZOffset('ring', rl2, 2, 15);
        break;
      }

      case 6: { // Hard: ring guards approach, tree on side
        archLane = this.pick([LANES[1], LANES[2], LANES[3]]);
        this.spawn('arch', archLane, ARCH_Y, occupied);
        // Ring directly in front of arch lane but higher — must duck under
        this.spawnWithZOffset('ring', archLane, 3.5, 14);
        const tl2 = this.pickClear(occupied);
        if (tl2 !== null) this.spawnWithZOffset('tree', tl2, ARCH_Y, 8);
        break;
      }

      case 7: { // Gauntlet: tree corridor + ring + arch at end
        archLane = LANES[2];
        this.spawn('arch', archLane, ARCH_Y, occupied);
        this.spawnWithZOffset('tree', LANES[0], ARCH_Y, 10);
        this.spawnWithZOffset('tree', LANES[4], ARCH_Y, 10);
        this.spawnWithZOffset('ring', this.pick([LANES[1], LANES[3]]), 2, 18);
        this.spawnWithZOffset('tree', this.pick([LANES[1], LANES[3]]), ARCH_Y, 22);
        break;
      }

      default:
        this.spawn('arch', LANES[2], ARCH_Y, occupied);
    }
  }

  /* ----- spawn helpers -------------------------------------------- */

  private spawn(type: ObstacleType, x: number, y: number, occupied: Set<number>) {
    const mesh = this.getFromPool(type);
    mesh.position.set(x, y, -this.options.spawnDistance);
    mesh.visible = true;
    this.scene.add(mesh);
    occupied.add(x);

    const inst: ObstacleInstance = {
      mesh, type, passed: false,
      hitBox: new THREE.Box3().setFromObject(mesh),
      lane: x,
    };

    // Store the opening region for arches
    if (type === 'arch') {
      inst.archOpenMinY = y;
      inst.archOpenMaxY = y + ARCH_OPEN_H;
    }

    this.obstacles.push(inst);
  }

  /** Spawn a hazard at a z-offset IN FRONT of the normal spawn line */
  private spawnWithZOffset(type: ObstacleType, x: number, y: number, zAhead: number) {
    const mesh = this.getFromPool(type);
    mesh.position.set(x, y, -(this.options.spawnDistance + zAhead));
    mesh.visible = true;
    this.scene.add(mesh);

    this.obstacles.push({
      mesh, type, passed: false,
      hitBox: new THREE.Box3().setFromObject(mesh),
      lane: x,
    });
  }

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
  }

  private pickClear(occupied: Set<number>): number | null {
    const free = LANES.filter(l => !occupied.has(l));
    return free.length === 0 ? null : this.pick(free);
  }

  /* ----- object pool ---------------------------------------------- */

  private getFromPool(type: ObstacleType): THREE.Object3D {
    const bucket = this.pool.get(type)!;
    if (bucket.length > 0) return bucket.pop()!;
    switch (type) {
      case 'arch': return this.archTemplate.clone(true);
      case 'ring': return this.ringTemplate.clone(true);
      case 'tree': return this.treeTemplate.clone(true);
    }
  }

  private returnToPool(obs: ObstacleInstance) {
    obs.mesh.visible = false;
    this.scene.remove(obs.mesh);
    this.pool.get(obs.type)!.push(obs.mesh);
  }
}
