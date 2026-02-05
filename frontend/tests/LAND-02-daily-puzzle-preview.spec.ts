import { test, expect } from '@playwright/test';

test.describe('LAND-02: Daily puzzle preview on landing', () => {
  test('should display daily puzzle preview with all required information', async ({ page }) => {
    // Set up request interception to verify API call
    let apiCallMade = false;
    let apiResponse: any = null;
    let apiStatus = 0;

    page.on('response', async (response) => {
      if (response.url().includes('/api/puzzles/today')) {
        apiCallMade = true;
        apiStatus = response.status();
        try {
          apiResponse = await response.json();
        } catch (e) {
          console.error('Failed to parse API response:', e);
        }
        console.log(`✓ Intercepted API call to GET /api/puzzles/today - Status: ${apiStatus}`);
      }
    });

    // Navigate to / (home page)
    await page.goto('/');
    console.log('✓ Navigated to home page');

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify API call was made
    expect(apiCallMade).toBe(true);
    console.log('✓ API call to GET /api/puzzles/today was intercepted');

    // Verify API returns 200 with puzzle data
    expect(apiStatus).toBe(200);
    console.log('✓ API returned 200 status');

    expect(apiResponse).not.toBeNull();
    expect(apiResponse).toHaveProperty('title');
    expect(apiResponse).toHaveProperty('difficulty');
    console.log('✓ API returned puzzle data with title and difficulty');

    // Verify daily puzzle preview section exists (use ID selector to be specific)
    const dailyPuzzleSection = page.locator('section#play');
    await expect(dailyPuzzleSection).toBeVisible({ timeout: 10000 });
    console.log('✓ Daily puzzle preview section exists');

    // Verify today's date is shown
    const dateElement = dailyPuzzleSection.locator('span').filter({ hasText: /•/ });
    await expect(dateElement).toBeVisible();
    console.log('✓ Today\'s date is shown');

    // Verify difficulty badge is displayed
    const difficultyBadge = page.locator('.tag-easy, .tag-medium, .tag-hard');
    await expect(difficultyBadge.first()).toBeVisible();

    // Get the difficulty from the badge
    const difficultyText = await difficultyBadge.first().textContent();
    console.log(`✓ Difficulty badge is displayed: ${difficultyText}`);

    // Verify the difficulty matches the API response
    expect(difficultyText?.toLowerCase()).toContain(apiResponse.difficulty?.toLowerCase());
    console.log('✓ Difficulty badge matches API response');

    // Take screenshot of puzzle preview section
    await dailyPuzzleSection.screenshot({
      path: 'frontend/tests/LAND-02-puzzle-preview.png'
    });
    console.log('✓ Screenshot of puzzle preview taken');
  });

  test('should display puzzle metadata correctly', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for daily puzzle section to load
    await page.waitForSelector('text=Today\'s Puzzle', { timeout: 10000 });
    console.log('✓ Daily puzzle section loaded');

    // Verify puzzle title is displayed
    const dailyPuzzleSection = page.locator('section#play');
    const puzzleTitle = dailyPuzzleSection.locator('h2').first();
    await expect(puzzleTitle).toBeVisible();

    const titleText = await puzzleTitle.textContent();
    expect(titleText).not.toBe('');
    console.log(`✓ Puzzle title is displayed: ${titleText}`);

    // Verify author is displayed
    const authorElement = dailyPuzzleSection.locator('text=/By .+/');
    await expect(authorElement).toBeVisible();

    const authorText = await authorElement.textContent();
    console.log(`✓ Author is displayed: ${authorText}`);

    // Verify grid size is displayed
    const gridSizeElement = dailyPuzzleSection.locator('span').filter({ hasText: /\d+×\d+/ });
    await expect(gridSizeElement).toBeVisible();

    const gridSizeText = await gridSizeElement.textContent();
    console.log(`✓ Grid size is displayed: ${gridSizeText}`);

    // Verify Play Now button is present
    const playButton = dailyPuzzleSection.locator('button:has-text("Play Now")');
    await expect(playButton).toBeVisible();
    console.log('✓ Play Now button is present in daily puzzle section');
  });

  test('should handle loading state', async ({ page }) => {
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    console.log('✓ Navigated to home page (early load)');

    // Check if loading state is visible (it may be very fast)
    const loadingIndicator = page.locator('text=Loading today\'s puzzle');
    const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false);

    if (isLoadingVisible) {
      console.log('✓ Loading indicator was visible during fetch');
    } else {
      console.log('✓ Loading completed too quickly to observe (acceptable)');
    }

    // Wait for the actual puzzle content to appear
    await page.waitForSelector('text=Today\'s Puzzle', { timeout: 10000 });
    console.log('✓ Daily puzzle content loaded successfully');

    // Verify loading indicator is gone
    await expect(loadingIndicator).not.toBeVisible();
    console.log('✓ Loading indicator is no longer visible');
  });

  test('Play Now button in daily puzzle section should navigate to /play', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for daily puzzle section to load
    await page.waitForSelector('text=Today\'s Puzzle', { timeout: 10000 });
    console.log('✓ Daily puzzle section loaded');

    // Find and click the Play Now button within the daily puzzle section
    const dailyPuzzleSection = page.locator('section#play');
    const playButton = dailyPuzzleSection.locator('button:has-text("Play Now")').first();
    await expect(playButton).toBeVisible();

    await playButton.click();
    console.log('✓ Clicked Play Now button in daily puzzle section');

    // Verify navigation to /play
    await page.waitForURL('**/play', { timeout: 5000 });
    expect(page.url()).toContain('/play');
    console.log('✓ Successfully navigated to /play page');
  });

  test('should display full page with daily puzzle preview', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('✓ Page fully loaded');

    // Wait for daily puzzle section
    await page.waitForSelector('text=Today\'s Puzzle', { timeout: 10000 });
    console.log('✓ Daily puzzle section visible');

    // Take full page screenshot showing the daily puzzle in context
    await page.screenshot({
      path: 'frontend/tests/LAND-02-full-landing-page.png',
      fullPage: true
    });
    console.log('✓ Full page screenshot taken showing daily puzzle preview');
  });
});
