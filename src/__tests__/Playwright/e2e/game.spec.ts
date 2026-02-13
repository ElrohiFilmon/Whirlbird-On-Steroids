/**
 * E2E – Game Page Tests
 *
 * Tests the game loading screen, HUD visibility, and game-over
 * overlay flow. Since actual gameplay requires WebGL + user input,
 * these tests verify the UI chrome around the Three.js canvas.
 */
import { test, expect } from '@playwright/test';
import { GamePage } from './pages/game.page';

test.describe('Game Page', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
  });

  test('shows loading screen initially', async () => {
    // The loading screen should be visible while GLB assets load
    await expect(game.loadingScreen).toBeVisible();
    await expect(game.loadLabel).toBeVisible();
  });

  test('loading screen disappears after models load', async () => {
    await game.waitForGameLoaded();
    await expect(game.loadingScreen).toBeHidden();
  });

  test('HUD elements are visible during gameplay', async () => {
    await game.waitForGameLoaded();
    await expect(game.scoreDisplay).toBeVisible();
    await expect(game.bestDisplay).toBeVisible();
  });

  test('game-over overlay is hidden during active play', async () => {
    await game.waitForGameLoaded();
    await expect(game.gameOverOverlay).toBeHidden();
  });

  test('publish overlay is hidden during active play', async () => {
    await game.waitForGameLoaded();
    await expect(game.publishOverlay).toBeHidden();
  });
});

test.describe('Game Over Flow', () => {
  test.skip(true, 'Requires simulating collision — run manually with WebGL');

  test('game-over overlay shows score and buttons', async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForGameOver();

    await expect(game.goScore).toBeVisible();
    await expect(game.retryButton).toBeVisible();
    await expect(game.publishButton).toBeVisible();
  });

  test('retry button restarts the game', async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForGameOver();
    await game.clickRetry();
    await expect(game.gameOverOverlay).toBeHidden();
  });

  test('publish button opens confirmation modal', async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForGameOver();
    await game.clickPublish();
    await expect(game.publishOverlay).toBeVisible();
    await expect(game.pubScore).toBeVisible();
  });

  test('cancel button closes publish modal', async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForGameOver();
    await game.clickPublish();
    await game.cancelPublish();
    await expect(game.publishOverlay).toBeHidden();
  });
});
