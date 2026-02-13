import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  CommentScoreRequest,
  CommentScoreResponse,
  ErrorResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PublishScoreRequest,
  PublishScoreResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../../shared/api';

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const LEADERBOARD_KEY     = 'leaderboard';
const BEST_PREFIX         = 'best:';
const RATE_LIMIT_PREFIX   = 'rate:';
const LEADERBOARD_SIZE    = 3;
const MAX_SCORE           = 9999;
const RATE_WINDOW_MS      = 2_000;  // one score submission per 2 s
const PUBLISH_COOLDOWN_MS = 10_000; // one publish per 10 s
const MAX_BODY_LENGTH     = 256;    // max JSON body size in bytes

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

/** Fetch top-N from sorted set (descending) */
async function getLeaderboard(size: number = LEADERBOARD_SIZE): Promise<LeaderboardEntry[]> {
  const raw = await redis.zRange(LEADERBOARD_KEY, 0, size - 1, { by: 'rank', reverse: true });
  return raw.map((entry, i) => ({
    rank: i + 1,
    username: entry.member,
    score: entry.score,
  }));
}

/** Sanitise username – strip non-printable, limit length */
function sanitiseUsername(raw: string): string {
  return raw.replace(/[^\w\-]/g, '').slice(0, 30) || 'anonymous';
}

/** Simple per-user rate limiter via Redis */
async function isRateLimited(username: string): Promise<boolean> {
  const key = `${RATE_LIMIT_PREFIX}${username}`;
  const last = await redis.get(key);
  if (last && Date.now() - Number(last) < RATE_WINDOW_MS) return true;
  await redis.set(key, String(Date.now()));
  return false;
}

/* ================================================================== */
/*  Routes                                                             */
/* ================================================================== */
export const api = new Hono();

/* ---- Content-Type & body-size guard for POST/PUT/PATCH ---------- */
api.use('*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const ct = c.req.header('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Content-Type must be application/json' },
        415,
      );
    }
    // Guard against oversized payloads
    const cl = c.req.header('content-length');
    if (cl && Number(cl) > MAX_BODY_LENGTH) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'request body too large' },
        413,
      );
    }
  }
  await next();
});

/**
 * GET /api/init
 * Bootstrap: return username, personal best, and leaderboard.
 */
api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId missing' }, 400);
  }

  try {
    const [rawUsername, leaderboard] = await Promise.all([
      reddit.getCurrentUsername(),
      getLeaderboard(),
    ]);

    const username  = sanitiseUsername(rawUsername ?? 'anonymous');
    const bestRaw   = await redis.get(`${BEST_PREFIX}${username}`);
    const bestScore = bestRaw ? Number(bestRaw) : 0;

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username,
      bestScore,
      leaderboard,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'init failed';
    console.error(`API /init error (post ${postId}):`, msg);
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500);
  }
});

/**
 * POST /api/score
 * Submit a game score. Updates personal best and leaderboard.
 */
api.post('/score', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId missing' }, 400);
  }

  /* ---- Parse & validate body ------------------------------------ */
  let body: SubmitScoreRequest;
  try {
    body = await c.req.json<SubmitScoreRequest>();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'invalid JSON body' }, 400);
  }

  const score = body?.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return c.json<ErrorResponse>({ status: 'error', message: 'score must be an integer 0-9999' }, 400);
  }

  /* ---- Identify user -------------------------------------------- */
  let username: string;
  try {
    const raw = await reddit.getCurrentUsername();
    username = sanitiseUsername(raw ?? 'anonymous');
  } catch {
    username = 'anonymous';
  }

  /* ---- Rate limit ----------------------------------------------- */
  if (await isRateLimited(username)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'slow down – too many submissions' }, 429);
  }

  /* ---- Update personal best ------------------------------------- */
  const bestKey  = `${BEST_PREFIX}${username}`;
  const prevBest = Number(await redis.get(bestKey) ?? 0);
  const newBest  = score > prevBest;

  if (newBest) {
    await redis.set(bestKey, String(score));
  }

  /* ---- Update leaderboard sorted set ---------------------------- */
  // Only keep the user's highest score
  const currentLB = await redis.zScore(LEADERBOARD_KEY, username);
  if (currentLB === undefined || currentLB === null || score > currentLB) {
    await redis.zAdd(LEADERBOARD_KEY, { member: username, score });
  }

  const leaderboard = await getLeaderboard();

  return c.json<SubmitScoreResponse>({
    type: 'score',
    postId,
    newBest,
    bestScore: Math.max(score, prevBest),
    leaderboard,
  });
});

