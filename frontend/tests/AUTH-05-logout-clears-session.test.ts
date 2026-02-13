import { test, expect } from '@playwright/test';

/**
 * AUTH-05: User logout clears session
 *
 * Acceptance Criteria:
 * - Complete AUTH-02 to be logged in
 * - Verify user name appears in header
 * - Click user menu/avatar in header
 * - Click 'Logout' option
 * - Verify localStorage 'auth_token' is removed
 * - Verify header shows 'Login' button (not user name)
 * - Navigate to /profile
 * - Verify redirect to home page (protected route)
 * - Take screenshot confirming logged-out state
 */

const FRONTEND_URL = 'http://localhost:3000';

test.describe('AUTH-05: User logout clears session', () => {
  test('User can logout and session is cleared', async ({ page }) => {
    // Generate unique credentials for this test
    const timestamp = Date.now();
    const testEmail = `logouttest${timestamp}@example.com`;
    const testUsername = 'LogoutTestUser';
    const testPassword = 'SecurePass123!';

    // ============================================
    // SETUP: Register and login a user (AUTH-02)
    // ============================================

    await page.goto(FRONTEND_URL);
    await page.waitForSelector('nav', { timeout: 10000 });

    // Open auth modal
    const initialLoginButton = page.locator('button:has-text("Login")').first();
    await initialLoginButton.click();
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });

    // Switch to Register tab
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
    console.log('✓ Setup: User registered and logged in');

    // ============================================
    // Step 1: Verify user name appears in header
    // ============================================

    await expect(page.locator('nav').locator(`text=${testUsername}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ User name "${testUsername}" appears in header`);

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    console.log('✓ Token is stored in localStorage');

    // Take screenshot of logged-in state
    await page.screenshot({
      path: 'frontend/tests/AUTH-05-logged-in-state.png',
      fullPage: false
    });
    console.log('✓ Screenshot: AUTH-05-logged-in-state.png');

    // ============================================
    // Step 2: Click user menu/avatar in header
    // ============================================

    // Find the user dropdown button (has username text and is in nav)
    const userMenuButton = page.locator('nav').locator(`button:has-text("${testUsername}")`);
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();
    console.log('✓ Clicked user menu button');

    // Wait for dropdown menu to appear
    await page.waitForTimeout(300);

    // Take screenshot of dropdown menu
    await page.screenshot({
      path: 'frontend/tests/AUTH-05-user-menu-dropdown.png',
      fullPage: false
    });
    console.log('✓ Screenshot: AUTH-05-user-menu-dropdown.png');

    // ============================================
    // Step 3: Click 'Logout' option
    // ============================================

    // Find and click the logout menu item
    const logoutMenuItem = page.locator('[role="menuitem"]:has-text("Logout")');
    await expect(logoutMenuItem).toBeVisible({ timeout: 2000 });
    await logoutMenuItem.click();
    console.log('✓ Clicked Logout menu item');

    // Wait a moment for logout to complete
    await page.waitForTimeout(500);

    // ============================================
    // Step 4: Verify localStorage 'auth_token' is removed
    // ============================================

    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(tokenAfterLogout).toBeNull();
    console.log('✓ Token removed from localStorage');

    // ============================================
    // Step 5: Verify header shows 'Login' button (not user name)
    // ============================================

    // User name should no longer be visible
    await expect(page.locator('nav').locator(`text=${testUsername}`)).not.toBeVisible();
    console.log(`✓ User name "${testUsername}" no longer visible in header`);

    // Login button should be visible again
    const loginButtonAfterLogout = page.locator('button:has-text("Login")').first();
    await expect(loginButtonAfterLogout).toBeVisible();
    console.log('✓ Login button is visible again');

    // ============================================
    // Step 6: Navigate to /profile
    // ============================================

    await page.goto(`${FRONTEND_URL}/profile`);
    console.log('✓ Navigated to /profile');

    // ============================================
    // Step 7: Verify redirect to home page (protected route)
    // ============================================

    // Protected route should show auth modal instead of profile content
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 3000 });
    console.log('✓ Protected route shows auth modal (not profile)');

    // Press Escape to close the auth modal and trigger redirect
    await page.keyboard.press('Escape');

    // Wait for redirect to complete
    await page.waitForURL(FRONTEND_URL + '/', { timeout: 5000 });
    expect(page.url()).toBe(FRONTEND_URL + '/');
    console.log('✓ Redirected to home page (protected route working)');

    // ============================================
    // Step 8: Take screenshot confirming logged-out state
    // ============================================

    await page.screenshot({
      path: 'frontend/tests/AUTH-05-logged-out-state.png',
      fullPage: false
    });
    console.log('✓ Screenshot: AUTH-05-logged-out-state.png');

    console.log('\n✅ AUTH-05: User logout clears session - PASSED');
  });

  test('Mobile logout flow works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Generate unique credentials for this test
    const timestamp = Date.now();
    const testEmail = `mobilelogout${timestamp}@example.com`;
    const testUsername = 'MobileLogout';
    const testPassword = 'SecurePass123!';

    // Register and login
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('nav', { timeout: 10000 });

    const initialLoginButton = page.locator('button:has-text("Login")').first();
    await initialLoginButton.click();
    await expect(page.locator('text=Welcome to Crossy!')).toBeVisible({ timeout: 5000 });

    const registerTab = page.locator('button[role="tab"]:has-text("Register")');
    await registerTab.click();

    await page.locator('#register-username').fill(testUsername);
    await page.locator('#register-email').fill(testEmail);
    await page.locator('#register-password').fill(testPassword);

    const registerButton = page.locator('button[type="submit"]:has-text("Register")');
    await registerButton.click();

    await expect(page.locator('text=Welcome to Crossy!')).toBeHidden({ timeout: 5000 });
    console.log('✓ Mobile: User registered and logged in');

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    // On mobile, need to open the hamburger menu
    const menuButton = page.locator('nav button').filter({ has: page.locator('svg') }).first();
    await menuButton.click();
    console.log('✓ Mobile: Opened hamburger menu');

    // Wait for mobile menu to appear
    await page.waitForTimeout(500);

    // Find and click logout in mobile menu
    const mobileLogoutButton = page.locator('button:has-text("Logout")');
    await expect(mobileLogoutButton).toBeVisible();
    await mobileLogoutButton.click();
    console.log('✓ Mobile: Clicked Logout button');

    // Wait for logout to complete
    await page.waitForTimeout(500);

    // Verify token is removed
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(tokenAfterLogout).toBeNull();
    console.log('✓ Mobile: Token removed from localStorage');

    // Verify login button appears again
    const loginButtonAfterLogout = page.locator('button:has-text("Login")').first();
    await expect(loginButtonAfterLogout).toBeVisible();
    console.log('✓ Mobile: Login button visible again');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/AUTH-05-mobile-logged-out.png',
      fullPage: false
    });
    console.log('✓ Screenshot: AUTH-05-mobile-logged-out.png');

    console.log('\n✅ AUTH-05: Mobile logout flow - PASSED');
  });
});
