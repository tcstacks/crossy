import { test, expect } from '@playwright/test';

/**
 * ARCH-04: Play puzzle from archive
 *
 * As a user, I can click a puzzle in the archive to play it
 *
 * Acceptance Criteria:
 * - Navigate to /archive
 * - Click on a puzzle card
 * - Intercept API call to GET /api/puzzles/:date
 * - Verify navigation to /play?date=YYYY-MM-DD
 * - Verify API returns 200 with puzzle data
 * - Verify the selected puzzle loads in the grid
 * - Take screenshot of loaded archive puzzle
 */

test.describe('ARCH-04: Play puzzle from archive', () => {
  test('should navigate to play page and load puzzle from archive', async ({ page }) => {
    // Track API calls
    const apiCalls: Array<{ url: string, status: number, response: any }> = [];
    let puzzleByDateCall: { url: string, status: number, response: any } | null = null;

    page.on('response', async (response) => {
      const url = response.url();

      // Track archive API calls
      if (url.includes('/api/puzzles/archive')) {
        try {
          const data = await response.json();
          apiCalls.push({
            url,
            status: response.status(),
            response: data
          });
        } catch (e) {
          console.error('Failed to parse archive response:', e);
        }
      }

      // Track puzzle by date API calls (format: /api/puzzles/YYYY-MM-DD)
      const puzzleDateMatch = url.match(/\/api\/puzzles\/(\d{4}-\d{2}-\d{2})/);
      if (puzzleDateMatch) {
        try {
          const data = await response.json();
          puzzleByDateCall = {
            url,
            status: response.status(),
            response: data
          };
          console.log('Puzzle API call intercepted:', {
            url,
            status: response.status(),
            date: puzzleDateMatch[1]
          });
        } catch (e) {
          console.error('Failed to parse puzzle response:', e);
        }
      }
    });

    // Navigate to /archive
    console.log('Navigating to /archive...');
    await page.goto('http://localhost:3000/archive');

    // Wait for archive page to load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });
    console.log('✅ Archive page loaded');

    // Check if there are puzzle cards or empty state
    const emptyState = page.locator('text=No Puzzles Found');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      console.log('⚠️  No puzzles found in archive - database needs to be seeded');
      console.log('To populate the database, run:');
      console.log('  cd backend && go run cmd/admin/main.go import ./test-puzzles/batch1/');
      console.log('  cd backend && go run cmd/admin/main.go publish -id <UUID> -date 2026-01-20');
      test.skip();
      return;
    }

    // Wait for puzzle cards to be visible
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    const cardCount = await puzzleCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✅ ${cardCount} puzzle cards visible`);

    // Get the date from the first puzzle card to verify it later
    const firstCard = puzzleCards.first();
    const dateElement = firstCard.locator('.flex.items-center.gap-2').filter({
      has: page.locator('svg')
    }).first();
    const dateText = await dateElement.locator('span').textContent();
    console.log(`First puzzle date: ${dateText}`);

    // Click on the first puzzle card
    console.log('Clicking on first puzzle card...');
    await firstCard.click();

    // Verify navigation to /play?date=YYYY-MM-DD
    await page.waitForURL(/\/play\?date=\d{4}-\d{2}-\d{2}/, { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`✅ Navigated to: ${currentUrl}`);

    // Extract date from URL
    const urlMatch = currentUrl.match(/date=(\d{4}-\d{2}-\d{2})/);
    expect(urlMatch).toBeTruthy();
    const urlDate = urlMatch![1];
    console.log(`Date parameter in URL: ${urlDate}`);

    // Wait for puzzle API call to complete
    await page.waitForTimeout(2000); // Give API time to respond

    // Verify API call to GET /api/puzzles/:date was made
    expect(puzzleByDateCall).toBeTruthy();
    expect(puzzleByDateCall?.status).toBe(200);
    console.log('✅ API call to GET /api/puzzles/:date returned 200');

    // Verify the API response contains puzzle data
    expect(puzzleByDateCall?.response).toBeTruthy();
    expect(puzzleByDateCall?.response.id).toBeDefined();
    expect(puzzleByDateCall?.response.date).toBeDefined();
    expect(puzzleByDateCall?.response.grid).toBeDefined();
    expect(puzzleByDateCall?.response.clues).toBeDefined();

    console.log('Puzzle data:', {
      id: puzzleByDateCall?.response.id,
      date: puzzleByDateCall?.response.date,
      difficulty: puzzleByDateCall?.response.difficulty,
      gridSize: `${puzzleByDateCall?.response.grid?.length}x${puzzleByDateCall?.response.grid?.[0]?.length}`
    });
    console.log('✅ Puzzle data validated');

    // Wait for the gameplay page to load and render the grid
    await page.waitForSelector('.grid', { timeout: 10000 });
    console.log('✅ Gameplay page loaded');

    // Verify the puzzle grid is displayed
    const gridCells = page.locator('[data-testid="grid-cell"]');
    const cellCount = await gridCells.count();
    expect(cellCount).toBeGreaterThan(0);
    console.log(`✅ Grid rendered with ${cellCount} cells`);

    // Verify clues are displayed
    const cluesSection = page.locator('text=/Across|Down/');
    await expect(cluesSection.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Clues section visible');

    // Verify the puzzle matches the one we clicked on
    // The date in the API response should match the URL parameter
    expect(puzzleByDateCall?.response.date).toContain(urlDate);
    console.log('✅ Loaded puzzle matches the selected date');

    // Take screenshot of loaded archive puzzle
    await page.screenshot({
      path: 'frontend/tests/ARCH-04-archive-puzzle-loaded.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: ARCH-04-archive-puzzle-loaded.png');

    console.log('✅ All acceptance criteria verified!');
  });

  test('should handle clicking different puzzle cards', async ({ page }) => {
    // Track puzzle API calls
    const puzzleApiCalls: Array<{ date: string, status: number }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      const puzzleDateMatch = url.match(/\/api\/puzzles\/(\d{4}-\d{2}-\d{2})/);

      if (puzzleDateMatch) {
        puzzleApiCalls.push({
          date: puzzleDateMatch[1],
          status: response.status()
        });
      }
    });

    // Navigate to archive
    await page.goto('http://localhost:3000/archive');
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    const puzzleCards = page.locator('button.crossy-card');
    const cardCount = await puzzleCards.count();

    // Test clicking up to 3 different puzzles
    const testsToRun = Math.min(cardCount, 3);

    for (let i = 0; i < testsToRun; i++) {
      // Go back to archive if not on first iteration
      if (i > 0) {
        await page.goto('http://localhost:3000/archive');
        await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });
      }

      // Get the card and its date
      const card = puzzleCards.nth(i);
      const dateElement = card.locator('.flex.items-center.gap-2').filter({
        has: page.locator('svg')
      }).first();
      const dateText = await dateElement.locator('span').textContent();

      console.log(`Testing puzzle ${i + 1}: ${dateText}`);

      // Click the card
      await card.click();

      // Verify navigation
      await page.waitForURL(/\/play\?date=\d{4}-\d{2}-\d{2}/, { timeout: 10000 });

      // Wait for grid to load
      await page.waitForSelector('.grid', { timeout: 10000 });

      console.log(`✅ Puzzle ${i + 1} loaded successfully`);
    }

    // Verify all API calls were successful
    expect(puzzleApiCalls.length).toBeGreaterThanOrEqual(testsToRun);
    puzzleApiCalls.forEach((call, index) => {
      expect(call.status).toBe(200);
      console.log(`API call ${index + 1}: ${call.date} - Status ${call.status}`);
    });

    console.log('✅ Successfully tested multiple puzzle loads from archive');
  });
});
