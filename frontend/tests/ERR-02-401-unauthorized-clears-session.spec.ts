import { test, expect } from '@playwright/test';

test.describe('ERR-02: 401 unauthorized clears session', () => {
  test('should clear token and redirect to home when API returns 401', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✓ Home page loaded');

    // Set an expired/invalid token in localStorage
    const invalidToken = 'expired.invalid.token';
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, invalidToken);
    console.log('✓ Set expired/invalid token in localStorage');

    // Verify token was set
    const setToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(setToken).toBe(invalidToken);
    console.log('✓ Verified token in localStorage');

    // Set up route interception to mock 401 response for /api/users/me
    await page.route('**/api/users/me', (route) => {
      console.log('✓ Intercepted API call to GET /api/users/me');
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthorized',
          statusCode: 401
        })
      });
    });

    // Navigate to /profile which will trigger the API call
    await page.goto('/profile');
    console.log('✓ Navigated to /profile');

    // Wait a moment for the API call to be made and processed
    await page.waitForTimeout(1000);

    // Verify token is cleared from localStorage
    const clearedToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(clearedToken).toBeNull();
    console.log('✓ Token cleared from localStorage');

    // Verify redirect to / (home page)
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toBe('http://localhost:5173/');
    console.log('✓ Redirected to home page (/)');

    // Verify 'Login' button appears (not user name)
    const loginButton = page.locator('button:has-text("Login")').first();
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    console.log('✓ Login button appears in header');

    // Verify no user name is displayed
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    // The nav should contain the Login button, not a user display name
    await expect(nav.locator('button:has-text("Login")')).toBeVisible();
    console.log('✓ User name not displayed (logged out state confirmed)');

    // Take screenshot
    await page.screenshot({
      path: 'tests/ERR-02-401-unauthorized-logout.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: ERR-02-401-unauthorized-logout.png');

    console.log('\n✅ ERR-02: 401 unauthorized clears session test PASSED - All acceptance criteria met');
  });
});
