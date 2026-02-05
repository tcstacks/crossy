import { test, expect } from '@playwright/test';

test.describe('PUZZLE-08: Timer tracks elapsed time', () => {
  test('should track elapsed time during puzzle play', async ({ page }) => {
    // Mock puzzle data for testing
    const mockPuzzleData = {
      id: 'test-puzzle-timer',
      title: 'Timer Test Puzzle',
      difficulty: 'easy',
      gridWidth: 3,
      gridHeight: 3,
      grid: [
        [{ letter: 'C', number: 1 }, { letter: 'A', number: null }, { letter: 'T', number: null }],
        [{ letter: 'A', number: 2 }, { letter: 'R', number: null }, { letter: null, number: null }],
        [{ letter: 'T', number: 3 }, { letter: null, number: null }, { letter: null, number: null }]
      ],
      cluesAcross: [
        { number: 1, text: 'Feline pet', answer: 'CAT', positionX: 0, positionY: 0 },
        { number: 2, text: 'Vehicle', answer: 'CAR', positionX: 0, positionY: 1 }
      ],
      cluesDown: [
        { number: 1, text: 'Kitty', answer: 'CAT', positionX: 0, positionY: 0 },
        { number: 3, text: 'Faucet', answer: 'TAT', positionX: 0, positionY: 2 }
      ]
    };

    // Mock API responses
    await page.route('**/api/puzzles/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPuzzleData)
      });
    });

    // Complete PUZZLE-01 to load puzzle
    await page.goto('http://localhost:3000/play');

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify timer is visible and shows 00:00 (or similar initial state)
    const timerElement = page.locator('.flex.items-center.gap-1\\.5.bg-\\[\\#F3F1FF\\]')
      .filter({ has: page.locator('svg') })
      .first();

    await expect(timerElement).toBeVisible();

    const initialTime = await timerElement.locator('span').textContent();
    console.log('Initial timer value:', initialTime);

    // Verify timer shows time in MM:SS format (e.g., "0:00", "0:01", etc.)
    expect(initialTime).toMatch(/^\d+:\d{2}$/);

    // Parse initial time
    const [initialMins, initialSecs] = initialTime!.split(':').map(Number);
    const initialTotalSeconds = initialMins * 60 + initialSecs;

    // Verify timer shows approximately 00:00 or very close to start
    expect(initialTotalSeconds).toBeLessThanOrEqual(2);

    // Wait 3 seconds
    await page.waitForTimeout(3000);

    // Verify timer shows approximately 00:03
    const timeAfter3Secs = await timerElement.locator('span').textContent();
    console.log('Timer after 3 seconds:', timeAfter3Secs);

    const [mins3, secs3] = timeAfter3Secs!.split(':').map(Number);
    const totalSeconds3 = mins3 * 60 + secs3;

    // Allow for slight timing variations (2-5 seconds range)
    expect(totalSeconds3).toBeGreaterThanOrEqual(initialTotalSeconds + 2);
    expect(totalSeconds3).toBeLessThanOrEqual(initialTotalSeconds + 5);

    console.log('Timer shows approximately 00:03 ✓');

    // Verify timer continues incrementing
    await page.waitForTimeout(2000);

    const timeAfter5Secs = await timerElement.locator('span').textContent();
    console.log('Timer after 5 seconds:', timeAfter5Secs);

    const [mins5, secs5] = timeAfter5Secs!.split(':').map(Number);
    const totalSeconds5 = mins5 * 60 + secs5;

    // Timer should have continued incrementing
    expect(totalSeconds5).toBeGreaterThan(totalSeconds3);
    expect(totalSeconds5).toBeGreaterThanOrEqual(initialTotalSeconds + 4);

    console.log('Timer continues incrementing ✓');

    // Take screenshot showing timer
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-08-timer-display.png',
      fullPage: true
    });

    console.log('Screenshot saved: PUZZLE-08-timer-display.png ✓');

    // Log final verification
    console.log('\n=== PUZZLE-08 Acceptance Criteria ===');
    console.log('✓ Complete PUZZLE-01 to load puzzle');
    console.log('✓ Verify timer is visible and shows 00:00');
    console.log('✓ Wait 3 seconds');
    console.log('✓ Verify timer shows approximately 00:03');
    console.log('✓ Verify timer continues incrementing');
    console.log('✓ Take screenshot showing timer');
  });
});
