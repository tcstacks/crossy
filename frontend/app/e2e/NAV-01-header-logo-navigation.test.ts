import { test, expect } from '@playwright/test';

test.describe('NAV-01: Header logo and navigation', () => {
  // Test on multiple pages to ensure header is consistent across the app
  // Only testing public pages that don't require authentication
  const pagesToTest = [
    { path: '/', name: 'Home' },
    { path: '/play', name: 'Play' },
    { path: '/archive', name: 'Archive' },
  ];

  for (const { path, name } of pagesToTest) {
    test(`${name} page - logo is visible and navigation works`, async ({ page }) => {
      // Navigate to the page
      await page.goto(`http://localhost:3001${path}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // ✓ Verify logo is visible in header
      const logo = page.locator('nav img[alt="Crossy"]').first();
      await expect(logo).toBeVisible({ timeout: 5000 });

      // Verify logo has correct source
      const logoSrc = await logo.getAttribute('src');
      expect(logoSrc).toContain('crossy-small.png');

      // ✓ Verify logo text is visible
      const logoText = page.locator('nav a[href="/"] span.font-pixel:has-text("Crossy")');
      await expect(logoText).toBeVisible();

      // ✓ Verify navigation links are visible (desktop view)
      // Set viewport to desktop size to ensure navigation is visible
      await page.setViewportSize({ width: 1280, height: 720 });

      const playLink = page.locator('nav a[href="/play"]').first();
      const archiveLink = page.locator('nav a[href="/archive"]').first();
      const multiplayerLink = page.locator('nav a[href="/room/create"]').first();
      const profileLink = page.locator('nav a[href="/profile"]').first();
      const historyLink = page.locator('nav a[href="/history"]').first();

      await expect(playLink).toBeVisible();
      await expect(archiveLink).toBeVisible();
      await expect(multiplayerLink).toBeVisible();
      await expect(profileLink).toBeVisible();
      await expect(historyLink).toBeVisible();

      console.log(`✓ Navigation links verified on ${name} page`);
    });
  }

  test('Logo click navigates to home from different pages', async ({ page }) => {
    // Start on archive page
    await page.goto('http://localhost:3001/archive');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // ✓ Click logo and verify navigation to home
    const logoLink = page.locator('nav a[href="/"]');
    await logoLink.click();

    // Wait for navigation to complete
    await page.waitForURL('http://localhost:3001/', { timeout: 5000 });

    // Verify we're on the home page
    const url = page.url();
    expect(url).toBe('http://localhost:3001/');

    console.log('✓ Logo navigation from archive to home verified');

    // Test from play page
    await page.goto('http://localhost:3001/play');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    await logoLink.click();
    await page.waitForURL('http://localhost:3001/', { timeout: 5000 });

    expect(page.url()).toBe('http://localhost:3001/');

    console.log('✓ Logo navigation from play to home verified');
  });

  test('Take snapshot of header on home page', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set desktop viewport for consistent screenshot
    await page.setViewportSize({ width: 1280, height: 720 });

    // Wait for header to be fully visible
    const header = page.locator('nav');
    await expect(header).toBeVisible();

    // ✓ Take snapshot of header
    await page.screenshot({
      path: 'frontend/tests/NAV-01-header-snapshot.png',
      fullPage: false
    });

    console.log('✓ Header snapshot saved to frontend/tests/NAV-01-header-snapshot.png');
  });

  test('Mobile menu navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify logo is visible on mobile
    const logo = page.locator('nav img[alt="Crossy"]').first();
    await expect(logo).toBeVisible();

    // Verify hamburger menu button is visible
    const menuButton = page.locator('nav button:has-text("")').last(); // The menu icon button
    await expect(menuButton).toBeVisible();

    // Click hamburger menu
    await menuButton.click();

    // Wait for mobile menu to open
    await page.waitForTimeout(500);

    // Verify mobile navigation links are visible
    const mobileNav = page.locator('nav div.flex.flex-col');
    await expect(mobileNav).toBeVisible();

    console.log('✓ Mobile menu navigation verified');

    // Take mobile screenshot
    await page.screenshot({
      path: 'frontend/tests/NAV-01-mobile-menu.png',
      fullPage: true
    });

    console.log('✓ Mobile menu snapshot saved to frontend/tests/NAV-01-mobile-menu.png');
  });
});
