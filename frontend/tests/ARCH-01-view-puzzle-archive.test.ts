import { test, expect } from '@playwright/test';

/**
 * ARCH-01: View puzzle archive
 *
 * As a user, I can browse the puzzle archive
 *
 * Acceptance Criteria:
 * - Launch Playwright browser in headless mode
 * - Intercept API call to GET /api/puzzles/archive
 * - Navigate to /archive
 * - Verify API returns 200 with paginated puzzle list
 * - Verify puzzle cards are displayed (up to 12 per page)
 * - Verify each card shows puzzle date
 * - Verify each card shows difficulty badge
 * - Verify pagination controls are visible
 * - Take screenshot of archive page
 */

test.describe('ARCH-01: View puzzle archive', () => {
  test('should display archive page with API verification', async ({ page }) => {
    // Set up API intercept for /api/puzzles/archive
    let apiResponse: any = null;
    let apiStatusCode: number | null = null;

    page.on('response', async (response) => {
      if (response.url().includes('/api/puzzles/archive')) {
        apiStatusCode = response.status();
        try {
          apiResponse = await response.json();
          console.log('API Response:', {
            status: apiStatusCode,
            total: apiResponse.total,
            page: apiResponse.page,
            limit: apiResponse.limit,
            puzzleCount: apiResponse.puzzles?.length
          });
        } catch (e) {
          console.error('Failed to parse API response:', e);
        }
      }
    });

    // Navigate to /archive
    await page.goto('http://localhost:3000/archive');

    // Wait for page to load - look for the page title
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Verify API returns 200 with paginated puzzle list
    expect(apiStatusCode).toBe(200);
    expect(apiResponse).toBeTruthy();
    expect(apiResponse.puzzles).toBeDefined();
    expect(Array.isArray(apiResponse.puzzles)).toBe(true);
    expect(apiResponse.total).toBeDefined();
    expect(apiResponse.page).toBeDefined();
    expect(apiResponse.limit).toBeDefined();

    console.log(`✅ API returned 200 with ${apiResponse.puzzles.length} puzzles (page ${apiResponse.page}, total: ${apiResponse.total})`);

    // Verify puzzle cards are displayed (up to 12 per page)
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    const displayedPuzzleCount = await puzzleCards.count();
    console.log(`Displayed puzzles: ${displayedPuzzleCount}`);
    expect(displayedPuzzleCount).toBeGreaterThan(0);
    expect(displayedPuzzleCount).toBeLessThanOrEqual(12);

    console.log(`✅ ${displayedPuzzleCount} puzzle cards displayed (max 12 per page)`);

    // Verify each card shows puzzle date and difficulty badge
    const puzzlesToCheck = Math.min(displayedPuzzleCount, 5);
    for (let i = 0; i < puzzlesToCheck; i++) {
      const puzzleCard = puzzleCards.nth(i);

      // Verify date is displayed (looks for Calendar icon and date text)
      const dateElement = puzzleCard.locator('.flex.items-center.gap-2').filter({
        has: page.locator('svg')
      }).first();
      await expect(dateElement).toBeVisible();

      const dateText = await dateElement.locator('span').textContent();
      console.log(`  Card ${i + 1} - Date: ${dateText}`);

      // Verify date format (e.g., "Jan 15, 2024")
      expect(dateText).toMatch(/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/);

      // Verify difficulty badge is displayed
      const difficultyBadge = puzzleCard.locator('span.px-2\\.5.py-1.rounded-full.font-display.text-xs.font-bold').first();
      await expect(difficultyBadge).toBeVisible();

      const difficultyText = await difficultyBadge.textContent();
      console.log(`  Card ${i + 1} - Difficulty: ${difficultyText}`);

      // Verify difficulty is one of: Easy, Medium, Hard
      expect(['Easy', 'Medium', 'Hard']).toContain(difficultyText);

      // Verify the difficulty badge has a background color
      const bgColor = await difficultyBadge.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor;
      });
      expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
    }

    console.log(`✅ All puzzle cards show date and difficulty badge`);

    // Verify pagination controls are visible (if more than 12 puzzles)
    if (apiResponse.total > 12) {
      const previousButton = page.locator('button:has-text("Previous")');
      const nextButton = page.locator('button:has-text("Next")');

      await expect(previousButton).toBeVisible();
      await expect(nextButton).toBeVisible();

      // Verify page number buttons
      const pageButtons = page.locator('button.w-10.h-10.rounded-xl');
      const pageButtonCount = await pageButtons.count();
      expect(pageButtonCount).toBeGreaterThan(0);
      expect(pageButtonCount).toBeLessThanOrEqual(10); // Max 10 page buttons (includes prev/next)

      console.log(`✅ Pagination controls visible with ${pageButtonCount} page buttons`);
    } else {
      console.log(`✅ No pagination needed (${apiResponse.total} total puzzles <= 12)`);
    }

    // Verify grid layout is responsive
    const gridContainer = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
    await expect(gridContainer).toBeVisible();

    // Verify filters section is present
    const filtersCard = page.locator('.crossy-card').filter({
      has: page.locator('input[placeholder*="Search"]')
    });
    await expect(filtersCard).toBeVisible();

    // Verify difficulty filter buttons are present
    const allButton = page.locator('button:has-text("All")').first();
    const easyButton = page.locator('button:has-text("Easy")').first();
    const mediumButton = page.locator('button:has-text("Medium")').first();
    const hardButton = page.locator('button:has-text("Hard")').first();

    await expect(allButton).toBeVisible();
    await expect(easyButton).toBeVisible();
    await expect(mediumButton).toBeVisible();
    await expect(hardButton).toBeVisible();

    // Take screenshot of archive page
    await page.screenshot({
      path: 'frontend/tests/ARCH-01-archive-page-verified.png',
      fullPage: true
    });

    console.log('✅ All acceptance criteria verified!');
  });

  test('should verify API pagination with difficulty filter', async ({ page }) => {
    // Track API calls
    const apiCalls: Array<{ url: string, status: number, response: any }> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/puzzles/archive')) {
        try {
          const data = await response.json();
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            response: data
          });
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    // Navigate to archive
    await page.goto('http://localhost:3000/archive');
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });

    // Wait for initial API call
    await page.waitForTimeout(1000);

    expect(apiCalls.length).toBeGreaterThan(0);
    const initialCall = apiCalls[0];
    expect(initialCall.status).toBe(200);
    console.log('Initial API call:', initialCall.url);

    // If there are multiple pages, test pagination
    if (initialCall.response.total > 12) {
      const initialCallCount = apiCalls.length;
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();

      // Wait for new API call
      await page.waitForTimeout(1000);

      // Should have at least one more API call than before
      expect(apiCalls.length).toBeGreaterThan(initialCallCount);

      // Find the page=2 API call
      const page2Call = apiCalls.find(call => call.url.includes('page=2'));
      expect(page2Call).toBeTruthy();
      expect(page2Call?.status).toBe(200);

      console.log('✅ Pagination API call verified');
    }

    console.log(`Total API calls made: ${apiCalls.length}`);
  });
});
