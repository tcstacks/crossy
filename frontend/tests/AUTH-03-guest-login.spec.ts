import { test, expect } from '@playwright/test';

test.describe('AUTH-03: Guest login for quick play', () => {
  test('should successfully log in as guest with optional display name', async ({ page }) => {
    const testDisplayName = 'QuickPlayer';

    // Navigate to / (home page)
    await page.goto('http://localhost:3000/');
    console.log('✓ Navigated to home page');

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

    // Click 'Guest' tab in the modal
    const guestTab = page.locator('button[role="tab"]:has-text("Guest")');
    await expect(guestTab).toBeVisible();
    await guestTab.click();
    console.log('✓ Guest tab clicked');

    // Wait for guest form to be visible
    await expect(page.locator('#guest-username')).toBeVisible({ timeout: 2000 });
    console.log('✓ Guest form visible');

    // Fill displayName field with 'QuickPlayer' (optional)
    await page.locator('#guest-username').fill(testDisplayName);
    console.log(`✓ Filled display name: ${testDisplayName}`);

    // Intercept API call to POST /api/auth/guest
    const guestRequestPromise = page.waitForRequest(
      request => request.url().includes('/api/auth/guest') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const guestResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/guest') && response.status() === 201,
      { timeout: 10000 }
    );

    // Click 'Play as Guest' button
    const submitButton = page.locator('button[type="submit"]:has-text("Play as Guest")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    console.log('✓ Play as Guest button clicked');

    // Wait for and verify the API call
    const guestRequest = await guestRequestPromise;
    console.log('✓ API call to POST /api/auth/guest intercepted');

    // Verify request body contains display name
    const requestBody = guestRequest.postDataJSON();
    expect(requestBody).toMatchObject({
      displayName: testDisplayName
    });
    console.log('✓ Request body verified');

    // Wait for and verify the response
    const guestResponse = await guestResponsePromise;
    const responseBody = await guestResponse.json();

    // Verify API returns 201 status with guest user (isGuest: true)
    expect(guestResponse.status()).toBe(201);
    expect(responseBody).toHaveProperty('token');
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toHaveProperty('displayName', testDisplayName);
    expect(responseBody.user).toHaveProperty('isGuest', true);
    console.log('✓ API returned 201 status with guest user (isGuest: true)');

    // Verify modal closes
    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Modal closed automatically');

    // Verify 'QuickPlayer' appears in header
    await expect(page.locator('nav').locator(`text=${testDisplayName}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ Display name "${testDisplayName}" appears in header`);

    // Take screenshot to confirm guest state
    await page.screenshot({
      path: 'tests/AUTH-03-guest-login-success.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: AUTH-03-guest-login-success.png');

    console.log('\n✅ AUTH-03: Guest login test PASSED - All acceptance criteria met');
  });

  test('should successfully log in as guest without display name (auto-generated)', async ({ page }) => {
    // Navigate to / (home page)
    await page.goto('http://localhost:3000/');
    console.log('✓ Navigated to home page');

    // Wait for page to load
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✓ Home page loaded');

    // Click 'Login' button in header
    const loginButton = page.locator('button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    console.log('✓ Login button clicked');

    // Wait for modal to open
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });
    console.log('✓ AuthModal opened');

    // Click 'Guest' tab
    const guestTab = page.locator('button[role="tab"]:has-text("Guest")');
    await guestTab.click();
    console.log('✓ Guest tab clicked');

    // Wait for guest form to be visible
    await expect(page.locator('#guest-username')).toBeVisible({ timeout: 2000 });
    console.log('✓ Guest form visible');

    // Leave displayName field empty to test auto-generation
    console.log('✓ Display name field left empty (testing auto-generation)');

    // Intercept API response
    const guestResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/guest') && response.status() === 201,
      { timeout: 10000 }
    );

    // Click 'Play as Guest' button
    const submitButton = page.locator('button[type="submit"]:has-text("Play as Guest")');
    await submitButton.click();
    console.log('✓ Play as Guest button clicked');

    // Wait for response
    const guestResponse = await guestResponsePromise;
    const responseBody = await guestResponse.json();

    // Verify API returns 201 status with guest user
    expect(guestResponse.status()).toBe(201);
    expect(responseBody).toHaveProperty('token');
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toHaveProperty('isGuest', true);
    expect(responseBody.user.displayName).toMatch(/^Guest_/); // Auto-generated name starts with Guest_
    console.log(`✓ API returned guest user with auto-generated name: ${responseBody.user.displayName}`);

    // Verify modal closes
    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Modal closed automatically');

    // Verify auto-generated name appears in header
    const autoGeneratedName = responseBody.user.displayName;
    await expect(page.locator('nav').locator(`text=${autoGeneratedName}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ Auto-generated name "${autoGeneratedName}" appears in header`);

    // Take screenshot
    await page.screenshot({
      path: 'tests/AUTH-03-guest-login-auto-name.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: AUTH-03-guest-login-auto-name.png');

    console.log('\n✅ AUTH-03: Guest login with auto-generated name test PASSED');
  });
});
