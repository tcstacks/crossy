import { test, expect } from '@playwright/test';

test.describe('NAV-03: 404 page for invalid routes', () => {
  test('should display 404 page for invalid routes with all required elements', async ({ page }) => {
    // Navigate to an invalid page
    await page.goto('/some-invalid-page-xyz');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('✓ Navigated to /some-invalid-page-xyz');

    // Verify 404 page is displayed - check for the 404 heading
    const heading404 = page.locator('h1:has-text("404")');
    await expect(heading404).toBeVisible({ timeout: 10000 });

    console.log('✓ 404 page is displayed');

    // Verify 'not found' message is shown
    const notFoundMessage = page.locator('h2:has-text("Page Not Found")');
    await expect(notFoundMessage).toBeVisible();

    console.log('✓ "Not found" message is shown');

    // Verify link/button to return home exists
    const homeButton = page.locator('button:has-text("Go Home")');
    await expect(homeButton).toBeVisible();

    console.log('✓ Link to return home exists');

    // Take screenshot of 404 page
    await page.screenshot({
      path: 'frontend/tests/NAV-03-404-page.png',
      fullPage: true
    });

    console.log('✓ Screenshot of 404 page taken');

    // Click home link
    await homeButton.click();

    // Verify navigation to /
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);

    console.log('✓ Navigated to home page');

    // Verify we're on the home page by checking for landing page content
    const landingPageHeading = page.locator('h1').first();
    await expect(landingPageHeading).toBeVisible({ timeout: 10000 });

    console.log('✓ All acceptance criteria passed');
  });

  test('should display 404 page for various invalid routes', async ({ page }) => {
    const invalidRoutes = [
      '/this-does-not-exist',
      '/random-page-123',
      '/profile/invalid',
      '/room/invalid/extra',
    ];

    for (const route of invalidRoutes) {
      await page.goto(`${route}`);
      await page.waitForLoadState('networkidle');

      // Verify 404 page is displayed
      const heading404 = page.locator('h1:has-text("404")');
      await expect(heading404).toBeVisible({ timeout: 10000 });

      console.log(`✓ 404 page displayed for ${route}`);
    }
  });

  test('should have proper styling and layout on 404 page', async ({ page }) => {
    await page.goto('/invalid-route');
    await page.waitForLoadState('networkidle');

    // Verify header is present
    const header = page.locator('nav');
    await expect(header).toBeVisible();

    console.log('✓ Header is present on 404 page');

    // Verify 404 heading is large and styled
    const heading404 = page.locator('h1:has-text("404")');
    await expect(heading404).toHaveClass(/text-6xl/);

    console.log('✓ 404 heading has proper styling');

    // Verify image/mascot is present
    const mascotImage = page.locator('img[alt="Crossy Sleeping"]');
    await expect(mascotImage).toBeVisible();

    console.log('✓ Crossy mascot image is visible');

    // Verify descriptive text is present
    const description = page.locator('text=Oops! Looks like Crossy got lost');
    await expect(description).toBeVisible();

    console.log('✓ Descriptive text is present');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/mobile-404-test');
    await page.waitForLoadState('networkidle');

    // Verify 404 page is displayed on mobile
    const heading404 = page.locator('h1:has-text("404")');
    await expect(heading404).toBeVisible({ timeout: 10000 });

    // Verify Go Home button is visible on mobile
    const homeButton = page.locator('button:has-text("Go Home")');
    await expect(homeButton).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({
      path: 'frontend/tests/NAV-03-404-mobile.png',
      fullPage: true
    });

    console.log('✓ 404 page works properly on mobile viewport');
  });
});
