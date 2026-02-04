import { test, expect } from '@playwright/test';

/**
 * LAND-03: Daily puzzle preview
 *
 * As a visitor, I see today's puzzle preview on the landing page
 *
 * Acceptance Criteria:
 * - Navigate to / (home page)
 * - Verify daily puzzle preview section exists
 * - Verify it shows today's date
 * - Verify difficulty badge is shown
 * - Take snapshot of puzzle preview
 */

test.describe('LAND-03: Daily Puzzle Preview', () => {
  test('should display daily puzzle preview with all required information', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Scroll to the daily puzzle section
    const dailyPuzzleSection = page.locator('section#play');
    await dailyPuzzleSection.scrollIntoViewIfNeeded();
    await expect(dailyPuzzleSection).toBeVisible();

    // Verify "Today's Puzzle" header is present
    const todaysPuzzleLabel = page.getByText("Today's Puzzle");
    await expect(todaysPuzzleLabel).toBeVisible();

    // Verify today's date is shown - look for the bullet and date pattern
    const dateText = await dailyPuzzleSection.locator('span:has-text("•")').textContent();
    expect(dateText).toBeTruthy();
    // Should contain day name like Monday, Tuesday, etc.
    const hasValidDate = /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(dateText || '');
    expect(hasValidDate).toBeTruthy();

    // Verify puzzle title is shown
    const puzzleTitle = dailyPuzzleSection.locator('h2');
    await expect(puzzleTitle).toBeVisible();
    const titleText = await puzzleTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(0);

    // Verify difficulty badge is shown (EASY, MEDIUM, or HARD)
    const difficultyBadge = dailyPuzzleSection.locator('span.tag-easy, span.tag-medium, span.tag-hard');
    await expect(difficultyBadge).toBeVisible();
    const difficultyText = await difficultyBadge.textContent();
    expect(['EASY', 'MEDIUM', 'HARD', 'easy', 'medium', 'hard']).toContain(difficultyText);

    // Verify grid size is shown (e.g., "5×5")
    const gridSize = dailyPuzzleSection.locator('span:has-text("×")');
    await expect(gridSize).toBeVisible();

    // Verify "Play Now" button is present
    const playButton = dailyPuzzleSection.getByRole('button', { name: /play now/i });
    await expect(playButton).toBeVisible();

    // Take snapshot of the daily puzzle preview section
    await dailyPuzzleSection.screenshot({
      path: 'frontend/tests/LAND-03-daily-puzzle-preview.png'
    });

    console.log('✅ All acceptance criteria verified:');
    console.log('  - Daily puzzle preview section exists');
    console.log('  - Today\'s date is displayed');
    console.log('  - Difficulty badge is shown');
    console.log('  - Snapshot saved to frontend/tests/LAND-03-daily-puzzle-preview.png');
  });

  test('should show loading state initially', async ({ page }) => {
    // Block the API call to simulate loading
    await page.route('**/api/puzzles/today', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });

    await page.goto('http://localhost:3000/');

    // Check for loading state
    const loadingText = page.getByText(/loading today's puzzle/i);
    await expect(loadingText).toBeVisible({ timeout: 500 });
  });

  test('should display puzzle data when API returns successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Wait for puzzle data to load
    const puzzleSection = page.locator('section#play');
    await expect(puzzleSection).toBeVisible();

    // Verify no loading state is shown
    const loadingText = page.getByText(/loading today's puzzle/i);
    await expect(loadingText).not.toBeVisible();

    // Verify puzzle information is displayed
    await expect(page.getByText("Today's Puzzle")).toBeVisible();
  });
});
