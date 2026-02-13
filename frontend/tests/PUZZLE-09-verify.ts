import { chromium } from '@playwright/test';

/**
 * Manual verification script for PUZZLE-09
 * This script verifies that the progress percentage updates as cells are filled
 */

async function verifyProgressPercentage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    // Handle guest login if auth modal appears
    const guestButton = page.locator('button:has-text("Continue as Guest")');
    if (await guestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('2. Logging in as guest...');
      await guestButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate to play page
    console.log('3. Navigating to /play...');
    await page.goto('http://localhost:3000/play');
    await page.waitForTimeout(3000);

    // Check if puzzle loaded
    const grid = page.locator('[data-testid="crossword-grid"]');
    if (await grid.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('4. Puzzle loaded successfully!');

      // Find progress percentage
      const progressText = page.locator('text=/Progress/').locator('..').locator('span').last();
      const initialProgress = await progressText.textContent();
      console.log(`5. Initial progress: ${initialProgress}`);

      // Fill some cells
      console.log('6. Filling cells...');
      const gridCells = page.locator('[data-testid="crossword-grid"] button');
      const cellCount = await gridCells.count();

      let filled = 0;
      for (let i = 0; i < Math.min(cellCount, 20); i++) {
        const cell = gridCells.nth(i);
        const isBlocked = await cell.evaluate((el) => {
          return el.classList.contains('bg-[#2A1E5C]');
        });

        if (!isBlocked) {
          await cell.click();
          await page.keyboard.type('A');
          filled++;

          if (filled >= 5) break;
        }
      }

      console.log(`7. Filled ${filled} cells`);
      await page.waitForTimeout(500);

      // Check updated progress
      const updatedProgress = await progressText.textContent();
      console.log(`8. Updated progress: ${updatedProgress}`);

      // Take screenshot
      console.log('9. Taking screenshot...');
      await page.screenshot({
        path: 'frontend/tests/PUZZLE-09-progress-percentage.png',
        fullPage: true
      });

      console.log('\n✅ Verification complete!');
      console.log(`Initial: ${initialProgress} -> Updated: ${updatedProgress}`);

    } else {
      console.error('❌ Puzzle did not load - grid not found');
      await page.screenshot({
        path: 'frontend/tests/PUZZLE-09-error.png',
        fullPage: true
      });
    }

  } catch (error) {
    console.error('Error during verification:', error);
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-09-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

verifyProgressPercentage();
