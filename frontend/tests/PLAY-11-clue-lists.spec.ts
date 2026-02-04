import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('PLAY-11 - Across and Down clue lists', () => {
  test('should display both Across and Down clue lists', async ({ page }) => {
    // Navigate to /play and wait for puzzle to load
    await page.goto('http://localhost:3000/play');

    // Wait for the puzzle to load (wait for grid to be visible)
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 });

    // Wait a bit more for clues to populate
    await page.waitForTimeout(2000);

    // Verify Across clue list is visible with numbered clues
    // Look for the Across tab button - use more specific selector
    const acrossTab = page.locator('button').filter({ hasText: /^Across/ });
    await expect(acrossTab.first()).toBeVisible();

    // Click on Across tab to ensure it's active
    await acrossTab.first().click();
    await page.waitForTimeout(500);

    // Verify there are numbered clues visible
    const acrossClues = page.locator('button').filter({ hasText: /^\d+\./ });
    const acrossClueCount = await acrossClues.count();
    expect(acrossClueCount).toBeGreaterThan(0);

    console.log(`Found ${acrossClueCount} Across clues`);

    // Verify Down clue list is visible with numbered clues
    const downTab = page.locator('button').filter({ hasText: /^Down/ });
    await expect(downTab.first()).toBeVisible();

    // Click on Down tab
    await downTab.first().click();
    await page.waitForTimeout(500);

    // Verify there are numbered clues visible
    const downClues = page.locator('button').filter({ hasText: /^\d+\./ });
    const downClueCount = await downClues.count();
    expect(downClueCount).toBeGreaterThan(0);

    console.log(`Found ${downClueCount} Down clues`);

    // Take snapshot showing both clue lists
    // First, take a screenshot with Across clues visible
    await acrossTab.first().click();
    await page.waitForTimeout(500);

    const screenshotDir = path.join(process.cwd(), 'tests');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(screenshotDir, 'PLAY-11-across-clues.png'),
      fullPage: true
    });

    // Take a screenshot with Down clues visible
    await downTab.first().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotDir, 'PLAY-11-down-clues.png'),
      fullPage: true
    });

    // Take a text snapshot of the page structure
    const pageContent = await page.content();
    const snapshotPath = path.join(screenshotDir, 'PLAY-11-snapshot.html');
    fs.writeFileSync(snapshotPath, pageContent);

    console.log('Screenshots and snapshot saved to:', screenshotDir);

    // Additional verification: Check that clues have proper structure (number + text)
    await acrossTab.first().click();
    await page.waitForTimeout(500);

    const firstAcrossClue = acrossClues.first();
    const clueText = await firstAcrossClue.textContent();
    expect(clueText).toMatch(/^\d+\./); // Should start with a number followed by a period

    console.log(`Sample Across clue: ${clueText}`);
  });
});
