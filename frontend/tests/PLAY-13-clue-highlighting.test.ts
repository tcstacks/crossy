import { test, expect } from '@playwright/test';

test.describe('PLAY-13: Current clue highlighted in list', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('http://localhost:3001/play');

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });

    // Wait a bit more for puzzle data to be fully loaded
    await page.waitForTimeout(1000);
  });

  test('should highlight the corresponding clue when clicking a cell', async ({ page }) => {
    // Click on a cell to select a word - let's click on the first cell (0,0)
    const firstCell = page.locator('[data-testid="crossword-grid"] > div').first().locator('> div').first();
    await firstCell.click();

    // Wait for the active clue to be set
    await page.waitForTimeout(500);

    // Get the active clue number from the current clue bar
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const buttonText = await acrossButton.textContent();
    const clueNum = buttonText?.match(/(\d+)/)?.[1];

    console.log('Active clue number:', clueNum);

    // Verify the corresponding clue is highlighted in the clue list
    // The highlighted clue should have the purple border style
    const highlightedClue = page.locator('.border-\\[\\#7B61FF\\]').filter({ hasText: `${clueNum}.` }).first();
    await expect(highlightedClue).toBeVisible();

    // Verify it has the highlighted background color
    const bgColor = await highlightedClue.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Highlighted clue background color:', bgColor);

    // Take a snapshot showing the highlighted clue
    await page.screenshot({
      path: 'frontend/tests/PLAY-13-initial-highlight.png',
      fullPage: true
    });
  });

  test('should move highlight to new clue when clicking different word', async ({ page }) => {
    // Click on the first cell
    const firstCell = page.locator('[data-testid="crossword-grid"] > div').first().locator('> div').first();
    await firstCell.click();
    await page.waitForTimeout(500);

    // Get the first active clue number
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const firstClueText = await acrossButton.textContent();
    const firstClueNum = firstClueText?.match(/(\d+)/)?.[1];

    console.log('First clue number:', firstClueNum);

    // Click on a different cell (row 3, col 3 for example)
    const differentCell = page.locator('[data-testid="crossword-grid"] > div').nth(3).locator('> div').nth(3);
    await differentCell.click();
    await page.waitForTimeout(500);

    // Get the new active clue number
    const newClueText = await acrossButton.textContent();
    const newClueNum = newClueText?.match(/(\d+)/)?.[1];

    console.log('New clue number:', newClueNum);

    // Verify the highlight moved to the new clue (if it's a different clue number)
    if (firstClueNum !== newClueNum) {
      const newHighlightedClue = page.locator('.border-\\[\\#7B61FF\\]').filter({ hasText: `${newClueNum}.` }).first();
      await expect(newHighlightedClue).toBeVisible();
    }

    // Take a snapshot showing the moved highlight
    await page.screenshot({
      path: 'frontend/tests/PLAY-13-moved-highlight.png',
      fullPage: true
    });
  });

  test('should highlight clue when switching between across and down', async ({ page }) => {
    // Click on a cell that has both across and down clues
    const cell = page.locator('[data-testid="crossword-grid"] > div').first().locator('> div').first();
    await cell.click();
    await page.waitForTimeout(500);

    // Get the across clue number
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const acrossText = await acrossButton.textContent();
    const acrossNum = acrossText?.match(/(\d+)/)?.[1];

    // Verify across clue is highlighted in the Across tab
    const acrossTab = page.locator('button:has-text("Across")').first();
    await acrossTab.click();
    await page.waitForTimeout(300);

    const highlightedAcross = page.locator('.border-\\[\\#7B61FF\\]').filter({ hasText: `${acrossNum}.` }).first();
    await expect(highlightedAcross).toBeVisible();

    // Click the same cell again to toggle to down
    await cell.click();
    await page.waitForTimeout(500);

    // Get the down clue number
    const downButton = page.locator('button:has-text("DOWN")').first();
    const downText = await downButton.textContent();
    const downNum = downText?.match(/(\d+)/)?.[1];

    // The Down tab should now be automatically selected
    // Verify down clue is highlighted in the Down tab
    const highlightedDown = page.locator('.border-\\[\\#7B61FF\\]').filter({ hasText: `${downNum}.` }).first();
    await expect(highlightedDown).toBeVisible();

    // Take final snapshot
    await page.screenshot({
      path: 'frontend/tests/PLAY-13-down-highlight.png',
      fullPage: true
    });
  });

  test('should highlight clue when clicking on middle of a word', async ({ page }) => {
    // Click on the first cell to establish a word
    const firstCell = page.locator('[data-testid="crossword-grid"] > div').first().locator('> div').first();
    await firstCell.click();
    await page.waitForTimeout(500);

    // Get the clue number
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const clueText = await acrossButton.textContent();
    const clueNum = clueText?.match(/(\d+)/)?.[1];

    // Click on a different cell in the same row (middle of the word)
    const middleCell = page.locator('[data-testid="crossword-grid"] > div').first().locator('> div').nth(2);
    await middleCell.click();
    await page.waitForTimeout(500);

    // Verify the same clue is still highlighted
    const highlightedClue = page.locator('.border-\\[\\#7B61FF\\]').filter({ hasText: `${clueNum}.` }).first();
    await expect(highlightedClue).toBeVisible();

    // Take a snapshot
    await page.screenshot({
      path: 'frontend/tests/PLAY-13-middle-cell-highlight.png',
      fullPage: true
    });
  });
});
