import { test, expect } from '@playwright/test';

test.describe('ARCH-04: Click puzzle navigates to play', () => {
  test('clicking an archive puzzle navigates to /play with date parameter', async ({ page }) => {
    // Navigate to archive page
    await page.goto('http://localhost:3001/archive');

    // Wait for the archive page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzle cards to be visible (not in loading state)
    await page.waitForSelector('button.crossy-card', { timeout: 10000 });

    // Get all puzzle cards
    const puzzleCards = page.locator('button.crossy-card');
    const count = await puzzleCards.count();

    expect(count).toBeGreaterThan(0);

    // Get the first puzzle card
    const firstPuzzle = puzzleCards.first();

    // Extract the date from the first puzzle card
    const dateText = await firstPuzzle.locator('.font-display.font-bold.text-lg').textContent();
    console.log('First puzzle date text:', dateText);

    // Click the first puzzle
    await firstPuzzle.click();

    // Wait for navigation to complete
    await page.waitForURL(/\/play\?date=/, { timeout: 10000 });

    // Verify we're on the play page with a date parameter
    const url = page.url();
    expect(url).toContain('/play?date=');

    // Extract the date from the URL
    const urlParams = new URL(url).searchParams;
    const dateParam = urlParams.get('date');
    expect(dateParam).toBeTruthy();
    // Date can be in YYYY-MM-DD format or ISO format (YYYY-MM-DDTHH:MM:SSZ)
    expect(dateParam).toMatch(/^\d{4}-\d{2}-\d{2}/);

    console.log('Navigated to play page with date:', dateParam);

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });

    // Verify the puzzle grid is visible
    const grid = page.locator('[data-testid="crossword-grid"]');
    await expect(grid).toBeVisible();

    // Verify puzzle content loaded (should have cells)
    const cells = grid.locator('div');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Take a screenshot of the loaded puzzle
    await page.screenshot({
      path: 'frontend/tests/ARCH-04-loaded-puzzle.png',
      fullPage: true
    });

    console.log('✓ Archive puzzle navigation test passed');
    console.log('✓ Screenshot saved to frontend/tests/ARCH-04-loaded-puzzle.png');
  });

  test('clicking different puzzles loads different dates', async ({ page }) => {
    // Navigate to archive page
    await page.goto('http://localhost:3001/archive');

    // Wait for puzzle cards
    await page.waitForSelector('button.crossy-card', { timeout: 10000 });

    const puzzleCards = page.locator('button.crossy-card');
    const count = await puzzleCards.count();

    // Skip if we don't have at least 2 puzzles
    if (count < 2) {
      console.log('Not enough puzzles to test multiple navigation');
      return;
    }

    // Click the first puzzle
    const firstPuzzle = puzzleCards.nth(0);
    await firstPuzzle.click();

    await page.waitForURL(/\/play\?date=/, { timeout: 10000 });
    const firstUrl = page.url();
    const firstDate = new URL(firstUrl).searchParams.get('date');

    // Go back to archive
    await page.goto('http://localhost:3001/archive');
    await page.waitForSelector('button.crossy-card', { timeout: 10000 });

    // Click the second puzzle
    const secondPuzzle = page.locator('button.crossy-card').nth(1);
    await secondPuzzle.click();

    await page.waitForURL(/\/play\?date=/, { timeout: 10000 });
    const secondUrl = page.url();
    const secondDate = new URL(secondUrl).searchParams.get('date');

    // Verify different dates
    expect(firstDate).toBeTruthy();
    expect(secondDate).toBeTruthy();
    expect(firstDate).not.toBe(secondDate);

    console.log('✓ Different puzzles navigate to different dates');
    console.log(`  First date: ${firstDate}`);
    console.log(`  Second date: ${secondDate}`);
  });
});
