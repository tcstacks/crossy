import { test, expect } from '@playwright/test';

/**
 * ARCH-04: Play puzzle from archive - Navigation Test
 *
 * This test verifies the navigation mechanism works correctly by mocking
 * the API responses. It validates that clicking archive puzzles navigates
 * to the play page with the correct date parameter.
 */

test.describe('ARCH-04: Archive to Play Navigation', () => {
  test('should navigate from archive to play page with date parameter', async ({ page }) => {
    // Mock the archive API response
    await page.route('**/api/puzzles/archive*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          puzzles: [
            {
              id: 'test-puzzle-1',
              date: '2026-01-20',
              difficulty: 'easy',
              title: 'Test Puzzle 1'
            },
            {
              id: 'test-puzzle-2',
              date: '2026-01-21',
              difficulty: 'medium',
              title: 'Test Puzzle 2'
            },
            {
              id: 'test-puzzle-3',
              date: '2026-01-22',
              difficulty: 'hard',
              title: 'Test Puzzle 3'
            }
          ],
          total: 3,
          page: 1,
          limit: 12
        })
      });
    });

    // Mock the puzzle by date API response
    await page.route('**/api/puzzles/2026-01-20', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-puzzle-1',
          date: '2026-01-20',
          difficulty: 'easy',
          title: 'Test Puzzle 1',
          grid: [
            [{ letter: 'A', number: 1, blocked: false }, { letter: 'P', number: null, blocked: false }],
            [{ letter: 'T', number: 2, blocked: false }, { letter: 'E', number: null, blocked: false }]
          ],
          clues: {
            across: [
              { number: 1, text: 'Fruit', answer: 'APPLE', row: 0, col: 0 }
            ],
            down: [
              { number: 1, text: 'Skill', answer: 'ART', row: 0, col: 0 }
            ]
          }
        })
      });
    });

    // Track navigation
    const navigationEvents: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationEvents.push(frame.url());
      }
    });

    // Navigate to archive
    console.log('Navigating to /archive...');
    await page.goto('http://localhost:3000/archive');

    // Wait for page load
    await page.waitForSelector('h1:has-text("Puzzle Archive")', { timeout: 10000 });
    console.log('✅ Archive page loaded');

    // Wait for puzzle cards to render
    const puzzleCards = page.locator('button.crossy-card');
    await expect(puzzleCards.first()).toBeVisible({ timeout: 10000 });

    const cardCount = await puzzleCards.count();
    expect(cardCount).toBe(3);
    console.log(`✅ ${cardCount} puzzle cards visible`);

    // Get date from first puzzle card
    const firstCard = puzzleCards.first();
    const dateElement = firstCard.locator('.flex.items-center.gap-2').filter({
      has: page.locator('svg')
    }).first();
    const dateText = await dateElement.locator('span').textContent();
    console.log(`First puzzle date: ${dateText}`);

    // Click on the first puzzle
    console.log('Clicking on first puzzle card...');
    await firstCard.click();

    // Verify navigation to /play?date=YYYY-MM-DD
    await page.waitForURL(/\/play\?date=\d{4}-\d{2}-\d{2}/, { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`✅ Navigated to: ${currentUrl}`);

    // Extract and verify date parameter
    const urlMatch = currentUrl.match(/date=(\d{4}-\d{2}-\d{2})/);
    expect(urlMatch).toBeTruthy();
    const urlDate = urlMatch![1];
    expect(urlDate).toBe('2026-01-20');
    console.log(`✅ Date parameter in URL: ${urlDate}`);

    // Verify we're on the play page (navigation successful)
    expect(page.url()).toContain('/play?date=2026-01-20');
    console.log('✅ Successfully navigated to play page with correct date parameter');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/ARCH-04-navigation-verified.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved');

    console.log('✅ All acceptance criteria verified!');
  });

  test('should handle clicking different puzzle cards with different dates', async ({ page }) => {
    // Mock archive API
    await page.route('**/api/puzzles/archive*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          puzzles: [
            { id: '1', date: '2026-01-15', difficulty: 'easy' },
            { id: '2', date: '2026-01-16', difficulty: 'medium' },
            { id: '3', date: '2026-01-17', difficulty: 'hard' }
          ],
          total: 3,
          page: 1,
          limit: 12
        })
      });
    });

    // Mock puzzle API responses for different dates
    const mockPuzzle = (date: string) => ({
      id: `puzzle-${date}`,
      date,
      difficulty: 'easy',
      grid: [
        [{ letter: 'A', number: 1, blocked: false }, { letter: 'P', number: null, blocked: false }, { letter: 'P', number: null, blocked: false }, { letter: 'L', number: null, blocked: false }, { letter: 'E', number: null, blocked: false }],
        [{ letter: 'R', number: 2, blocked: false }, { letter: 'O', number: null, blocked: false }, { letter: 'S', number: null, blocked: false }, { letter: 'E', number: null, blocked: false }, { letter: '', number: null, blocked: true }]
      ],
      clues: {
        across: [{ number: 1, text: 'Fruit', answer: 'APPLE', row: 0, col: 0 }],
        down: [{ number: 1, text: 'Skill', answer: 'ART', row: 0, col: 0 }]
      }
    });

    await page.route('**/api/puzzles/2026-01-15', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPuzzle('2026-01-15')) });
    });

    await page.route('**/api/puzzles/2026-01-16', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPuzzle('2026-01-16')) });
    });

    await page.route('**/api/puzzles/2026-01-17', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPuzzle('2026-01-17')) });
    });

    // Navigate to archive
    await page.goto('http://localhost:3000/archive');
    await page.waitForSelector('h1:has-text("Puzzle Archive")');

    const puzzleCards = page.locator('button.crossy-card');

    // Test each puzzle card
    const testDates = ['2026-01-15', '2026-01-16', '2026-01-17'];

    for (let i = 0; i < testDates.length; i++) {
      // Go back to archive if not first iteration
      if (i > 0) {
        await page.goto('http://localhost:3000/archive');
        await page.waitForSelector('h1:has-text("Puzzle Archive")');
      }

      // Click puzzle card
      await puzzleCards.nth(i).click();

      // Verify navigation
      await page.waitForURL(/\/play\?date=/, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain(`date=${testDates[i]}`);

      console.log(`✅ Test ${i + 1}: Navigated to play page with date ${testDates[i]}`);
    }

    console.log('✅ Successfully tested navigation for multiple puzzle dates');
  });

  test('should verify API call to puzzle by date endpoint', async ({ page }) => {
    let apiCallMade = false;
    let apiCallDate = '';

    // Mock archive API
    await page.route('**/api/puzzles/archive*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          puzzles: [{ id: '1', date: '2026-02-01', difficulty: 'easy' }],
          total: 1,
          page: 1,
          limit: 12
        })
      });
    });

    // Mock and track puzzle by date API
    await page.route('**/api/puzzles/2026-02-01', async (route) => {
      apiCallMade = true;
      apiCallDate = '2026-02-01';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-1',
          date: '2026-02-01',
          grid: [[{ letter: 'A', number: 1 }]],
          clues: { across: [], down: [] }
        })
      });
    });

    // Navigate and click
    await page.goto('http://localhost:3000/archive');
    await page.waitForSelector('h1:has-text("Puzzle Archive")');

    const puzzleCards = page.locator('button.crossy-card');
    await puzzleCards.first().click();

    // Wait for navigation and API call
    await page.waitForURL(/\/play\?date=2026-02-01/);
    await page.waitForTimeout(1000); // Give API time to be called

    // Verify API call was made
    expect(apiCallMade).toBe(true);
    expect(apiCallDate).toBe('2026-02-01');

    console.log('✅ API call to GET /api/puzzles/2026-02-01 verified');
    console.log('✅ All acceptance criteria for API interception verified!');
  });
});
