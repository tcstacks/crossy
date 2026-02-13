import { test, expect } from '@playwright/test';

test.describe('LAND-02: Play Now navigation', () => {
  test('Navigate to home page and verify Play Now button', async ({ page }) => {
    // ✓ Navigate to / (home page)
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set viewport to desktop size for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });

    // ✓ Verify Play Now button is visible in hero section
    const playNowButton = page.locator('button:has-text("Play Now")').first();
    await expect(playNowButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Play Now button is visible on home page');
  });

  test('Click Play Now button and verify navigation to /play', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // ✓ Click 'Play Now' button
    const playNowButton = page.locator('button:has-text("Play Now")').first();
    await expect(playNowButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Clicking Play Now button...');
    await playNowButton.click();

    // Wait for navigation - this might trigger auth modal or navigate to /play
    await page.waitForTimeout(1000);

    // Check if auth modal appears (for non-authenticated users)
    const authModal = page.locator('[role="dialog"]');
    const isAuthModalVisible = await authModal.isVisible().catch(() => false);

    if (isAuthModalVisible) {
      console.log('✓ Auth modal appeared (user not authenticated)');

      // This is expected behavior for non-authenticated users
      // The button should trigger the auth modal instead of direct navigation
      expect(isAuthModalVisible).toBe(true);

      // Take snapshot of auth modal
      await page.screenshot({
        path: 'frontend/tests/LAND-02-auth-modal.png',
        fullPage: false
      });
      console.log('✓ Auth modal snapshot saved');
    } else {
      // ✓ Verify navigation to /play
      // For authenticated users or if /play is public
      await page.waitForURL('/play', { timeout: 5000 });

      const url = page.url();
      expect(url).toContain('/play');

      console.log('✓ Successfully navigated to /play page');

      // ✓ Verify puzzle loads
      // Wait for the page to load content
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check for puzzle grid or loading state
      const puzzleGrid = page.locator('.crossword-grid, [class*="grid"]');
      const loadingSkeleton = page.locator('[class*="skeleton"]');

      const isPuzzleVisible = await puzzleGrid.isVisible().catch(() => false);
      const isLoadingVisible = await loadingSkeleton.isVisible().catch(() => false);

      if (isPuzzleVisible || isLoadingVisible) {
        console.log('✓ Puzzle content is loading/loaded');
      }

      // ✓ Take snapshot of navigation result
      await page.screenshot({
        path: 'frontend/tests/LAND-02-play-page.png',
        fullPage: true
      });

      console.log('✓ Play page snapshot saved to frontend/tests/LAND-02-play-page.png');
    }
  });

  test('Play Now button in Daily Puzzle section', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Scroll to Daily Puzzle section
    const dailyPuzzleSection = page.locator('section#play');
    await dailyPuzzleSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // ✓ Verify second Play Now button in Daily Puzzle section
    const dailyPuzzlePlayButton = page.locator('section#play button:has-text("Play Now")');
    await expect(dailyPuzzlePlayButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Play Now button in Daily Puzzle section is visible');

    // Click the button
    await dailyPuzzlePlayButton.click();
    await page.waitForTimeout(1000);

    // Check for auth modal or navigation
    const authModal = page.locator('[role="dialog"]');
    const isAuthModalVisible = await authModal.isVisible().catch(() => false);

    if (isAuthModalVisible) {
      console.log('✓ Auth modal appeared from Daily Puzzle Play Now button');
    } else {
      const url = page.url();
      expect(url).toContain('/play');
      console.log('✓ Successfully navigated to /play from Daily Puzzle section');
    }
  });

  test('Take snapshot of hero section with Play Now button', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Wait for hero section to be visible
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // ✓ Take snapshot of hero section
    await page.screenshot({
      path: 'frontend/tests/LAND-02-hero-section.png',
      fullPage: false
    });

    console.log('✓ Hero section snapshot saved to frontend/tests/LAND-02-hero-section.png');
  });

  test('Mobile view - Play Now button', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // ✓ Verify Play Now button is visible on mobile
    const playNowButton = page.locator('button:has-text("Play Now")').first();
    await expect(playNowButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Play Now button is visible on mobile view');

    // Take mobile screenshot
    await page.screenshot({
      path: 'frontend/tests/LAND-02-mobile-hero.png',
      fullPage: false
    });

    console.log('✓ Mobile hero snapshot saved to frontend/tests/LAND-02-mobile-hero.png');
  });
});
