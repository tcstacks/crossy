import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to /play...');
    await page.goto('http://localhost:3001/play', { waitUntil: 'networkidle' });

    console.log('2. Waiting for grid to load...');
    await page.waitForTimeout(5000); // Wait for API and rendering

    console.log('3. Taking initial screenshot...');
    await page.screenshot({ path: 'frontend/tests/PLAY-12-initial.png', fullPage: true });

    console.log('4. Clicking Across tab...');
    const acrossTab = page.locator('button', { hasText: /Across \(\d+\)/ }).first();
    await acrossTab.click();
    await page.waitForTimeout(500);

    console.log('5. Finding and clicking first Across clue...');
    // Find the first clue button (has a number followed by a period)
    const firstAcrossClue = page.locator('button').filter({ hasText: /^\s*\d+\./ }).first();
    const clueVisible = await firstAcrossClue.isVisible().catch(() => false);

    if (clueVisible) {
      const clueText = await firstAcrossClue.textContent();
      console.log('   First clue:', clueText?.substring(0, 50));

      await firstAcrossClue.click();
      await page.waitForTimeout(1000);

      console.log('6. Taking screenshot after Across clue click...');
      await page.screenshot({ path: 'frontend/tests/PLAY-12-across-clicked.png', fullPage: true });

      console.log('7. Clicking Down tab...');
      const downTab = page.locator('button', { hasText: /Down \(\d+\)/ }).first();
      await downTab.click();
      await page.waitForTimeout(500);

      console.log('8. Finding and clicking first Down clue...');
      const firstDownClue = page.locator('button').filter({ hasText: /^\s*\d+\./ }).first();
      const downClueText = await firstDownClue.textContent();
      console.log('   First Down clue:', downClueText?.substring(0, 50));

      await firstDownClue.click();
      await page.waitForTimeout(1000);

      console.log('9. Taking screenshot after Down clue click...');
      await page.screenshot({ path: 'frontend/tests/PLAY-12-down-clicked.png', fullPage: true });

      console.log('\n✓ Manual verification complete!');
      console.log('Screenshots saved to frontend/tests/');
      console.log('- PLAY-12-initial.png');
      console.log('- PLAY-12-across-clicked.png');
      console.log('- PLAY-12-down-clicked.png');
    } else {
      console.log('ERROR: Could not find clue buttons. Taking debug screenshot...');
      await page.screenshot({ path: 'frontend/tests/PLAY-12-debug.png', fullPage: true });
    }
  } catch (error) {
    console.error('Error during verification:', error.message);
    await page.screenshot({ path: 'frontend/tests/PLAY-12-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
