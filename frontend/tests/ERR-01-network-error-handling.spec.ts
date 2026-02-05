import { test, expect } from '@playwright/test';

test.describe('ERR-01: Network error handling', () => {
  test('should display error message and retry option on network failure', async ({ page }) => {
    // Step 1: Set up route interception to simulate network failure for API calls
    let shouldFailNetwork = true;
    await page.route('**/api/puzzles/**', (route) => {
      if (shouldFailNetwork) {
        console.log('✓ Intercepted API call, simulating network failure');
        route.abort('failed');
      } else {
        console.log('✓ Intercepted API call, allowing request to proceed');
        route.continue();
      }
    });

    // Step 2: Navigate to /play (this will trigger the API call which will fail)
    await page.goto('/play');
    console.log('✓ Navigated to /play');

    // Step 3: Wait for the error state to appear
    await page.waitForSelector('text=Oops! Something went wrong', { timeout: 10000 });
    console.log('✓ Error state detected');

    // Step 4: Verify error message is displayed
    const errorHeading = page.locator('h2:has-text("Oops! Something went wrong")');
    await expect(errorHeading).toBeVisible({ timeout: 5000 });
    console.log('✓ Error heading displayed');

    // Verify error message content (should show network-related error)
    const errorText = page.locator('p.font-display.text-\\[\\#6B5CA8\\]');
    await expect(errorText).toBeVisible({ timeout: 5000 });
    const errorContent = await errorText.textContent();
    console.log(`✓ Error message displayed: "${errorContent}"`);

    // Step 5: Verify retry option is available
    const retryButton = page.locator('button:has-text("Try Again")');
    await expect(retryButton).toBeVisible({ timeout: 5000 });
    console.log('✓ Retry button is visible');

    // Verify the retry button has the refresh icon
    const refreshIcon = retryButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
    console.log('✓ Retry button has refresh icon');

    // Step 6: Take screenshot of error state
    await page.screenshot({
      path: 'tests/ERR-01-network-error.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: ERR-01-network-error.png');

    // Step 7: Re-enable network (stop failing API calls)
    shouldFailNetwork = false;
    console.log('✓ Network re-enabled (API calls will now succeed)');

    // Step 8: Click retry
    await retryButton.click();
    console.log('✓ Clicked retry button');

    // Step 9: Verify puzzle loads successfully
    // Wait for the loading state to appear and then disappear
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 15000 });
    console.log('✓ Puzzle grid appeared');

    // Verify the error message is gone
    await expect(errorHeading).not.toBeVisible();
    console.log('✓ Error message cleared');

    // Verify the puzzle title is displayed
    const puzzleTitle = page.locator('h1.font-display').first();
    await expect(puzzleTitle).toBeVisible({ timeout: 5000 });
    const titleText = await puzzleTitle.textContent();
    console.log(`✓ Puzzle title displayed: "${titleText}"`);

    // Verify the grid is interactive
    const grid = page.locator('[data-testid="crossword-grid"]');
    await expect(grid).toBeVisible();
    console.log('✓ Crossword grid is visible and loaded');

    // Take screenshot of successful state
    await page.screenshot({
      path: 'tests/ERR-01-network-success.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: ERR-01-network-success.png');

    console.log('\n✅ ERR-01: Network error handling test PASSED - All acceptance criteria met');
  });
});
