import { test, expect } from '@playwright/test';

test.describe('LAND-01: Landing page hero section', () => {
  test('should display hero section with CTA buttons', async ({ page }) => {
    // Navigate to / (home page)
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('section', { timeout: 10000 });

    console.log('✓ Home page loaded');

    // Verify hero section is displayed
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    console.log('✓ Hero section is displayed');

    // Verify 'Play Now' button is visible
    const playNowButton = page.locator('button:has-text("Play Now")').first();
    await expect(playNowButton).toBeVisible();

    console.log('✓ Play Now button is visible');

    // Verify 'Play with Friends' button is visible
    const playWithFriendsButton = page.locator('button:has-text("Play with Friends")').first();
    await expect(playWithFriendsButton).toBeVisible();

    console.log('✓ Play with Friends button is visible');

    // Take snapshot of hero section
    await page.screenshot({
      path: 'frontend/tests/LAND-01-hero-section.png',
      fullPage: false
    });

    console.log('✓ Snapshot taken');
  });

  test('should display hero section content', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('section', { timeout: 10000 });

    // Verify hero section has the title
    const heroTitle = page.locator('h1:has-text("CROSSY")');
    await expect(heroTitle).toBeVisible();

    console.log('✓ Hero title is displayed');

    // Verify hero section has the tagline
    const heroTagline = page.locator('p:has-text("Daily puzzles, solved together")').first();
    await expect(heroTagline).toBeVisible();

    console.log('✓ Hero tagline is displayed');

    // Verify both CTA buttons are in the same container
    const ctaContainer = page.locator('.hero-content').filter({ has: page.locator('button:has-text("Play Now")') });
    await expect(ctaContainer).toBeVisible();

    const buttonsInContainer = await ctaContainer.locator('button').count();
    expect(buttonsInContainer).toBeGreaterThanOrEqual(2);

    console.log('✓ Both CTA buttons are in the hero section');
  });

  test('Play Now button should be functional', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('button:has-text("Play Now")', { timeout: 10000 });

    // Click Play Now button
    const playNowButton = page.locator('button:has-text("Play Now")').first();
    await playNowButton.click();

    // Since user is not authenticated, auth modal should appear
    // Wait for auth modal to appear (using a more specific selector)
    const authModal = page.locator('[role="dialog"][data-slot="dialog-content"]').first();
    await expect(authModal).toBeVisible({ timeout: 5000 });

    console.log('✓ Play Now button opens auth modal for unauthenticated users');

    // Take snapshot
    await page.screenshot({
      path: 'frontend/tests/LAND-01-play-now-click.png',
      fullPage: false
    });
  });

  test('Play with Friends button should be functional', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('button:has-text("Play with Friends")', { timeout: 10000 });

    // Click Play with Friends button
    const playWithFriendsButton = page.locator('button:has-text("Play with Friends")').first();
    await playWithFriendsButton.click();

    // Since user is not authenticated, auth modal should appear
    // Wait for auth modal to appear (using a more specific selector)
    const authModal = page.locator('[role="dialog"][data-slot="dialog-content"]').first();
    await expect(authModal).toBeVisible({ timeout: 5000 });

    console.log('✓ Play with Friends button opens auth modal for unauthenticated users');

    // Take snapshot
    await page.screenshot({
      path: 'frontend/tests/LAND-01-play-with-friends-click.png',
      fullPage: false
    });
  });
});
