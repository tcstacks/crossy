import { test, expect } from '@playwright/test';

test.describe('PUZZLE-06 - Reveal entire word hint', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('/play');

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

  test('Click on a cell in a word', async ({ page }) => {
    // Find a non-blocked cell and click it
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

  test('Find and click the Reveal Word button', async ({ page }) => {
    // Click on an empty cell first
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });
    await cells.first().click();
    await page.waitForTimeout(300);

    // Find and verify the Word button exists
    const wordButton = page.locator('button:has-text("Word")');
    await expect(wordButton).toBeVisible();

    // Take screenshot before clicking
    await page.screenshot({ path: 'frontend/tests/PUZZLE-06-before-reveal.png', fullPage: true });
  });

  test('Verify all letters in the current word are revealed', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    // Get the first cell
    const firstCell = cells.first();
    await firstCell.click();
    await page.waitForTimeout(300);

    // Click the Reveal Word button
    const wordButton = page.locator('button:has-text("Word")');
    await wordButton.click();
    await page.waitForTimeout(500);

    // Verify multiple cells now have the revealed styling
    // (peach/orange background for revealed cells)
    const revealedCells = page.locator('[class*="bg-[#FFE5B4]"]');
    const count = await revealedCells.count();

    // A word should have at least 2 letters revealed
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Verify all revealed cells are marked appropriately', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    await cells.first().click();
    await page.waitForTimeout(300);

    // Click the Reveal Word button
    const wordButton = page.locator('button:has-text("Word")');
    await wordButton.click();
    await page.waitForTimeout(500);

    // Verify the revealed cells have the peach/orange background
    // The revealed cells should have bg-[#FFE5B4] and border-[#FFA500]
    const revealedCells = page.locator('[class*="bg-[#FFE5B4]"]');
    await expect(revealedCells.first()).toBeVisible();

    // All revealed cells should contain letters
    const count = await revealedCells.count();
    for (let i = 0; i < count; i++) {
      const cell = revealedCells.nth(i);
      const cellText = await cell.locator('span').last().textContent();
      expect(cellText).toBeTruthy();
      expect(cellText?.length).toBeGreaterThan(0);
    }
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

    // Click the Reveal Word button
    const wordButton = page.locator('button:has-text("Word")');
    await wordButton.click();
    await page.waitForTimeout(500);

    // Verify hints counter incremented by 1 (revealing a word counts as 1 hint)
    const newCount = await hintsCounter.textContent();
    expect(newCount).toBe('1');
  });

  test('Take screenshot showing revealed word', async ({ page }) => {
    // Click on an empty cell
    const grid = page.locator('[data-testid="crossword-grid"]');
    const cells = grid.locator('> div > div').filter({
      has: page.locator(':not([class*="bg-[#2A1E5C]"])')
    });

    await cells.first().click();
    await page.waitForTimeout(300);

    // Click the Reveal Word button
    const wordButton = page.locator('button:has-text("Word")');
    await wordButton.click();
    await page.waitForTimeout(500);

    // Take screenshot showing:
    // 1. The revealed word with all letters filled in
    // 2. All cells in the word with different styling (peach/orange background)
    // 3. The hints counter showing 1
    await page.screenshot({ path: 'frontend/tests/PUZZLE-06-revealed-word.png', fullPage: true });
  });
});
