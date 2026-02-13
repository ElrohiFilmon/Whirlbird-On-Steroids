/* ================================================================== */
/*  Shared API types – Whirlbird on Steroids                          */
/* ================================================================== */

/** Returned on first load to bootstrap the client */
export interface InitResponse {
  readonly type: 'init';
  readonly postId: string;
  readonly username: string;
  readonly bestScore: number;
  readonly leaderboard: readonly LeaderboardEntry[];
}

/** A single leaderboard row */
export interface LeaderboardEntry {
  readonly rank: number;
  readonly username: string;
  readonly score: number;
}

/** Client → server when a game ends */
export interface SubmitScoreRequest {
  readonly score: number;
}

/** Server → client after score submission */
export interface SubmitScoreResponse {
  readonly type: 'score';
  readonly postId: string;
  readonly newBest: boolean;
  readonly bestScore: number;
  readonly leaderboard: readonly LeaderboardEntry[];
}

/** GET /api/leaderboard response */
export interface LeaderboardResponse {
  readonly type: 'leaderboard';
  readonly postId: string;
  readonly leaderboard: readonly LeaderboardEntry[];
}

/** Client → server to publish score as a subreddit post */
export interface PublishScoreRequest {
  readonly score: number;
}

/** Server → client after publishing */
export interface PublishScoreResponse {
  readonly type: 'publish';
  readonly postId: string;
  readonly postUrl: string;
}

/** Client → server to post a comment under the current game post */
export interface CommentScoreRequest {
  readonly score: number;
}

/** Server → client after commenting */
export interface CommentScoreResponse {
  readonly type: 'comment';
  readonly commentId: string;
}

/** Shared error envelope */
export interface ErrorResponse {
  readonly status: 'error';
  readonly message: string;
}
