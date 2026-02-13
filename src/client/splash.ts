import { context, requestExpandedMode } from '@devvit/web/client';
import type { InitResponse, LeaderboardEntry, PublishScoreResponse } from '../shared/api';

/* ================================================================== */
/*  DOM references                                                     */
/* ================================================================== */
const startButton   = document.getElementById('start-button') as HTMLButtonElement;
const greetingEl    = document.getElementById('greeting') as HTMLParagraphElement;
const bestScoreEl   = document.getElementById('best-score') as HTMLSpanElement;
const lbListEl      = document.getElementById('lb-list') as HTMLDivElement;
const loadingEl     = document.getElementById('loading-overlay') as HTMLDivElement;
const mainContentEl = document.getElementById('main-content') as HTMLDivElement;

/* Post-to-community elements */
const postButton       = document.getElementById('post-button') as HTMLButtonElement;
const publishOverlay   = document.getElementById('publish-overlay') as HTMLDivElement;
const pubScoreEl       = document.getElementById('pub-score') as HTMLSpanElement;
const pubCloseEl       = document.getElementById('pub-close') as HTMLButtonElement;
const pubCancelEl      = document.getElementById('pub-cancel') as HTMLButtonElement;
const pubConfirmEl     = document.getElementById('pub-confirm') as HTMLButtonElement;
const publishSuccessEl = document.getElementById('publish-success') as HTMLDivElement;
const pubViewEl        = document.getElementById('pub-view') as HTMLButtonElement;
const pubDoneEl        = document.getElementById('pub-done') as HTMLButtonElement;
const toastEl          = document.getElementById('toast') as HTMLDivElement;

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const BEST_KEY = 'wirlonsteroid.best';

let currentBest = 0;
let lastPublishedUrl = '';

/* ================================================================== */
/*  Event listeners                                                    */
/* ================================================================== */
startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

/* ---- Post-to-community flow ------------------------------------ */
postButton.addEventListener('click', () => {
  if (currentBest <= 0) return;
  pubScoreEl.textContent = String(currentBest);
  publishOverlay.style.display = 'flex';
});

pubCloseEl.addEventListener('click', closePublishModal);
pubCancelEl.addEventListener('click', closePublishModal);
pubConfirmEl.addEventListener('click', () => void publishScore());
pubViewEl.addEventListener('click', () => {
  if (lastPublishedUrl) window.open(lastPublishedUrl, '_blank');
});
pubDoneEl.addEventListener('click', () => {
  publishSuccessEl.style.display = 'none';
});

function closePublishModal(): void {
  publishOverlay.style.display = 'none';
}

async function publishScore(): Promise<void> {
  pubConfirmEl.disabled = true;
  pubConfirmEl.textContent = 'Publishing...';

  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: currentBest }),
    });

    if (res.ok) {
      const data: PublishScoreResponse = await res.json();
      lastPublishedUrl = data.postUrl;
      closePublishModal();
      publishSuccessEl.style.display = 'flex';
    } else {
      const err = await res.json().catch(() => ({ message: 'publish failed' }));
      showToast(err.message ?? 'Failed to publish. Try again.');
    }
  } catch {
    showToast('Unable to reach the server. Please try again.');
  } finally {
    pubConfirmEl.disabled = false;
    pubConfirmEl.innerHTML = '&#10004; Yes, Publish';
  }
}

function showToast(msg: string, durationMs = 3500): void {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), durationMs);
}

/* ================================================================== */
/*  Data fetching                                                      */
/* ================================================================== */
async function init(): Promise<void> {
  const localBest = Number(localStorage.getItem(BEST_KEY) ?? 0);
  currentBest = localBest;
  const name = context.username ?? 'Pilot';

  // Optimistic fast render
  greetingEl.textContent = `Welcome, ${name}!`;
  bestScoreEl.textContent = String(localBest);
  if (localBest > 0) postButton.style.display = 'block';

  try {
    const res = await fetch('/api/init');
    if (res.ok) {
      const data: InitResponse = await res.json();
      currentBest = Math.max(data.bestScore, localBest);
      bestScoreEl.textContent = String(currentBest);
      greetingEl.textContent = `Welcome, ${data.username}!`;
      renderLeaderboard(data.leaderboard as LeaderboardEntry[]);
      if (currentBest > 0) postButton.style.display = 'block';
    }
  } catch {
    // Offline / error — show local data only, leaderboard stays empty
  }

  // Hide loading, show content
  loadingEl.style.display = 'none';
  mainContentEl.style.display = 'flex';
}

/* ================================================================== */
/*  Leaderboard renderer                                               */
/* ================================================================== */
function renderLeaderboard(entries: readonly LeaderboardEntry[]): void {
  if (entries.length === 0) return; // keep the "no scores yet" message

  lbListEl.innerHTML = '';

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'lb-row';

    const medal = document.createElement('span');
    medal.className = 'lb-medal';
    medal.textContent = MEDALS[entry.rank - 1] ?? `#${entry.rank}`;

    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = entry.username;

    const score = document.createElement('span');
    score.className = 'lb-score';
    score.textContent = String(entry.score);

    row.append(medal, name, score);
    lbListEl.appendChild(row);
  }
}

/* ================================================================== */
/*  Boot                                                               */
/* ================================================================== */
init();
