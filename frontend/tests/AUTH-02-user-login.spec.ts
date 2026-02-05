import { test, expect } from '@playwright/test';

test.describe('AUTH-02: User login with credentials', () => {
  test('should successfully log in an existing user and display user name in header', async ({ page }) => {
    // Generate unique credentials for this test
    const timestamp = Date.now();
    const testEmail = `logintest${timestamp}@example.com`;
    const testUsername = 'LoginTestUser';
    const testPassword = 'SecurePass123!';

    // SETUP: First, register a user to ensure we have valid credentials
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Open auth modal and register
    const initialLoginButton = page.locator('button:has-text("Login")').first();
    await initialLoginButton.click();
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });

    // Click Register tab
    const registerTab = page.locator('button[role="tab"]:has-text("Register")');
    await registerTab.click();

    // Fill registration form
    await page.locator('#register-username').fill(testUsername);
    await page.locator('#register-email').fill(testEmail);
    await page.locator('#register-password').fill(testPassword);

    // Submit registration
    const registerButton = page.locator('button[type="submit"]:has-text("Register")');
    await registerButton.click();

    // Wait for registration to complete and modal to close
    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Setup: User registered successfully');

    // Logout by clearing localStorage
    await page.evaluate(() => localStorage.clear());
    console.log('✓ Setup: Logged out (cleared localStorage)');

    // Reload page to ensure clean state
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✓ Home page loaded');

    // Click 'Login' button in header to open AuthModal
    const loginButton = page.locator('button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    console.log('✓ Login button clicked');

    // Wait for modal to open
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });
    console.log('✓ AuthModal opened');

    // Verify 'Login' tab is active (default)
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

    // Fill email field with 'testuser@example.com'
    await page.locator('#login-email').fill(testEmail);
    console.log(`✓ Filled email: ${testEmail}`);

    // Fill password field with 'SecurePass123!'
    await page.locator('#login-password').fill(testPassword);
    console.log(`✓ Filled password: ${testPassword}`);

    // Intercept API call to POST /api/auth/login
    const loginRequestPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/login') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login') && response.status() === 200,
      { timeout: 10000 }
    );

    // Click 'Login' button
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
      email: testEmail,
      password: testPassword
    });
    console.log('✓ Request body verified');

    // Wait for and verify the response
    const loginResponse = await loginResponsePromise;
    const responseBody = await loginResponse.json();

    // Verify API returns 200 status with user and JWT token
    expect(loginResponse.status()).toBe(200);
    expect(responseBody).toHaveProperty('token');
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toHaveProperty('displayName');
    console.log('✓ API returned 200 status with user object and JWT token');

    // Verify modal closes
    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Modal closed automatically');

    // Verify user name appears in header
    const userName = responseBody.user.displayName;
    await expect(page.locator('nav').locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ User name "${userName}" appears in header`);

    // Take screenshot to confirm logged-in state
    await page.screenshot({
      path: 'tests/AUTH-02-login-success.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: AUTH-02-login-success.png');

    console.log('\n✅ AUTH-02: User login test PASSED - All acceptance criteria met');
  });
});
