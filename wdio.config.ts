// wdio.config.ts - WebdriverIO configuration for Appium mobile tests
//
// WHY A SEPARATE CONFIG FILE?
// Playwright handles web and API tests.
// Appium uses WebdriverIO as its test client.
// They are separate frameworks with separate configs.
// In a real project you run them separately:
//   npx playwright test              <- web and API tests
//   npx wdio run wdio.config.ts      <- mobile tests

import { Options } from '@wdio/cli';

export const config: Options.Testrunner = {
  // Where mobile test files are located
  specs: ['./tests/mobile/**/*.spec.ts'],

  // Keep at 1 for mobile - one emulator, one session at a time
  maxInstances: 1,

  // Appium server connection
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',

  // Capabilities - what device and app to use
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',    // Android automation engine
    'appium:deviceName': 'emulator-5554',        // device name from adb devices
    'appium:appPackage': 'com.android.settings', // Settings app package name
    'appium:appActivity': '.Settings',            // Activity to launch
    'appium:noReset': true,                       // keep app state between tests
  }],

  // Test framework
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000, // 60 seconds - mobile tests are slower than web
  },

  // Show results in terminal
  reporters: ['spec'],

  // TypeScript support
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: './tsconfig.json',
    },
  },
};