/**
 * GET /api/leaderboard
 * Quick refresh of top-3 scores.
 */
api.get('/leaderboard', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId missing' }, 400);
  }

  const leaderboard = await getLeaderboard();

  return c.json<LeaderboardResponse>({
    type: 'leaderboard',
    postId,
    leaderboard,
  });
});

/**
 * POST /api/publish
 * Publish the player's score as a new subreddit post.
 */
api.post('/publish', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId missing' }, 400);
  }

  /* ---- Parse & validate body ------------------------------------ */
  let body: PublishScoreRequest;
  try {
    body = await c.req.json<PublishScoreRequest>();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'invalid JSON body' }, 400);
  }

  const score = body?.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return c.json<ErrorResponse>({ status: 'error', message: 'score must be an integer 0-9999' }, 400);
  }

  /* ---- Identify user -------------------------------------------- */
  let username: string;
  try {
    const raw = await reddit.getCurrentUsername();
    username = sanitiseUsername(raw ?? 'anonymous');
  } catch {
    username = 'anonymous';
  }

  if (username === 'anonymous') {
    return c.json<ErrorResponse>({ status: 'error', message: 'login required to publish' }, 401);
  }

  /* ---- Rate limit (reuse mechanism) ----------------------------- */
  const publishRateKey = `${RATE_LIMIT_PREFIX}pub:${username}`;
  const lastPub = await redis.get(publishRateKey);
  if (lastPub && Date.now() - Number(lastPub) < PUBLISH_COOLDOWN_MS) {
    return c.json<ErrorResponse>({ status: 'error', message: 'please wait before publishing again' }, 429);
  }
  await redis.set(publishRateKey, String(Date.now()));

  /* ---- Create the Reddit post ----------------------------------- */
  try {
    const post = await reddit.submitCustomPost({
      title: `🎈 u/${username} scored ${score} in Whirlbird on Steroids!`,
    });

    return c.json<PublishScoreResponse>({
      type: 'publish',
      postId: post.id,
      postUrl: post.url,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed to publish post';
    console.error(`API /publish error (user ${username}):`, msg);
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500);
  }
});

/**
 * POST /api/comment
 * Post the player's score as a comment under the current game post.
 */
api.post('/comment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId missing' }, 400);
  }

  /* ---- Parse & validate body ------------------------------------ */
  let body: CommentScoreRequest;
  try {
    body = await c.req.json<CommentScoreRequest>();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'invalid JSON body' }, 400);
  }

  const score = body?.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return c.json<ErrorResponse>({ status: 'error', message: 'score must be an integer 0-9999' }, 400);
  }

  /* ---- Identify user -------------------------------------------- */
  let username: string;
  try {
    const raw = await reddit.getCurrentUsername();
    username = sanitiseUsername(raw ?? 'anonymous');
  } catch {
    username = 'anonymous';
  }

  if (username === 'anonymous') {
    return c.json<ErrorResponse>({ status: 'error', message: 'login required to comment' }, 401);
  }

  /* ---- Rate limit ----------------------------------------------- */
  const commentRateKey = `${RATE_LIMIT_PREFIX}cmt:${username}`;
  const lastCmt = await redis.get(commentRateKey);
  if (lastCmt && Date.now() - Number(lastCmt) < PUBLISH_COOLDOWN_MS) {
    return c.json<ErrorResponse>({ status: 'error', message: 'please wait before commenting again' }, 429);
  }
  await redis.set(commentRateKey, String(Date.now()));

  /* ---- Post comment under this game post ------------------------ */
  try {
    const comment = await reddit.submitComment({
      id: `t3_${postId}` as `t3_${string}`,
      text: `🎈 I just scored **${score}** in Whirlbird on Steroids! Can you beat my score?`,
    });

    return c.json<CommentScoreResponse>({
      type: 'comment',
      commentId: comment.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'failed to post comment';
    console.error(`API /comment error (user ${username}):`, msg);
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500);
  }
});
