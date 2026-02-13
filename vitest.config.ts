import { defineConfig } from 'vitest/config';

/**
 * Standalone Vitest configuration.
 *
 * The main vite.config.ts uses the @devvit/start plugin which only
 * supports `vite build`. Running vitest through that config fails.
 * This config gives vitest a clean Vite environment without devvit.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environment: 'node',
  },
});
