import { test, expect } from '@playwright/test';

test.describe('ARCH-03: Pagination navigation', () => {
  test('should navigate between pages of archive results', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Verify pagination controls are visible
    const previousButton = page.locator('button:has-text("Previous")');
    const nextButton = page.locator('button:has-text("Next")');

    await expect(previousButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    console.log('✓ Pagination controls are visible');

    // Take snapshot of initial state (page 1)
    await page.screenshot({
      path: 'frontend/tests/ARCH-03-page-1.png',
      fullPage: false
    });

    // Get the first puzzle's date on page 1 for comparison
    const firstPuzzlePage1 = puzzleCards.first();
    const datePage1 = await firstPuzzlePage1.locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    console.log('First puzzle on page 1:', datePage1);

    // Verify page 1 button is active (select pagination button with w-10 h-10 class which are unique to page number buttons)
    const page1Button = page.locator('button.w-10.h-10', { hasText: /^1$/ });
    await expect(page1Button).toHaveClass(/bg-\[#7B61FF\]/);

    // Click 'Next' button
    await nextButton.click();

    // Wait for page to update (wait for loading to complete)
    await page.waitForTimeout(1000);

    // Verify we're on page 2
    const page2Button = page.locator('button.w-10.h-10', { hasText: /^2$/ });
    await expect(page2Button).toHaveClass(/bg-\[#7B61FF\]/);

    console.log('✓ Navigated to page 2');

    // Verify different puzzles are shown
    const firstPuzzlePage2 = puzzleCards.first();
    const datePage2 = await firstPuzzlePage2.locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    console.log('First puzzle on page 2:', datePage2);

    // The puzzles should be different
    expect(datePage1).not.toBe(datePage2);

    console.log('✓ Different puzzles are shown on page 2');

    // Take snapshot of page 2
    await page.screenshot({
      path: 'frontend/tests/ARCH-03-page-2.png',
      fullPage: false
    });

    // Click 'Previous' button
    await previousButton.click();

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Verify we're back on page 1
    await expect(page1Button).toHaveClass(/bg-\[#7B61FF\]/);

    console.log('✓ Navigated back to page 1');

    // Verify original puzzles are shown
    const firstPuzzleBackToPage1 = puzzleCards.first();
    const dateBackToPage1 = await firstPuzzleBackToPage1.locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    console.log('First puzzle back on page 1:', dateBackToPage1);

    // Should match the original page 1 data
    expect(dateBackToPage1).toBe(datePage1);

    console.log('✓ Original puzzles are shown on page 1');

    // Take final snapshot
    await page.screenshot({
      path: 'frontend/tests/ARCH-03-back-to-page-1.png',
      fullPage: false
    });

    console.log('✓ Pagination navigation test complete');
  });

  test('should navigate by clicking page numbers', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Get the first puzzle's date on page 1
    const datePage1 = await puzzleCards.first().locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    console.log('First puzzle on page 1:', datePage1);

    // Click page 2 button directly (use w-10 h-10 class to target pagination buttons)
    const page2Button = page.locator('button.w-10.h-10', { hasText: /^2$/ });
    await page2Button.click();

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Verify page 2 is active
    await expect(page2Button).toHaveClass(/bg-\[#7B61FF\]/);

    // Verify different puzzles are shown
    const datePage2 = await puzzleCards.first().locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    console.log('First puzzle on page 2:', datePage2);
    expect(datePage1).not.toBe(datePage2);

    console.log('✓ Navigation by clicking page number works');

    // Click page 1 button to go back
    const page1Button = page.locator('button.w-10.h-10', { hasText: /^1$/ });
    await page1Button.click();

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Verify we're back on page 1
    await expect(page1Button).toHaveClass(/bg-\[#7B61FF\]/);

    // Verify original puzzles
    const dateBackToPage1 = await puzzleCards.first().locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') }).locator('span').textContent();
    expect(dateBackToPage1).toBe(datePage1);

    console.log('✓ Back to page 1 by clicking page number');
  });

  test('should disable Previous button on first page and Next button on last page', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // On page 1, Previous button should be disabled
    const previousButton = page.locator('button:has-text("Previous")');
    await expect(previousButton).toBeDisabled();

    console.log('✓ Previous button is disabled on first page');

    // Navigate to the last page by repeatedly clicking Next until it's disabled
    const nextButton = page.locator('button:has-text("Next")');
    let clickCount = 0;
    const maxClicks = 10; // Safety limit

    while (clickCount < maxClicks) {
      const isDisabled = await nextButton.isDisabled();
      if (isDisabled) {
        console.log('✓ Next button is disabled on last page');
        break;
      }
      await nextButton.click();
      await page.waitForTimeout(1000);
      clickCount++;
    }

    // Verify Next is disabled now
    await expect(nextButton).toBeDisabled();

    // Verify Previous is enabled on last page
    await expect(previousButton).toBeEnabled();

    console.log('✓ Pagination buttons have correct states on last page');
  });

  test('should scroll to top when changing pages', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Scroll down a bit
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Click next page
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Check that we're scrolled to top (or near top)
    const scrollPosition = await page.evaluate(() => window.scrollY);
    console.log('Scroll position after page change:', scrollPosition);

    // Should be near the top (allowing for smooth scroll animation)
    expect(scrollPosition).toBeLessThan(100);

    console.log('✓ Page scrolls to top when changing pages');
  });
});
