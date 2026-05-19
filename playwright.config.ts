// playwright.config.ts — central configuration for all Playwright tests
//
// This file controls:
//   - Which browsers to run tests on
//   - The base URL so tests don't need to repeat the full URL
//   - What to capture when a test fails (screenshot, video, trace)
//   - How many tests to run in parallel

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Folder where all test files live
  testDir: './tests',

  // Run tests in parallel — faster execution
  fullyParallel: true,

  // Retry a failed test once before marking it as failed
  retries: 1,

  // Number of parallel workers (browser tabs running at the same time)
  workers: 4,

  // Output formats: 'html' creates a visual report, 'list' shows results in terminal
  reporter: [['html'], ['list']],

  // These settings apply to ALL tests unless overridden
  use: {
    // baseURL means goto('/') becomes goto('https://www.saucedemo.com/')
    baseURL: 'https://www.saucedemo.com',

    // Only take screenshot when a test fails
    screenshot: 'only-on-failure',

    // Only record video when a test fails
    video: 'retain-on-failure',

    // Record a trace on the first retry — helps debug failures
    trace: 'on-first-retry',
  },

  // Run tests on these browsers
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],
});