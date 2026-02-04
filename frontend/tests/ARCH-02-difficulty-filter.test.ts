import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

/**
 * ARCH-02: Filter by difficulty
 *
 * As a player, I can filter puzzles by difficulty (easy/medium/hard)
 *
 * Acceptance Criteria:
 * - Navigate to /archive
 * - Find the difficulty filter dropdown
 * - Select 'Easy' filter
 * - Verify only Easy puzzles are displayed
 * - Select 'Hard' filter
 * - Verify only Hard puzzles are displayed
 * - Take snapshots of filtered results
 */

test.describe('ARCH-02: Difficulty Filter', () => {
  test('should filter puzzles by difficulty', async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to archive page
      await page.goto('http://localhost:3001/archive');
      await page.waitForLoadState('networkidle');

      // Wait for puzzles to load (check for puzzle cards)
      await page.waitForSelector('.grid', { timeout: 10000 });

      // Take initial screenshot
      await page.screenshot({
        path: 'frontend/tests/ARCH-02-initial-view.png',
        fullPage: true
      });

      // Find the difficulty filter section
      const filterSection = page.locator('text=Difficulty').first();
      await expect(filterSection).toBeVisible();

      // Get all puzzle cards initially
      const allPuzzles = await page.locator('.grid > button').count();
      console.log(`Total puzzles displayed initially: ${allPuzzles}`);

      // Click 'Easy' filter button
      const easyButton = page.locator('button:has-text("Easy")').first();
      await expect(easyButton).toBeVisible();
      await easyButton.click();

      // Wait a moment for filter to apply
      await page.waitForTimeout(500);

      // Verify Easy filter is active (has the green background color)
      const easyButtonClass = await easyButton.getAttribute('class');
      expect(easyButtonClass).toContain('bg-[#2ECC71]');

      // Verify only Easy puzzles are displayed
      const easyPuzzles = await page.locator('.grid > button').all();
      console.log(`Easy puzzles displayed: ${easyPuzzles.length}`);

      // Check each visible puzzle has 'Easy' difficulty badge
      for (const puzzle of easyPuzzles) {
        const badges = await puzzle.locator('span').allTextContents();
        const hasEasyBadge = badges.some(text => text.toLowerCase().includes('easy'));
        expect(hasEasyBadge).toBeTruthy();
      }

      // Take screenshot of Easy filter
      await page.screenshot({
        path: 'frontend/tests/ARCH-02-easy-filter.png',
        fullPage: true
      });

      // Click 'Hard' filter button
      const hardButton = page.locator('button:has-text("Hard")').first();
      await expect(hardButton).toBeVisible();
      await hardButton.click();

      // Wait a moment for filter to apply
      await page.waitForTimeout(500);

      // Verify Hard filter is active (has the red background color)
      const hardButtonClass = await hardButton.getAttribute('class');
      expect(hardButtonClass).toContain('bg-[#FF4D6A]');

      // Verify only Hard puzzles are displayed
      const hardPuzzles = await page.locator('.grid > button').all();
      console.log(`Hard puzzles displayed: ${hardPuzzles.length}`);

      // Check each visible puzzle has 'Hard' difficulty badge
      for (const puzzle of hardPuzzles) {
        const badges = await puzzle.locator('span').allTextContents();
        const hasHardBadge = badges.some(text => text.toLowerCase().includes('hard'));
        expect(hasHardBadge).toBeTruthy();
      }

      // Take screenshot of Hard filter
      await page.screenshot({
        path: 'frontend/tests/ARCH-02-hard-filter.png',
        fullPage: true
      });

      // Also test Medium filter
      const mediumButton = page.locator('button:has-text("Medium")').first();
      await expect(mediumButton).toBeVisible();
      await mediumButton.click();

      await page.waitForTimeout(500);

      // Verify Medium filter is active (has the yellow background color)
      const mediumButtonClass = await mediumButton.getAttribute('class');
      expect(mediumButtonClass).toContain('bg-[#FFC107]');

      // Take screenshot of Medium filter
      await page.screenshot({
        path: 'frontend/tests/ARCH-02-medium-filter.png',
        fullPage: true
      });

      // Click 'All' to reset
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();

      await page.waitForTimeout(500);

      // Verify All filter is active
      const allButtonClass = await allButton.getAttribute('class');
      expect(allButtonClass).toContain('bg-[#7B61FF]');

      // Take screenshot of All filter
      await page.screenshot({
        path: 'frontend/tests/ARCH-02-all-filter.png',
        fullPage: true
      });

      console.log('✅ All difficulty filter tests passed!');

    } finally {
      await context.close();
      await browser.close();
    }
  });
});
