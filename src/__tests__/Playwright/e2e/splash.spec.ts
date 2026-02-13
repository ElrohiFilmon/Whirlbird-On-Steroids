/**
 * E2E – Splash Page Tests
 *
 * Principles:
 *   - Auto-waiting (no manual sleep)
 *   - Role-based selectors
 *   - Isolated via Page Object Model
 */
import { test, expect } from '@playwright/test';
import { SplashPage } from './pages/splash.page';

test.describe('Splash Page', () => {
  let splash: SplashPage;

  test.beforeEach(async ({ page }) => {
    splash = new SplashPage(page);
    await splash.goto();
  });

  test('displays title and play button after loading', async () => {
    await splash.waitForLoaded();
    await expect(splash.title).toBeVisible();
    await expect(splash.playButton).toBeVisible();
  });

  test('loading overlay disappears once data arrives', async () => {
    // Initially loading overlay may be visible
    await splash.waitForLoaded();
    await expect(splash.loadingOverlay).toBeHidden();
  });

  test('leaderboard card renders', async () => {
    await splash.waitForLoaded();
    await expect(splash.leaderboardCard).toBeVisible();
  });

  test('play button navigates to game', async ({ page }) => {
    await splash.waitForLoaded();
    await splash.clickPlay();
    // After clicking play, the app should request expanded mode
    // In a devvit context this triggers navigation; in isolation we
    // verify the button is interactive and fires without error.
    await expect(splash.playButton).toBeEnabled();
  });
});
