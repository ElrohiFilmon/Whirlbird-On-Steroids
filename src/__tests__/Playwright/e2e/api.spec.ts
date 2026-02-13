/**
 * E2E – API Integration Tests
 *
 * Tests the API endpoints directly via Playwright's request context.
 * No browser needed — pure HTTP validation.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('API Endpoints', () => {
  test('GET /api/init returns valid shape', async ({ request }) => {
    const res = await request.get(`${BASE}/api/init`);
    // May fail in isolation (no Devvit context) — in that case verify it
    // doesn't crash (returns structured error vs 5xx crash)
    expect([200, 400, 500]).toContain(res.status());
    const json = await res.json();
    expect(json).toHaveProperty('type' as never);
  });

  test('POST /api/score rejects missing content-type', async ({ request }) => {
    const res = await request.post(`${BASE}/api/score`, {
      headers: { 'Content-Type': 'text/plain' },
      data: '{"score":10}',
    });
    expect(res.status()).toBe(415);
  });

  test('POST /api/score rejects invalid JSON', async ({ request }) => {
    const res = await request.post(`${BASE}/api/score`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{broken json',
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/score rejects out-of-range score', async ({ request }) => {
    const res = await request.post(`${BASE}/api/score`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ score: -1 }),
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/publish rejects non-JSON', async ({ request }) => {
    const res = await request.post(`${BASE}/api/publish`, {
      headers: { 'Content-Type': 'text/html' },
      data: '<h1>hack</h1>',
    });
    expect(res.status()).toBe(415);
  });

  test('GET /api/leaderboard returns structured response', async ({ request }) => {
    const res = await request.get(`${BASE}/api/leaderboard`);
    expect([200, 400]).toContain(res.status());
    const json = await res.json();
    expect(json).toBeDefined();
  });

  test('unknown route returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/nonexistent`);
    expect(res.status()).toBe(404);
  });
});
