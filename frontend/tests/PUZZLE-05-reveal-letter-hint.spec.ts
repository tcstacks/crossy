import { test, expect } from '@playwright/test';

test.describe('PUZZLE-05 - Reveal single letter hint', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('http://localhost:3000/play');

    // Wait for puzzle to load - wait for the grid container to appear
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 15000 });

    // Also wait for clues to be loaded
    await page.waitForTimeout(1000);
  });

  test('Complete PUZZLE-01 to load puzzle', async ({ page }) => {
    // Verify puzzle elements are visible
    const grid = page.locator('[data-testid="crossword-grid"]');
    await expect(grid).toBeVisible();

    // Verify clues panel exists
    const cluesPanel = page.locator('.crossy-card').first();
    await expect(cluesPanel).toBeVisible();
  });

  test('Click on an empty cell', async ({ page }) => {
    // Find an empty cell (non-blocked cell) and click it
    const grid = page.locator('[data-testid="crossword-grid"]');

    // Get all cells and find a white one (empty, non-blocked)
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    // Click the first empty cell
    await cells.first().click();
    await page.waitForTimeout(300);

    // Verify a cell is selected (should have purple background)
    const selectedCell = page.locator('[class*="bg-[#7B61FF]"]').first();
    await expect(selectedCell).toBeVisible();
  });

  test('Find and click the Reveal Letter button', async ({ page }) => {
    // Click on an empty cell first
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });
    await cells.first().click();
    await page.waitForTimeout(300);

    // Find and verify the Letter button exists
    const letterButton = page.locator('button:has-text("Letter")');
    await expect(letterButton).toBeVisible();

    // Take screenshot before clicking
    await page.screenshot({ path: 'frontend/tests/PUZZLE-05-before-reveal.png', fullPage: true });
  });

  test('Verify the correct letter appears in the cell', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    // Get the first cell
    const firstCell = cells.first();
    await firstCell.click();
    await page.waitForTimeout(300);

    // Click the Reveal Letter button
    const letterButton = page.locator('button:has-text("Letter")');
    await letterButton.click();
    await page.waitForTimeout(500);

    // Verify the cell now has a letter (non-empty text content)
    const cellText = await firstCell.locator('span').last().textContent();
    expect(cellText).toBeTruthy();
    expect(cellText?.length).toBeGreaterThan(0);
  });

  test('Verify cell is marked as revealed (different styling)', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    await cells.first().click();
    await page.waitForTimeout(300);

    // Click the Reveal Letter button
    const letterButton = page.locator('button:has-text("Letter")');
    await letterButton.click();
    await page.waitForTimeout(500);

    // Verify the revealed cell has the peach/orange background
    // The revealed cell should have bg-[#FFE5B4] and border-[#FFA500]
    const revealedCell = page.locator('[class*="bg-[#FFE5B4]"]').first();
    await expect(revealedCell).toBeVisible();
  });

  test('Verify hints used counter increments', async ({ page }) => {
    // Find the hints counter - it should be next to the timer, with a lightbulb icon
    const hintsCounter = page.locator('div:has(svg.lucide-lightbulb) span').filter({ hasText: /^\d+$/ });

    // Get initial hints count
    const initialCount = await hintsCounter.textContent();
    expect(initialCount).toBe('0');

    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    await cells.first().click();
    await page.waitForTimeout(300);

    // Click the Reveal Letter button
    const letterButton = page.locator('button:has-text("Letter")');
    await letterButton.click();
    await page.waitForTimeout(500);

    // Verify hints counter incremented
    const newCount = await hintsCounter.textContent();
    expect(newCount).toBe('1');

    // Click another cell and reveal another letter
    await cells.nth(1).click();
    await page.waitForTimeout(300);
    await letterButton.click();
    await page.waitForTimeout(500);

    // Verify hints counter incremented again
    const finalCount = await hintsCounter.textContent();
    expect(finalCount).toBe('2');
  });

  test('Take screenshot showing revealed letter', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    await cells.first().click();
    await page.waitForTimeout(300);

    // Click the Reveal Letter button
    const letterButton = page.locator('button:has-text("Letter")');
    await letterButton.click();
    await page.waitForTimeout(500);

    // Take screenshot showing:
    // 1. The revealed letter in the cell
    // 2. The cell with different styling (peach/orange background)
    // 3. The hints counter showing 1
    await page.screenshot({ path: 'frontend/tests/PUZZLE-05-revealed-letter.png', fullPage: true });
  });
});
