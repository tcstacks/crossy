import { test, expect } from '@playwright/test';

test.describe('PLAY-12 - Click clue to jump to word', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('http://localhost:3000/play');

    // Wait for puzzle to load - wait for the grid to appear
    await page.waitForSelector('.grid', { timeout: 15000 });
  });

  test('should navigate to Across word when clicking Across clue', async ({ page }) => {
    // Click on the Across tab to ensure we're viewing Across clues
    await page.click('button:has-text("Across")');

    // Wait for clues to be visible
    await page.waitForSelector('button:has-text(".")', { timeout: 5000 });

    // Get the first clue in the Across list
    const firstAcrossClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstAcrossClue.waitFor({ state: 'visible' });

    // Extract the clue number from the text
    const clueText = await firstAcrossClue.textContent();
    const clueNumber = clueText?.match(/^(\d+)\./)?.[1];

    console.log('Clicking Across clue:', clueNumber);

    // Click the clue
    await firstAcrossClue.click();

    // Wait a moment for the state to update
    await page.waitForTimeout(500);

    // Verify that the direction is set to Across (check the active button in the top bar)
    const acrossButton = page.locator('button:has-text("ACROSS")').first();
    const isAcrossActive = await acrossButton.evaluate((el) => {
      return el.className.includes('bg-white');
    });
    expect(isAcrossActive).toBe(true);

    // Verify that a cell is selected (highlighted in purple)
    const selectedCell = page.locator('[class*="bg-[#7B61FF]"]').first();
    await expect(selectedCell).toBeVisible();

    // Take a snapshot
    await page.screenshot({ path: 'frontend/tests/PLAY-12-across-navigation.png' });
  });

  test('should navigate to Down word when clicking Down clue', async ({ page }) => {
    // Click on the Down tab
    await page.click('button:has-text("Down")');

    // Wait for clues to be visible
    await page.waitForSelector('button:has-text(".")', { timeout: 5000 });

    // Get the first clue in the Down list
    const firstDownClue = page.locator('[class*="rounded-xl"]').filter({ hasText: /^\d+\./ }).first();
    await firstDownClue.waitFor({ state: 'visible' });

    // Extract the clue number from the text
    const clueText = await firstDownClue.textContent();
    const clueNumber = clueText?.match(/^(\d+)\./)?.[1];

    console.log('Clicking Down clue:', clueNumber);

    // Click the clue
    await firstDownClue.click();

    // Wait a moment for the state to update
    await page.waitForTimeout(500);

    // Verify that the direction is set to Down (check the active button in the top bar)
    const downButton = page.locator('button:has-text("DOWN")').first();
    const isDownActive = await downButton.evaluate((el) => {
      return el.className.includes('bg-white');
    });
    expect(isDownActive).toBe(true);

    // Verify that a cell is selected (highlighted in purple)
    const selectedCell = page.locator('[class*="bg-[#7B61FF]"]').first();
    await expect(selectedCell).toBeVisible();

    // Take a snapshot
    await page.screenshot({ path: 'frontend/tests/PLAY-12-down-navigation.png' });
  });

  test('should switch between Across and Down when clicking different clues', async ({ page }) => {
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

    await page.screenshot({ path: 'frontend/tests/PLAY-12-before-switch.png' });

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

    await page.screenshot({ path: 'frontend/tests/PLAY-12-after-switch.png' });
  });
});
