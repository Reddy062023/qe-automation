// android.spec.ts - Appium mobile automation test for Android
//
// WHAT IS APPIUM?
// Appium controls mobile apps the same way Playwright controls browsers.
// Instead of clicking buttons in a browser, we click buttons in a mobile app.
//
// WHY before() and after() instead of beforeAll() and afterAll()?
// Playwright uses Jest syntax: beforeAll, afterAll, test
// WebdriverIO uses Mocha syntax: before, after, it
// Same concept, different framework, different keywords.
//
// HOW THE CONNECTION WORKS:
// Your test -> WebdriverIO client -> Appium server (port 4723) -> adb -> Emulator
//
// WHAT ARE CAPABILITIES?
// Capabilities are a configuration object that tells Appium:
//   - Which platform (Android or iOS)
//   - Which device to use (emulator-5554)
//   - Which app to open (Settings)
//   - Which automation engine to use (UiAutomator2)
//   - Whether to force launch the app (forceAppLaunch: true)

import { remote } from 'webdriverio';

// Driver represents our connection to the Android device
let driver: WebdriverIO.Browser;

// Capabilities tell Appium which device and app to use
const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',    // Android automation engine
  'appium:deviceName': 'emulator-5554',        // device name from: adb devices
  'appium:appPackage': 'com.android.settings', // package name of Settings app
  'appium:appActivity': '.Settings',            // which screen to open
  'appium:noReset': true,                       // keep app state between tests
  'appium:forceAppLaunch': true,                // force Settings app to open every time
};

const wdioOptions = {
  hostname: '127.0.0.1', // Appium server on localhost
  port: 4723,             // port we started Appium on
  logLevel: 'error' as const,
  capabilities,
};

describe('Android Settings App', () => {

  // before() = Mocha equivalent of beforeAll()
  // Runs once before all tests - opens the app on the emulator
  before(async () => {
    driver = await remote(wdioOptions);
  });

  // after() = Mocha equivalent of afterAll()
  // Runs once after all tests - closes the Appium session
  after(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  });

  // TEST 1: Verify Settings app opened correctly
  // getCurrentPackage() returns the package name of the app currently on screen
  // If Settings launched correctly it returns 'com.android.settings'
  it('Settings app opens successfully', async () => {
    const currentPackage = await driver.getCurrentPackage();
    console.log('Current app package:', currentPackage);
    expect(currentPackage).toBe('com.android.settings');
  });

  // TEST 2: Verify Settings page title is visible on screen
  // UiSelector is Android's built-in element finder - like CSS selectors for mobile
  // textContains finds any element whose text includes "Settings"
  it('Settings page title is visible', async () => {
    const title = await driver.$('android=new UiSelector().textContains("Settings")');
    const isDisplayed = await title.isDisplayed();
    expect(isDisplayed).toBe(true);
  });

});