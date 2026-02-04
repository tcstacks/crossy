import { test, expect } from '@playwright/test';

test.describe('PLAY-19: Progress percentage display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and login as guest
    await page.goto('http://localhost:3001/');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Look for guest login button in auth modal
    const guestButton = page.locator('button:has-text("Continue as Guest")');
    if (await guestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await guestButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate to /play and wait for puzzle to load
    await page.goto('http://localhost:3001/play');

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });

    // Wait a bit more for puzzle data to be fully loaded
    await page.waitForTimeout(1000);
  });

  test('should show 0% progress initially and increase as cells are filled', async ({ page }) => {
    // Find the progress indicator
    const progressText = page.locator('text=/Progress/').locator('..').locator('span').last();

    // Verify progress indicator shows 0% initially (or very low if some cells filled)
    const initialProgress = await progressText.textContent();
    console.log('Initial progress:', initialProgress);

    // Should be in format "X%"
    expect(initialProgress).toMatch(/^\d+%$/);

    // Parse the percentage
    const initialPercentage = parseInt(initialProgress!.replace('%', ''));

    // Should start at 0% for a fresh puzzle (or low percentage)
    expect(initialPercentage).toBeLessThanOrEqual(10);

    // Find the first empty cell in the grid
    const gridCells = page.locator('[data-testid="crossword-grid"] button');
    const cellCount = await gridCells.count();

    console.log(`Total cells in grid: ${cellCount}`);

    // Click on the first non-blocked cell to select it
    let cellsToFill = 0;
    for (let i = 0; i < Math.min(cellCount, 20); i++) {
      const cell = gridCells.nth(i);
      const isBlocked = await cell.evaluate((el) => {
        return el.classList.contains('bg-[#2A1E5C]');
      });

      if (!isBlocked) {
        await cell.click();
        await page.keyboard.type('A');
        cellsToFill++;

        // Fill a few cells (3-5 cells should show measurable progress)
        if (cellsToFill >= 5) break;
      }
    }

    console.log(`Filled ${cellsToFill} cells`);

    // Wait for progress to update
    await page.waitForTimeout(500);

    // Get updated progress
    const updatedProgress = await progressText.textContent();
    console.log('Updated progress:', updatedProgress);

    // Verify progress percentage increased
    const updatedPercentage = parseInt(updatedProgress!.replace('%', ''));
    expect(updatedPercentage).toBeGreaterThan(initialPercentage);

    console.log('Progress increased correctly:', {
      initial: initialProgress,
      updated: updatedProgress,
      cellsFilled: cellsToFill
    });

    // Take snapshot showing progress
    await page.screenshot({
      path: 'frontend/tests/PLAY-19-progress-display.png',
      fullPage: true
    });
  });

  test('should display progress bar that fills visually', async ({ page }) => {
    // Find the progress bar container
    const progressBar = page.locator('.h-3.bg-\\[\\#F3F1FF\\].rounded-full');
    await expect(progressBar).toBeVisible();

    // Find the filled portion of the progress bar
    const progressFill = progressBar.locator('.bg-\\[\\#7B61FF\\]');
    await expect(progressFill).toBeVisible();

    // Get the width of the progress fill
    const initialWidth = await progressFill.evaluate((el) => {
      return el.style.width;
    });

    console.log('Initial progress bar width:', initialWidth);

    // Fill some cells
    const gridCells = page.locator('[data-testid="crossword-grid"] button');
    const cellCount = await gridCells.count();

    let cellsToFill = 0;
    for (let i = 0; i < Math.min(cellCount, 20); i++) {
      const cell = gridCells.nth(i);
      const isBlocked = await cell.evaluate((el) => {
        return el.classList.contains('bg-[#2A1E5C]');
      });

      if (!isBlocked) {
        await cell.click();
        await page.keyboard.type('B');
        cellsToFill++;

        if (cellsToFill >= 5) break;
      }
    }

    // Wait for progress bar to update
    await page.waitForTimeout(500);

    // Get updated width
    const updatedWidth = await progressFill.evaluate((el) => {
      return el.style.width;
    });

    console.log('Updated progress bar width:', updatedWidth);

    // The width should have increased (comparing percentages)
    const initialPercent = parseFloat(initialWidth.replace('%', ''));
    const updatedPercent = parseFloat(updatedWidth.replace('%', ''));

    expect(updatedPercent).toBeGreaterThan(initialPercent);

    console.log('Progress bar visual increased:', {
      initial: initialWidth,
      updated: updatedWidth
    });
  });

  test('should show progress label with percentage text', async ({ page }) => {
    // Find the "Progress" label
    const progressLabel = page.locator('text=/Progress/');
    await expect(progressLabel).toBeVisible();

    // Verify it has the correct styling
    const labelColor = await progressLabel.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log('Progress label color:', labelColor);

    // Find the percentage text (should be in the same container)
    const progressContainer = progressLabel.locator('..');
    const percentageText = progressContainer.locator('span').last();

    await expect(percentageText).toBeVisible();

    const percentage = await percentageText.textContent();
    expect(percentage).toMatch(/^\d+%$/);

    console.log('Progress percentage text verified:', percentage);
  });
});
