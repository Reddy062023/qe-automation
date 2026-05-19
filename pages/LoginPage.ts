// LoginPage.ts — Page Object Model for the Login page of saucedemo.com
//
// What is a Page Object Model (POM)?
// Instead of writing selectors (like '#username') directly inside every test,
// we put all selectors and actions for a page in ONE place — this file.
// Benefits:
//   - If the selector changes, you fix it here only — not in every test file
//   - Tests become easier to read — loginPage.login() is clearer than 3 lines of code
//   - Reusable across multiple test files

// Import Page and Locator types from Playwright
// Page     = represents the browser tab
// Locator  = represents an element on the page (like a button or input field)
import { Page, Locator } from '@playwright/test';

// We define LoginPage as a class — a blueprint for interacting with the login page
export class LoginPage {

  // Declare the properties this class will use
  // 'readonly' means these cannot be reassigned after the constructor sets them
  readonly page: Page;
  readonly usernameInput: Locator;   // the username text field
  readonly passwordInput: Locator;   // the password text field
  readonly loginButton: Locator;     // the Login button
  readonly errorMessage: Locator;    // the red error banner that appears on bad login

  // constructor() runs once when we do: new LoginPage(page)
  // It receives the Playwright 'page' object and sets up all the locators
  constructor(page: Page) {
    this.page = page;

    // Locators use CSS attribute selectors — [data-test="username"] means:
    // find an element that has  data-test="username"  as an HTML attribute
    // saucedemo.com uses data-test attributes which are stable — good for automation
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton   = page.locator('[data-test="login-button"]');
    this.errorMessage  = page.locator('[data-test="error"]');
  }

  // navigate() — goes to the login page
  // baseURL is set in playwright.config.ts as https://www.saucedemo.com
  // so goto('/') means go to https://www.saucedemo.com/
  async navigate() {
    await this.page.goto('/');
  }

  // login() — fills in the form and clicks Login
  // username and password are passed in as parameters from the test
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);   // types into username field
    await this.passwordInput.fill(password);   // types into password field
    await this.loginButton.click();            // clicks the Login button
  }
}