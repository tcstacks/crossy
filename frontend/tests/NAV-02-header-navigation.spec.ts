import { test, expect } from '@playwright/test';

test.describe('NAV-02: Header navigation links work', () => {
  test('should navigate to archive page via header link', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('nav', { timeout: 10000 });

    console.log('✓ Home page loaded');

    // Take snapshot of initial state
    await page.screenshot({
      path: 'frontend/tests/NAV-02-home-page.png',
      fullPage: false
    });

    // Find and click the Archive link in the header
    const archiveLink = page.locator('nav a[href="/archive"]').first();
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();

    // Wait for navigation to complete
    await page.waitForURL('**/archive', { timeout: 10000 });

    // Verify we're on the archive page
    expect(page.url()).toContain('/archive');

    // Verify archive page content is loaded
    await expect(page.locator('h1:has-text("Puzzle Archive")')).toBeVisible({ timeout: 10000 });

    console.log('✓ Navigated to /archive via header link');

    // Take snapshot of archive page
    await page.screenshot({
      path: 'frontend/tests/NAV-02-archive-page.png',
      fullPage: false
    });
  });

  test('should navigate to play page via header link', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('nav', { timeout: 10000 });

    console.log('✓ Home page loaded');

    // Find and click the Play link in the header
    const playLink = page.locator('nav a[href="/play"]').first();
    await expect(playLink).toBeVisible();
    await playLink.click();

    // Wait for navigation to complete
    await page.waitForURL('**/play', { timeout: 10000 });

    // Verify we're on the play page
    expect(page.url()).toContain('/play');

    // Verify play page content is loaded (crossword grid or puzzle loading message)
    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible({ timeout: 10000 });

    console.log('✓ Navigated to /play via header link');

    // Take snapshot of play page
    await page.screenshot({
      path: 'frontend/tests/NAV-02-play-page.png',
      fullPage: false
    });
  });

  test('should navigate between archive and play pages', async ({ page }) => {
    // Start at home
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Navigate to Archive
    const archiveLink = page.locator('nav a[href="/archive"]').first();
    await archiveLink.click();
    await page.waitForURL('**/archive', { timeout: 10000 });
    expect(page.url()).toContain('/archive');

    console.log('✓ Navigated to archive from home');

    // Navigate to Play from Archive
    const playLink = page.locator('nav a[href="/play"]').first();
    await playLink.click();
    await page.waitForURL('**/play', { timeout: 10000 });
    expect(page.url()).toContain('/play');

    console.log('✓ Navigated to play from archive');

    // Navigate back to Archive from Play
    const archiveLinkFromPlay = page.locator('nav a[href="/archive"]').first();
    await archiveLinkFromPlay.click();
    await page.waitForURL('**/archive', { timeout: 10000 });
    expect(page.url()).toContain('/archive');

    console.log('✓ Navigated back to archive from play');

    // Take final snapshot
    await page.screenshot({
      path: 'frontend/tests/NAV-02-navigation-complete.png',
      fullPage: false
    });
  });

  test('should highlight active navigation link', async ({ page }) => {
    // Navigate to archive
    await page.goto('http://localhost:3000/archive');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Archive link should be active (have purple color)
    const archiveLink = page.locator('nav a[href="/archive"]').first();
    await expect(archiveLink).toHaveClass(/text-\[#7B61FF\]/);

    console.log('✓ Archive link is highlighted when on archive page');

    // Navigate to play
    await page.goto('http://localhost:3000/play');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Play link should be active
    const playLink = page.locator('nav a[href="/play"]').first();
    await expect(playLink).toHaveClass(/text-\[#7B61FF\]/);

    console.log('✓ Play link is highlighted when on play page');

    // Take snapshot showing active link styling
    await page.screenshot({
      path: 'frontend/tests/NAV-02-active-link.png',
      fullPage: false
    });
  });

  test('should navigate via header on mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to home
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Open mobile menu
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await menuButton.click();

    // Wait for mobile menu to appear
    await page.waitForTimeout(500);

    // Take snapshot of mobile menu
    await page.screenshot({
      path: 'frontend/tests/NAV-02-mobile-menu.png',
      fullPage: false
    });

    // Click Archive in mobile menu
    const archiveLink = page.locator('a[href="/archive"]').last(); // Mobile menu link
    await archiveLink.click();

    // Wait for navigation
    await page.waitForURL('**/archive', { timeout: 10000 });
    expect(page.url()).toContain('/archive');

    console.log('✓ Navigated to archive via mobile menu');

    // Verify mobile menu is closed after navigation
    // The mobile menu is a div that appears below the nav when open
    const mobileMenuContainer = page.locator('.md\\:hidden.absolute.top-16');
    await expect(mobileMenuContainer).toBeHidden({ timeout: 5000 });

    console.log('✓ Mobile menu closes after navigation');
  });
});
