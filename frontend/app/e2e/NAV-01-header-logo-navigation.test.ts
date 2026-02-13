import { test, expect } from '@playwright/test';

test.describe('NAV-01: Header navigation works', () => {
  test('Navigate to home page and verify logo', async ({ page }) => {
    // Navigate to / (home page)
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set desktop viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify logo is visible in header
    const logo = page.locator('nav img[alt="Crossy"]').first();
    await expect(logo).toBeVisible({ timeout: 5000 });

    // Verify logo has correct source
    const logoSrc = await logo.getAttribute('src');
    expect(logoSrc).toContain('crossy-small.png');

    // Verify logo text is visible
    const logoText = page.locator('nav a[href="/"] span.font-pixel:has-text("Crossy")');
    await expect(logoText).toBeVisible();

    console.log('✓ Navigated to / and verified logo is visible');
  });

  test('Click Play link and verify navigation to /play', async ({ page }) => {
    // Start on home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Click 'Play' link in header
    const playLink = page.locator('nav a[href="/play"]').first();
    await expect(playLink).toBeVisible();
    await playLink.click();

    // Verify navigation to /play
    await page.waitForURL('**/play', { timeout: 5000 });
    expect(page.url()).toContain('/play');

    console.log('✓ Clicked Play link and verified navigation to /play');
  });

  test('Click Archive link and verify navigation to /archive', async ({ page }) => {
    // Start on home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Click 'Archive' link in header
    const archiveLink = page.locator('nav a[href="/archive"]').first();
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();

    // Verify navigation to /archive
    await page.waitForURL('**/archive', { timeout: 5000 });
    expect(page.url()).toContain('/archive');

    console.log('✓ Clicked Archive link and verified navigation to /archive');
  });

  test('Click logo and verify navigation back to /', async ({ page }) => {
    // Start on archive page
    await page.goto('/archive');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Click logo
    const logoLink = page.locator('nav a[href="/"]').first();
    await expect(logoLink).toBeVisible();
    await logoLink.click();

    // Verify navigation back to /
    await page.waitForURL('/', { timeout: 5000 });
    const url = page.url();
    expect(url.endsWith('/')).toBeTruthy();

    console.log('✓ Clicked logo and verified navigation back to /');
  });

  test('Take screenshots of navigation', async ({ page }) => {
    // Set desktop viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Screenshot of home page with header
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const header = page.locator('nav');
    await expect(header).toBeVisible();
    await page.screenshot({
      path: 'e2e/screenshots/NAV-01-home-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: NAV-01-home-page.png');

    // Screenshot of /play page
    await page.goto('/play');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.screenshot({
      path: 'e2e/screenshots/NAV-01-play-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: NAV-01-play-page.png');

    // Screenshot of /archive page
    await page.goto('/archive');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.screenshot({
      path: 'e2e/screenshots/NAV-01-archive-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: NAV-01-archive-page.png');

    console.log('✓ All navigation screenshots saved');
  });
});
