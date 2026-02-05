import { test, expect } from '@playwright/test';

test.describe('AUTH-01: User registration with credentials', () => {
  test('should successfully register a new user and display user name in header', async ({ page }) => {
    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    const testUsername = 'TestUser';
    const testPassword = 'SecurePass123!';

    // Start by navigating to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✓ Home page loaded');

    // Find and click the Login button in header to open AuthModal
    const loginButton = page.locator('button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Wait for modal to open - verify title
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });
    console.log('✓ AuthModal opened');

    // Click 'Register' tab in the modal
    const registerTab = page.locator('button[role="tab"]:has-text("Register")');
    await expect(registerTab).toBeVisible();
    await registerTab.click();
    console.log('✓ Register tab clicked');

    // Wait for register form to be visible
    await expect(page.locator('#register-username')).toBeVisible({ timeout: 2000 });

    // Fill displayName field with 'TestUser'
    await page.locator('#register-username').fill(testUsername);
    console.log(`✓ Filled display name: ${testUsername}`);

    // Fill email field with unique email
    await page.locator('#register-email').fill(testEmail);
    console.log(`✓ Filled email: ${testEmail}`);

    // Fill password field with 'SecurePass123!'
    await page.locator('#register-password').fill(testPassword);
    console.log(`✓ Filled password: ${testPassword}`);

    // Set up API request interception to capture the register call
    const registerRequestPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/register') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const registerResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/register') && response.status() === 201,
      { timeout: 10000 }
    );

    // Click 'Register' button
    const registerButton = page.locator('button[type="submit"]:has-text("Register")');
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    console.log('✓ Register button clicked');

    // Wait for and verify the API call
    const registerRequest = await registerRequestPromise;
    console.log('✓ API call to POST /api/auth/register intercepted');

    // Verify request body
    const requestBody = registerRequest.postDataJSON();
    expect(requestBody).toMatchObject({
      displayName: testUsername,
      email: testEmail,
      password: testPassword
    });
    console.log('✓ Request body verified');

    // Wait for and verify the response
    const registerResponse = await registerResponsePromise;
    const responseBody = await registerResponse.json();

    // Verify API returns 201 status with user object and JWT token
    expect(registerResponse.status()).toBe(201);
    expect(responseBody).toHaveProperty('token');
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toHaveProperty('displayName', testUsername);
    console.log('✓ API returned 201 status with user object and JWT token');

    // Verify modal closes automatically
    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Modal closed automatically');

    // Verify user name 'TestUser' appears in header
    await expect(page.locator('nav').locator(`text=${testUsername}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ User name "${testUsername}" appears in header`);

    // Verify localStorage contains 'token' key
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    expect(token).toBe(responseBody.token);
    console.log('✓ localStorage contains auth_token');

    // Take screenshot to confirm registered state
    await page.screenshot({
      path: 'tests/AUTH-01-registration-success.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: AUTH-01-registration-success.png');

    console.log('\n✅ AUTH-01: User registration test PASSED - All acceptance criteria met');
  });
});
