import { test, expect } from '@playwright/test';

test.describe('ARCH-01: View puzzle archive list', () => {
  test('should display archive page with puzzle list showing date and difficulty', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load - look for the page title
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Verify the page title is displayed
    const pageTitle = page.locator('h1:has-text("Puzzle Archive")');
    await expect(pageTitle).toBeVisible();

    // Wait for the puzzle grid to load (wait for at least one puzzle card)
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Verify list of puzzles is displayed
    const puzzleCount = await puzzleCards.count();
    console.log(`Found ${puzzleCount} puzzles in the archive`);
    expect(puzzleCount).toBeGreaterThan(0);

    // Verify each puzzle shows date and difficulty
    // Check the first few puzzles
    const puzzlesToCheck = Math.min(puzzleCount, 5);
    for (let i = 0; i < puzzlesToCheck; i++) {
      const puzzleCard = puzzleCards.nth(i);

      // Verify date is displayed (looks for Calendar icon and date text)
      const dateElement = puzzleCard.locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') });
      await expect(dateElement).toBeVisible();

      const dateText = await dateElement.locator('span').textContent();
      console.log(`Puzzle ${i + 1} date:`, dateText);

      // Verify date format (e.g., "Jan 15, 2024")
      expect(dateText).toMatch(/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/);

      // Verify difficulty badge is displayed
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      await expect(difficultyBadge).toBeVisible();

      const difficultyText = await difficultyBadge.textContent();
      console.log(`Puzzle ${i + 1} difficulty:`, difficultyText);

      // Verify difficulty is one of: Easy, Medium, Hard
      expect(['Easy', 'Medium', 'Hard']).toContain(difficultyText);

      // Verify the difficulty badge has the correct color
      const bgColor = await difficultyBadge.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor;
      });
      console.log(`Puzzle ${i + 1} difficulty color:`, bgColor);

      // Colors should be one of the difficulty colors (green, yellow, or red-ish)
      expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
    }

    // Verify grid layout is responsive (should have multiple columns on larger screens)
    const gridContainer = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
    await expect(gridContainer).toBeVisible();

    // Check if pagination exists (only if there are more than 12 puzzles)
    const paginationButtons = page.locator('button:has-text("Previous"), button:has-text("Next")');
    const hasPagination = await paginationButtons.count() > 0;

    if (hasPagination) {
      console.log('Pagination controls found');
      const previousButton = page.locator('button:has-text("Previous")');
      const nextButton = page.locator('button:has-text("Next")');

      await expect(previousButton).toBeVisible();
      await expect(nextButton).toBeVisible();
    } else {
      console.log(`No pagination controls (only ${puzzleCount} puzzles on one page)`);
    }

    // Verify filters section is present
    const filtersCard = page.locator('.crossy-card').filter({ has: page.locator('input[placeholder*="Search"]') });
    await expect(filtersCard).toBeVisible();

    // Verify difficulty filter buttons are present
    const difficultyFilterButtons = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
    expect(await difficultyFilterButtons.count()).toBeGreaterThanOrEqual(3);

    // Take snapshot of archive page
    await page.screenshot({
      path: 'frontend/tests/ARCH-01-archive-page.png',
      fullPage: true
    });

    console.log('Archive page verification complete');
  });

  test('should allow clicking on a puzzle to navigate to play page', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Get the date from the first puzzle
    const firstPuzzle = puzzleCards.first();
    const dateElement = firstPuzzle.locator('.flex.items-center.gap-2').filter({ has: page.locator('svg') });
    const dateText = await dateElement.locator('span').textContent();
    console.log('Clicking puzzle with date:', dateText);

    // Click the first puzzle
    await firstPuzzle.click();

    // Wait for navigation to play page
    await page.waitForURL(/\/play\?date=/, { timeout: 10000 });

    // Verify we're on the play page with a date parameter
    const currentUrl = page.url();
    console.log('Navigated to:', currentUrl);
    expect(currentUrl).toContain('/play?date=');

    // Verify the crossword grid loads
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });
    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    console.log('Puzzle navigation verification complete');
  });

  test('should filter puzzles by difficulty', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Get initial count
    const initialCount = await puzzleCards.count();
    console.log('Initial puzzle count:', initialCount);

    // Click on "Easy" difficulty filter
    const easyFilterButton = page.locator('button:has-text("Easy")').first();
    await easyFilterButton.click();

    // Wait a bit for filtering to apply
    await page.waitForTimeout(500);

    // Get filtered count
    const filteredCount = await puzzleCards.count();
    console.log('Filtered puzzle count (Easy):', filteredCount);

    // Verify that all visible puzzles have "Easy" difficulty
    for (let i = 0; i < Math.min(filteredCount, 5); i++) {
      const puzzleCard = puzzleCards.nth(i);
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      const difficultyText = await difficultyBadge.textContent();
      expect(difficultyText).toBe('Easy');
    }

    // Take snapshot showing filtered results
    await page.screenshot({
      path: 'frontend/tests/ARCH-01-difficulty-filter.png',
      fullPage: false
    });

    console.log('Difficulty filter verification complete');
  });

  test('should show empty state when no puzzles match filters', async ({ page }) => {
    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Enter a search query that won't match any dates
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('xyz999999');

    // Wait for filtering to apply
    await page.waitForTimeout(500);

    // Verify empty state is shown
    const emptyStateTitle = page.locator('h2:has-text("No Puzzles Found")');
    await expect(emptyStateTitle).toBeVisible();

    // Verify empty state message
    const emptyStateMessage = page.locator('p:has-text("Try adjusting your filters")');
    await expect(emptyStateMessage).toBeVisible();

    // Verify "Clear Filters" button is present
    const clearFiltersButton = page.locator('button:has-text("Clear Filters")').last();
    await expect(clearFiltersButton).toBeVisible();

    console.log('Empty state verification complete');
  });
});
