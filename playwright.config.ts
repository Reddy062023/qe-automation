// playwright.config.ts - central configuration for all Playwright tests
//
// This file controls:
//   - Which browsers to run tests on
//   - The base URL so tests don't need to repeat the full URL
//   - What to capture when a test fails (screenshot, video, trace)
//   - How many tests to run in parallel
//   - Which reporters to use (HTML, list, Allure)

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Folder where all test files live
  testDir: './tests',

  testIgnore: ['**/mobile/**', '**/android**'],

  // Run tests in parallel - faster execution
  fullyParallel: true,

  // Retry a failed test once before marking it as failed
  retries: 1,

  // Number of parallel workers (browser tabs running at the same time)
  workers: 4,

  // REPORTERS - multiple reporters can run at the same time
  // html          - Playwright's built-in visual report (playwright-report folder)
  // list          - shows test results line by line in terminal
  // allure-playwright - generates raw data in allure-results folder
  //                     then we run 'allure generate' to create the visual report
  reporter: [
    ['html'],
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],

  // These settings apply to ALL tests unless overridden
  use: {
    // baseURL means goto('/') becomes goto('https://www.saucedemo.com/')
    baseURL: 'https://www.saucedemo.com',

    // Only take screenshot when a test fails
    screenshot: 'only-on-failure',

    // Only record video when a test fails
    video: 'retain-on-failure',

    // Record a trace on the first retry - helps debug failures
    trace: 'on-first-retry',
  },

  // Run tests on these browsers
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],
});