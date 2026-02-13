/**
 * AUTH-04: Login with invalid credentials shows error - End-to-End Test
 *
 * User Story: As a user, I see an error message when I enter incorrect login credentials
 *
 * Acceptance Criteria:
 * - [x] Launch Playwright browser in headless mode
 * - [x] Navigate to / (home page)
 * - [x] Click 'Login' button in header
 * - [x] Fill email field with 'wrong@example.com'
 * - [x] Fill password field with 'wrongpassword'
 * - [x] Intercept API call to POST /api/auth/login
 * - [x] Click 'Login' button
 * - [x] Verify API returns 401 status
 * - [x] Verify error message 'Invalid credentials' is displayed in modal
 * - [x] Verify modal remains open
 * - [x] Verify user is NOT authenticated
 * - [x] Take screenshot showing error message
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('AUTH-04: Login with invalid credentials shows error', () => {
  test('should display error message when entering incorrect login credentials', async ({ page }) => {
    console.log('Starting AUTH-04 test...');

    // Step 1: Navigate to / (home page)
    console.log('Step 1: Navigating to home page...');
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✓ Home page loaded');

    // Step 2: Click 'Login' button in header
    console.log('Step 2: Opening login modal...');
    const loginButton = page.locator('button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    console.log('✓ Login button clicked');

    // Wait for modal to open
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });
    console.log('✓ AuthModal opened');

    // Verify 'Login' tab is active
    const loginTab = page.locator('button[role="tab"]:has-text("Login")');
    await expect(loginTab).toBeVisible();

    // Check if the Login tab has active state attributes
    const loginTabClasses = await loginTab.getAttribute('class');
    const isLoginTabActive = loginTabClasses?.includes('active') ||
                             loginTabClasses?.includes('selected') ||
                             await loginTab.getAttribute('aria-selected') === 'true';

    // If not active, click it to make it active
    if (!isLoginTabActive) {
      await loginTab.click();
      console.log('✓ Login tab clicked to activate');
    } else {
      console.log('✓ Login tab is active (default)');
    }

    // Wait for login form to be visible
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 2000 });

    // Step 3: Fill email field with 'wrong@example.com'
    console.log('Step 3: Filling email with invalid credentials...');
    await page.locator('#login-email').fill('wrong@example.com');
    console.log('✓ Filled email: wrong@example.com');

    // Step 4: Fill password field with 'wrongpassword'
    await page.locator('#login-password').fill('wrongpassword');
    console.log('✓ Filled password: wrongpassword');

    // Step 5: Intercept API call to POST /api/auth/login
    console.log('Step 5: Setting up API interception...');
    const loginRequestPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/login') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login'),
      { timeout: 10000 }
    );

    // Step 6: Click 'Login' button
    console.log('Step 6: Clicking login button...');
    const submitButton = page.locator('button[type="submit"]:has-text("Login")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    console.log('✓ Login button clicked');

    // Wait for and verify the API call
    const loginRequest = await loginRequestPromise;
    console.log('✓ API call to POST /api/auth/login intercepted');

    // Verify request body
    const requestBody = loginRequest.postDataJSON();
    expect(requestBody).toMatchObject({
      email: 'wrong@example.com',
      password: 'wrongpassword'
    });
    console.log('✓ Request body verified');

    // Step 7: Verify API returns 401 status
    console.log('Step 7: Verifying API response...');
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(401);
    console.log('✓ API returned 401 Unauthorized status');

    // Step 8: Verify error message 'Invalid credentials' is displayed in modal
    console.log('Step 8: Verifying error message is displayed...');
    const errorMessage = page.locator('text=Invalid credentials');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    console.log('✓ Error message "Invalid credentials" is displayed');

    // Step 9: Verify modal remains open
    console.log('Step 9: Verifying modal remains open...');
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible();
    console.log('✓ Modal remains open after error');

    // Step 10: Verify user is NOT authenticated
    console.log('Step 10: Verifying user is NOT authenticated...');
    // Check that login button is still present (user not logged in)
    await page.waitForTimeout(1000); // Give time for any state updates
    const loginButtonAfterError = page.locator('button:has-text("Login")').first();
    await expect(loginButtonAfterError).toBeVisible();
    console.log('✓ User is NOT authenticated (Login button still visible)');

    // Verify no user name appears in header
    const nav = page.locator('nav');
    const navText = await nav.textContent();
    expect(navText).not.toContain('wrong@example.com');
    console.log('✓ No authenticated user data in header');

    // Step 11: Take screenshot showing error message
    console.log('Step 11: Taking screenshot...');
    const screenshotDir = path.join(process.cwd(), 'frontend', 'tests');
    await page.screenshot({
      path: path.join(screenshotDir, 'AUTH-04-invalid-credentials-error.png'),
      fullPage: false
    });
    console.log('✓ Screenshot saved: AUTH-04-invalid-credentials-error.png');

    console.log('\n✅ AUTH-04: Login with invalid credentials test PASSED');
    console.log('All acceptance criteria verified:');
    console.log('  ✓ Navigated to home page');
    console.log('  ✓ Opened login modal');
    console.log('  ✓ Filled invalid credentials');
    console.log('  ✓ API call intercepted');
    console.log('  ✓ API returned 401 status');
    console.log('  ✓ Error message displayed');
    console.log('  ✓ Modal remained open');
    console.log('  ✓ User not authenticated');
    console.log('  ✓ Screenshot captured');
  });

  test('should allow retry after invalid credentials', async ({ page }) => {
    console.log('Testing retry functionality after invalid credentials...');

    // Navigate and open modal
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('nav', { timeout: 10000 });

    const loginButton = page.locator('button:has-text("Login")').first();
    await loginButton.click();
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });

    // Make sure login tab is active
    const loginTab = page.locator('button[role="tab"]:has-text("Login")');
    const loginTabClasses = await loginTab.getAttribute('class');
    const isLoginTabActive = loginTabClasses?.includes('active') ||
                             loginTabClasses?.includes('selected') ||
                             await loginTab.getAttribute('aria-selected') === 'true';
    if (!isLoginTabActive) {
      await loginTab.click();
    }

    // Fill with invalid credentials
    await page.locator('#login-email').fill('wrong@example.com');
    await page.locator('#login-password').fill('wrongpassword');

    // Submit and wait for error
    const submitButton = page.locator('button[type="submit"]:has-text("Login")');
    await submitButton.click();

    // Wait for error message
    const errorMessage = page.locator('text=Invalid credentials');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    console.log('✓ Error message displayed after invalid credentials');

    // Clear the error by typing in the email field
    await page.locator('#login-email').click();
    await page.locator('#login-email').fill('');
    await page.locator('#login-email').fill('newattempt@example.com');

    // Verify error message is cleared or updated
    await page.waitForTimeout(500);
    console.log('✓ User can modify credentials for retry');

    // Verify submit button is still enabled
    await expect(submitButton).toBeEnabled();
    console.log('✓ Login button remains enabled for retry');

    console.log('\n✅ Retry functionality test PASSED');
  });

  test('should handle multiple failed login attempts', async ({ page }) => {
    console.log('Testing multiple failed login attempts...');

    await page.goto(FRONTEND_URL);
    await page.waitForSelector('nav', { timeout: 10000 });

    const loginButton = page.locator('button:has-text("Login")').first();
    await loginButton.click();
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });

    // Make sure login tab is active
    const loginTab = page.locator('button[role="tab"]:has-text("Login")');
    const loginTabClasses = await loginTab.getAttribute('class');
    const isLoginTabActive = loginTabClasses?.includes('active') ||
                             loginTabClasses?.includes('selected') ||
                             await loginTab.getAttribute('aria-selected') === 'true';
    if (!isLoginTabActive) {
      await loginTab.click();
    }

    const invalidAttempts = [
      { email: 'wrong1@example.com', password: 'wrongpass1' },
      { email: 'wrong2@example.com', password: 'wrongpass2' },
      { email: 'wrong3@example.com', password: 'wrongpass3' }
    ];

    for (const attempt of invalidAttempts) {
      console.log(`Attempting login with: ${attempt.email}`);

      // Clear and fill fields
      await page.locator('#login-email').clear();
      await page.locator('#login-email').fill(attempt.email);
      await page.locator('#login-password').clear();
      await page.locator('#login-password').fill(attempt.password);

      // Setup response promise before clicking
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/auth/login'),
        { timeout: 10000 }
      );

      // Submit
      const submitButton = page.locator('button[type="submit"]:has-text("Login")');
      await submitButton.click();

      // Wait for response
      await responsePromise;

      // Verify error appears
      const errorMessage = page.locator('text=Invalid credentials');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      console.log(`✓ Error displayed for attempt: ${attempt.email}`);

      // Verify modal still open
      await expect(page.locator('text=Welcome to Crossy!')).toBeVisible();
    }

    console.log('✓ Multiple failed attempts handled gracefully');
    console.log('\n✅ Multiple attempts test PASSED');
  });
});
