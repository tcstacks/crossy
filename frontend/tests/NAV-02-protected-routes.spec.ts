import { test, expect } from '@playwright/test';

test.describe('NAV-02: Protected routes redirect unauthenticated users', () => {
  test('should redirect unauthenticated users from /profile to home page', async ({ page, baseURL }) => {
    // Ensure no token in localStorage (logged out)
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Clear any existing auth state
    await page.evaluate(() => localStorage.clear());
    console.log('✓ Cleared localStorage (ensured logged out)');

    // Navigate directly to /profile (protected route)
    await page.goto('/profile');

    // Wait for redirect to complete
    await page.waitForURL('/', { timeout: 5000 });

    // Verify redirect to / (home page)
    expect(page.url()).toBe(`${baseURL}/`);
    console.log('✓ Redirected from /profile to / (home page)');

    // Verify we're on the home page by checking for landing page content
    await expect(page.locator('nav')).toBeVisible();
    console.log('✓ Home page loaded successfully');

    // Take screenshot showing redirect
    await page.screenshot({
      path: 'frontend/tests/NAV-02-profile-redirect.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: NAV-02-profile-redirect.png');
  });

  test('should redirect unauthenticated users from /room/create to home page', async ({ page, baseURL }) => {
    // Ensure no token in localStorage (logged out)
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Clear any existing auth state
    await page.evaluate(() => localStorage.clear());
    console.log('✓ Cleared localStorage (ensured logged out)');

    // Navigate directly to /room/create (protected route)
    await page.goto('/room/create');

    // Wait for redirect to complete
    await page.waitForURL('/', { timeout: 5000 });

    // Verify redirect to / (home page)
    expect(page.url()).toBe(`${baseURL}/`);
    console.log('✓ Redirected from /room/create to / (home page)');

    // Verify we're on the home page
    await expect(page.locator('nav')).toBeVisible();
    console.log('✓ Home page loaded successfully');

    // Take screenshot showing redirect
    await page.screenshot({
      path: 'frontend/tests/NAV-02-room-create-redirect.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved: NAV-02-room-create-redirect.png');
  });

  test('should redirect unauthenticated users from /history to home page', async ({ page, baseURL }) => {
    // Ensure no token in localStorage (logged out)
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Clear any existing auth state
    await page.evaluate(() => localStorage.clear());
    console.log('✓ Cleared localStorage (ensured logged out)');

    // Navigate directly to /history (protected route)
    await page.goto('/history');

    // Wait for redirect to complete
    await page.waitForURL('/', { timeout: 5000 });

    // Verify redirect to / (home page)
    expect(page.url()).toBe(`${baseURL}/`);
    console.log('✓ Redirected from /history to / (home page)');

    // Verify we're on the home page
    await expect(page.locator('nav')).toBeVisible();
    console.log('✓ Home page loaded successfully');
  });

  test('should redirect unauthenticated users from /room/join to home page', async ({ page, baseURL }) => {
    // Ensure no token in localStorage (logged out)
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Clear any existing auth state
    await page.evaluate(() => localStorage.clear());
    console.log('✓ Cleared localStorage (ensured logged out)');

    // Navigate directly to /room/join (protected route)
    await page.goto('/room/join');

    // Wait for redirect to complete
    await page.waitForURL('/', { timeout: 5000 });

    // Verify redirect to / (home page)
    expect(page.url()).toBe(`${baseURL}/`);
    console.log('✓ Redirected from /room/join to / (home page)');

    // Verify we're on the home page
    await expect(page.locator('nav')).toBeVisible();
    console.log('✓ Home page loaded successfully');
  });

  test.skip('authenticated users can access protected routes - skipped (covered by other auth tests)', async () => {
    // This test is skipped because:
    // 1. The main acceptance criteria focus on UNAUTHENTICATED redirect behavior (all passing)
    // 2. Authenticated access to protected routes is already tested in AUTH-02, USER-01, ROOM-01
    // 3. This avoids duplicate backend registration calls during test runs
  });
});
