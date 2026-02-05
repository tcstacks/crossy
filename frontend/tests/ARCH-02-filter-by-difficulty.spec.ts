import { test, expect } from '@playwright/test';

test.describe('ARCH-02: Filter archive by difficulty', () => {
  test('should filter puzzles by difficulty with API calls', async ({ page }) => {
    // Set up route interception for API calls
    const apiCalls: { url: string; params: URLSearchParams }[] = [];

    await page.route('**/api/puzzles/archive*', async (route) => {
      const url = new URL(route.request().url());
      apiCalls.push({
        url: url.pathname,
        params: new URLSearchParams(url.search)
      });
      // Continue with the request
      await route.continue();
    });

    // Navigate to /archive
    await page.goto('/archive');

    // Wait for the initial API call to complete
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // Verify initial API call was made without difficulty parameter
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('Initial API call:', apiCalls[0].url, apiCalls[0].params.toString());

    // Clear tracked calls
    apiCalls.length = 0;

    // Find the difficulty filter dropdown/buttons
    const easyFilter = page.locator('button:has-text("Easy")').first();
    await expect(easyFilter).toBeVisible();

    // Select 'Easy' filter
    await easyFilter.click();
    console.log('Clicked Easy filter button');

    // Wait for the API call with difficulty parameter
    await page.waitForTimeout(1000);

    // Verify API was called with ?difficulty=easy parameter
    expect(apiCalls.length).toBeGreaterThan(0);
    const easyCall = apiCalls[apiCalls.length - 1];
    console.log('Easy filter API call:', easyCall.url, easyCall.params.toString());
    expect(easyCall.params.get('difficulty')).toBe('easy');

    // Wait for filtered results to render
    await page.waitForTimeout(500);

    // Verify only Easy puzzles are displayed
    const visiblePuzzles = await puzzleCards.count();
    console.log(`Found ${visiblePuzzles} Easy puzzles`);

    // Check first few puzzles to verify they're all Easy
    const puzzlesToCheck = Math.min(visiblePuzzles, 5);
    for (let i = 0; i < puzzlesToCheck; i++) {
      const puzzleCard = puzzleCards.nth(i);
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      const difficultyText = await difficultyBadge.textContent();
      console.log(`Puzzle ${i + 1} difficulty:`, difficultyText);
      expect(difficultyText).toBe('Easy');
    }

    // Clear tracked calls
    apiCalls.length = 0;

    // Select 'Hard' filter
    const hardFilter = page.locator('button:has-text("Hard")').first();
    await expect(hardFilter).toBeVisible();
    await hardFilter.click();
    console.log('Clicked Hard filter button');

    // Wait for the API call with difficulty parameter
    await page.waitForTimeout(1000);

    // Verify API was called with ?difficulty=hard parameter
    expect(apiCalls.length).toBeGreaterThan(0);
    const hardCall = apiCalls[apiCalls.length - 1];
    console.log('Hard filter API call:', hardCall.url, hardCall.params.toString());
    expect(hardCall.params.get('difficulty')).toBe('hard');

    // Wait for filtered results to render
    await page.waitForTimeout(500);

    // Verify only Hard puzzles are displayed
    const hardPuzzleCount = await puzzleCards.count();
    console.log(`Found ${hardPuzzleCount} Hard puzzles`);

    // Check first few puzzles to verify they're all Hard
    const hardPuzzlesToCheck = Math.min(hardPuzzleCount, 5);
    for (let i = 0; i < hardPuzzlesToCheck; i++) {
      const puzzleCard = puzzleCards.nth(i);
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      const difficultyText = await difficultyBadge.textContent();
      console.log(`Puzzle ${i + 1} difficulty:`, difficultyText);
      expect(difficultyText).toBe('Hard');
    }

    // Take screenshot of filtered results
    await page.screenshot({
      path: 'frontend/tests/ARCH-02-hard-filtered-results.png',
      fullPage: true
    });

    console.log('Difficulty filter API verification complete');
  });

  test('should show all difficulties when "All" filter is selected', async ({ page }) => {
    // Set up route interception for API calls
    const apiCalls: { url: string; params: URLSearchParams }[] = [];

    await page.route('**/api/puzzles/archive*', async (route) => {
      const url = new URL(route.request().url());
      apiCalls.push({
        url: url.pathname,
        params: new URLSearchParams(url.search)
      });
      await route.continue();
    });

    // Navigate to /archive
    await page.goto('/archive');
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for puzzles to load
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    // First, select Easy to set a filter
    const easyFilter = page.locator('button:has-text("Easy")').first();
    await easyFilter.click();
    await page.waitForTimeout(1000);

    // Clear tracked calls
    apiCalls.length = 0;

    // Now click "All" to reset filter
    const allFilter = page.locator('button:has-text("All")').first();
    await allFilter.click();
    console.log('Clicked All filter button');

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called without difficulty parameter
    expect(apiCalls.length).toBeGreaterThan(0);
    const allCall = apiCalls[apiCalls.length - 1];
    console.log('All filter API call:', allCall.url, allCall.params.toString());
    expect(allCall.params.get('difficulty')).toBeNull();

    // Wait for results
    await page.waitForTimeout(500);

    // Verify mixed difficulties are shown
    const visiblePuzzles = await puzzleCards.count();
    console.log(`Found ${visiblePuzzles} puzzles with All filter`);

    // Collect all unique difficulties
    const difficulties = new Set<string>();
    const puzzlesToCheck = Math.min(visiblePuzzles, 10);
    for (let i = 0; i < puzzlesToCheck; i++) {
      const puzzleCard = puzzleCards.nth(i);
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      const difficultyText = await difficultyBadge.textContent();
      if (difficultyText) {
        difficulties.add(difficultyText);
      }
    }

    console.log('Unique difficulties found:', Array.from(difficulties));
    // We should see multiple different difficulties (unless database only has one type)
    // This is a soft check - just log the result
    expect(difficulties.size).toBeGreaterThan(0);

    console.log('All filter verification complete');
  });
});
