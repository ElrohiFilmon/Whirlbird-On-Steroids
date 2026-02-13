/**
 * Page Object Model – Game Page
 *
 * Encapsulates all game UI locators: HUD, loading screen,
 * game-over overlay, publish flow modals.
 */
import { type Locator, type Page, expect } from '@playwright/test';

export class GamePage {
  readonly page: Page;

  /* Loading screen */
  readonly loadingScreen: Locator;
  readonly progressBar: Locator;
  readonly loadLabel: Locator;

  /* HUD */
  readonly scoreDisplay: Locator;
  readonly bestDisplay: Locator;
  readonly messageDisplay: Locator;

  /* Game-over overlay */
  readonly gameOverOverlay: Locator;
  readonly goScore: Locator;
  readonly goBest: Locator;
  readonly goNewBest: Locator;
  readonly retryButton: Locator;
  readonly publishButton: Locator;

  /* Publish modal */
  readonly publishOverlay: Locator;
  readonly pubScore: Locator;
  readonly pubCancel: Locator;
  readonly pubConfirm: Locator;

  /* Publish success */
  readonly publishSuccess: Locator;
  readonly viewPostButton: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loadingScreen = page.locator('#game-loading');
    this.progressBar = page.locator('#load-bar-fill');
    this.loadLabel = page.locator('#load-label');

    this.scoreDisplay = page.locator('#score');
    this.bestDisplay = page.locator('#best');
    this.messageDisplay = page.locator('#message');

    this.gameOverOverlay = page.locator('#game-over-overlay');
    this.goScore = page.locator('#go-score');
    this.goBest = page.locator('#go-best');
    this.goNewBest = page.locator('#go-new-best');
    this.retryButton = page.locator('#go-retry');
    this.publishButton = page.locator('#go-publish');

    this.publishOverlay = page.locator('#publish-overlay');
    this.pubScore = page.locator('#pub-score');
    this.pubCancel = page.locator('#pub-cancel');
    this.pubConfirm = page.locator('#pub-confirm');

    this.publishSuccess = page.locator('#publish-success');
    this.viewPostButton = page.locator('#pub-view');
    this.doneButton = page.locator('#pub-done');
  }

  async goto(): Promise<void> {
    await this.page.goto('/game.html');
  }

  async waitForGameLoaded(): Promise<void> {
    // Wait for the loading screen to disappear (models loaded)
    await expect(this.loadingScreen).toBeHidden({ timeout: 30_000 });
  }

  async waitForGameOver(): Promise<void> {
    await expect(this.gameOverOverlay).toBeVisible({ timeout: 60_000 });
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async clickPublish(): Promise<void> {
    await this.publishButton.click();
  }

  async confirmPublish(): Promise<void> {
    await expect(this.publishOverlay).toBeVisible();
    await this.pubConfirm.click();
  }

  async cancelPublish(): Promise<void> {
    await expect(this.publishOverlay).toBeVisible();
    await this.pubCancel.click();
  }
}
