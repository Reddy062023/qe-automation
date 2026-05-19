// This file contains tests for the Login page of saucedemo.com
// We import 'test' and 'expect' from Playwright — these are the core building blocks
// 'test' defines a test case, 'expect' is used to assert/verify something is true
import { test, expect } from '@playwright/test';

// We import the LoginPage class we created in pages/LoginPage.ts
// This is the Page Object Model (POM) pattern — selectors live in LoginPage.ts,
// tests stay clean and readable here
import { LoginPage } from '../pages/LoginPage';

// test.describe groups related tests together under one label
// Think of it like a folder for tests about the same feature
test.describe('Login — saucedemo.com', () => {

  // TEST 1: Happy path — correct username and password should go to inventory page
  test('valid credentials → lands on inventory page', async ({ page }) => {
    // Create an instance of LoginPage, passing the browser 'page' object
    const loginPage = new LoginPage(page);

    // navigate() calls page.goto('/') which goes to https://www.saucedemo.com/
    await loginPage.navigate();

    // login() fills in username + password fields and clicks the login button
    await loginPage.login('standard_user', 'secret_sauce');

    // Assert the URL now contains 'inventory' — means login succeeded
    await expect(page).toHaveURL(/inventory/);

    // Also assert the product list is visible on screen
    await expect(page.locator('.inventory_list')).toBeVisible();
  });

  // TEST 2: Wrong credentials — should show an error message
  test('invalid credentials → shows error banner', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Try logging in with wrong details
    await loginPage.login('wrong_user', 'wrong_pass');

    // The error message element should appear on screen
    await expect(loginPage.errorMessage).toBeVisible();

    // And it should contain this specific text
    await expect(loginPage.errorMessage).toContainText('Username and password do not match');
  });

  // TEST 3: Empty username — form validation should catch this
  test('empty username → shows required error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Pass empty string for username — password is valid
    await loginPage.login('', 'secret_sauce');

    // Expect the error to say username is required
    await expect(loginPage.errorMessage).toContainText('Username is required');
  });

  // TEST 4: Locked out user — saucedemo has a special user that is blocked
  test('locked out user → shows locked error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // 'locked_out_user' is a test account on saucedemo that is intentionally blocked
    await loginPage.login('locked_out_user', 'secret_sauce');

    // The error should mention the account is locked
    await expect(loginPage.errorMessage).toContainText('locked out');
  });

});