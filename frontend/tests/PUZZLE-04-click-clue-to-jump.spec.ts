import { test, expect } from '@playwright/test';

test.describe('PUZZLE-04 - Click clue to jump to word', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('http://localhost:3000/play');

    // Wait for puzzle to load - wait for the grid container to appear
    await page.waitForSelector('[class*="grid"]', { timeout: 15000 });

    // Also wait for clues to be loaded
    await page.waitForTimeout(1000);
  });

  test('Complete PUZZLE-01 to load puzzle', async ({ page }) => {
    // Verify puzzle elements are visible
    const grid = page.locator('[class*="grid"]').first();
    await expect(grid).toBeVisible();

    // Verify clues panel exists
    const cluesPanel = page.locator('.crossy-card').first();
    await expect(cluesPanel).toBeVisible();
  });

  test('Click on Across clue and verify navigation', async ({ page }) => {
    // Click on the Across tab to ensure we're viewing Across clues
    const acrossTab = page.locator('button:has-text("Across")');
    await acrossTab.click();
    await page.waitForTimeout(300);

    // Wait for clues to be visible and get the first clue
    const firstAcrossClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstAcrossClue.waitFor({ state: 'visible' });

    // Extract the clue number
    const clueText = await firstAcrossClue.textContent();
    const clueNumber = clueText?.match(/^(\d+)\./)?.[1];
    console.log(`Clicking Across clue: ${clueNumber}`);

    // Click the clue
    await firstAcrossClue.click();
    await page.waitForTimeout(500);

    // Verify the first cell of that word is selected (has purple background)
    const selectedCell = page.locator('[class*="bg-[#7B61FF]"]').first();
    await expect(selectedCell).toBeVisible();

    // Verify direction is set to 'Across' (check the active button in the top bar)
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const isAcrossActive = await acrossButton.evaluate((el) => {
      return el.className.includes('bg-white');
    });
    expect(isAcrossActive).toBe(true);

    // Take screenshot
    await page.screenshot({ path: 'frontend/tests/PUZZLE-04-across-navigation.png', fullPage: true });
  });

  test('Click on Down clue and verify navigation', async ({ page }) => {
    // Click on the Down tab
    const downTab = page.locator('button:has-text("Down")');
    await downTab.click();
    await page.waitForTimeout(300);

    // Wait for clues to be visible and get the first clue
    const firstDownClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstDownClue.waitFor({ state: 'visible' });

    // Extract the clue number
    const clueText = await firstDownClue.textContent();
    const clueNumber = clueText?.match(/^(\d+)\./)?.[1];
    console.log(`Clicking Down clue: ${clueNumber}`);

    // Click the clue
    await firstDownClue.click();
    await page.waitForTimeout(500);

    // Verify selection jumps to first cell of that word (has purple background)
    const selectedCell = page.locator('[class*="bg-[#7B61FF]"]').first();
    await expect(selectedCell).toBeVisible();

    // Verify direction changes to 'Down' (check the active button in the top bar)
    const downButton = page.locator('button:has-text("DOWN")').first();
    const isDownActive = await downButton.evaluate((el) => {
      return el.className.includes('bg-white');
    });
    expect(isDownActive).toBe(true);

    // Take screenshot showing navigation
    await page.screenshot({ path: 'frontend/tests/PUZZLE-04-down-navigation.png', fullPage: true });
  });

  test('Verify switching between Across and Down clues', async ({ page }) => {
    // First, click an Across clue
    await page.click('button:has-text("Across")');
    await page.waitForTimeout(300);

    const firstAcrossClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstAcrossClue.click();
    await page.waitForTimeout(500);

    // Verify Across is active
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    let isAcrossActive = await acrossButton.evaluate((el) => el.className.includes('bg-white'));
    expect(isAcrossActive).toBe(true);

    // Now click a Down clue
    await page.click('button:has-text("Down")');
    await page.waitForTimeout(300);

    const firstDownClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstDownClue.click();
    await page.waitForTimeout(500);

    // Verify Down is now active
    const downButton = page.locator('button:has-text("DOWN")').first();
    const isDownActive = await downButton.evaluate((el) => el.className.includes('bg-white'));
    expect(isDownActive).toBe(true);

    // Take final screenshot
    await page.screenshot({ path: 'frontend/tests/PUZZLE-04-direction-switch.png', fullPage: true });
  });
});
