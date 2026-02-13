/**
 * Page Object Model – Splash Page
 *
 * Principles:
 *   - Encapsulate selectors in a single place
 *   - Use role-based locators first
 *   - Expose action methods, not raw locators
 */
import { type Locator, type Page, expect } from '@playwright/test';

export class SplashPage {
  readonly page: Page;
  readonly loadingOverlay: Locator;
  readonly title: Locator;
  readonly playButton: Locator;
  readonly leaderboardCard: Locator;
  readonly leaderboardRows: Locator;
  readonly greetingText: Locator;
  readonly bestScoreText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingOverlay = page.locator('#loading-overlay');
    this.title = page.locator('.hero-title');
    this.playButton = page.getByRole('button', { name: /play/i });
    this.leaderboardCard = page.locator('.leaderboard-card');
    this.leaderboardRows = page.locator('.lb-row');
    this.greetingText = page.locator('#greeting');
    this.bestScoreText = page.locator('#best-score');
  }

  async goto(): Promise<void> {
    await this.page.goto('/splash.html');
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.loadingOverlay).toBeHidden({ timeout: 10_000 });
    await expect(this.playButton).toBeVisible();
  }

  async clickPlay(): Promise<void> {
    await this.playButton.click();
  }

  async getLeaderboardCount(): Promise<number> {
    return this.leaderboardRows.count();
  }
}
