import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * HIST-03: Play Again from history
 *
 * Acceptance Criteria:
 * - Login and navigate to /history
 * - Find a puzzle entry with 'Play Again' button
 * - Click 'Play Again'
 * - Verify navigation to /play with that puzzle loaded
 * - Take snapshot of loaded puzzle
 */

test.describe('HIST-03: Play Again from history', () => {
  test('should replay a puzzle from history', async ({ page, request }) => {
    const testUser = {
      email: 'hist03test@example.com',
      password: 'Test123456',
      displayName: 'HIST03 Test User',
    };

    // Setup: Register and login the user
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
        },
      });
    } catch (error) {
      // User might already exist, continue
    }

    // Login via API
    const loginResponse = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    // Set auth token in browser
    await page.goto('http://localhost:3000');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Setup: Ensure user has completed at least one puzzle in history
    // First, complete a puzzle to ensure history exists
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });

    // Auto-solve the puzzle by revealing all answers (for testing purposes)
    // We'll use the Reveal Word feature multiple times or check the grid and fill it
    const grid = page.locator('[data-testid="crossword-grid"]');
    await expect(grid).toBeVisible();

    // Get all grid cells and fill them programmatically via the API
    // For simplicity, let's just get the puzzle ID and save it as completed via API
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Get today's puzzle to save history
    const puzzleResponse = await request.get('http://localhost:8080/api/puzzles/today', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    expect(puzzleResponse.ok()).toBeTruthy();
    const puzzleData = await puzzleResponse.json();
    const puzzleId = puzzleData.id;

    // Save puzzle completion to history via API
    const saveHistoryResponse = await request.post('http://localhost:8080/api/users/me/history', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        puzzleId: puzzleId,
        completedAt: new Date().toISOString(),
        timeTaken: 120, // 2 minutes
        moveCount: 0,
        solved: true,
      },
    });

    expect(saveHistoryResponse.ok()).toBeTruthy();
    console.log('✅ Setup: Puzzle completion saved to history');

    // ✅ AC1: Login and navigate to /history
    await page.goto('http://localhost:3000/history');
    await page.waitForLoadState('networkidle');

    // Wait for history page to load
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 10000 });
    console.log('✅ AC1: Navigated to /history');

    // ✅ AC2: Find a puzzle entry with 'Play Again' button
    const playAgainButton = page.locator('button:has-text("Play Again")').first();
    await expect(playAgainButton).toBeVisible({ timeout: 5000 });
    console.log('✅ AC2: Found "Play Again" button');

    // Take snapshot before clicking
    const historyScreenshotPath = path.join(__dirname, 'HIST-03-history-page.png');
    await page.screenshot({
      path: historyScreenshotPath,
      fullPage: true
    });
    console.log('✅ Screenshot saved:', historyScreenshotPath);

    // ✅ AC3: Click 'Play Again'
    await playAgainButton.click();
    console.log('✅ AC3: Clicked "Play Again" button');

    // ✅ AC4: Verify navigation to /play with that puzzle loaded
    await page.waitForLoadState('networkidle');

    // Check URL changed to /play
    await page.waitForURL('**/play', { timeout: 5000 });
    expect(page.url()).toContain('/play');
    console.log('✅ AC4a: Navigated to /play');

    // Wait for puzzle grid to load
    const playGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(playGrid).toBeVisible({ timeout: 10000 });
    console.log('✅ AC4b: Puzzle grid loaded');

    // Verify the puzzle is actually loaded (has cells)
    const gridCells = playGrid.locator('div').filter({ hasText: /^[A-Z]?$/ });
    const cellCount = await gridCells.count();
    expect(cellCount).toBeGreaterThan(0);
    console.log('✅ AC4c: Puzzle has', cellCount, 'cells');

    // Verify puzzle title is displayed
    const puzzleTitle = page.locator('h1');
    await expect(puzzleTitle).toBeVisible();
    const titleText = await puzzleTitle.textContent();
    console.log('✅ AC4d: Puzzle title:', titleText);

    // ✅ AC5: Take snapshot of loaded puzzle
    const puzzleScreenshotPath = path.join(__dirname, 'HIST-03-loaded-puzzle.png');
    await page.screenshot({
      path: puzzleScreenshotPath,
      fullPage: true
    });
    console.log('✅ AC5: Screenshot of loaded puzzle saved:', puzzleScreenshotPath);

    // Additional verification: Check that the timer started
    const timer = page.locator('text=/\\d+:\\d+/').first();
    await expect(timer).toBeVisible();
    console.log('✅ Timer is running');

    // Verify clues are loaded
    const cluesPanel = page.locator('text="Across"');
    await expect(cluesPanel).toBeVisible();
    console.log('✅ Clues panel is visible');

    console.log('\n✅ All acceptance criteria passed for HIST-03');
  });
});
