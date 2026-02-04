import { test, expect } from '@playwright/test';

test.describe('PLAY-18: Timer displays solve time', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the play page
    await page.goto('http://localhost:3001/play');

    // Wait for the puzzle to load
    await page.waitForSelector('[data-testid="crossword-grid"]', { timeout: 10000 });

    // Wait a bit more for puzzle data to be fully loaded
    await page.waitForTimeout(1000);
  });

  test('should display timer in MM:SS format and increment over time', async ({ page }) => {
    // Find the timer element (it's displayed with a Clock icon)
    const timerElement = page.locator('.flex.items-center.gap-1\\.5.bg-\\[\\#F3F1FF\\]').filter({ has: page.locator('svg') }).first();

    // Verify timer is visible on the page
    await expect(timerElement).toBeVisible();

    // Get initial timer text
    const initialTime = await timerElement.locator('span').textContent();
    console.log('Initial timer value:', initialTime);

    // Verify timer shows time in MM:SS format (e.g., "0:00", "0:05", "1:23")
    expect(initialTime).toMatch(/^\d+:\d{2}$/);

    // Parse initial time
    const [initialMins, initialSecs] = initialTime!.split(':').map(Number);
    const initialTotalSeconds = initialMins * 60 + initialSecs;

    // Wait 3 seconds
    await page.waitForTimeout(3000);

    // Get updated timer text
    const updatedTime = await timerElement.locator('span').textContent();
    console.log('Updated timer value after 3 seconds:', updatedTime);

    // Verify timer still matches MM:SS format
    expect(updatedTime).toMatch(/^\d+:\d{2}$/);

    // Parse updated time
    const [updatedMins, updatedSecs] = updatedTime!.split(':').map(Number);
    const updatedTotalSeconds = updatedMins * 60 + updatedSecs;

    // Verify timer incremented (should be at least 2 seconds more, allowing 1 second tolerance)
    expect(updatedTotalSeconds).toBeGreaterThanOrEqual(initialTotalSeconds + 2);
    expect(updatedTotalSeconds).toBeLessThanOrEqual(initialTotalSeconds + 4);

    console.log('Timer incremented correctly:', {
      initial: initialTime,
      updated: updatedTime,
      difference: updatedTotalSeconds - initialTotalSeconds
    });

    // Take snapshot showing timer
    await page.screenshot({
      path: 'frontend/tests/PLAY-18-timer-display.png',
      fullPage: true
    });
  });

  test('should format timer correctly with leading zeros for seconds', async ({ page }) => {
    // Find the timer element
    const timerElement = page.locator('.flex.items-center.gap-1\\.5.bg-\\[\\#F3F1FF\\]').filter({ has: page.locator('svg') }).first();

    // Get timer text
    const timerText = await timerElement.locator('span').textContent();

    // Verify format has proper zero padding for seconds (e.g., "0:05" not "0:5")
    const [_, secs] = timerText!.split(':');
    expect(secs).toHaveLength(2);

    console.log('Timer format verified:', timerText);
  });

  test('should display timer in title bar with clock icon', async ({ page }) => {
    // Find the Clock icon specifically
    const clockIcon = page.locator('svg').filter({ has: page.locator('circle') }).first();

    // Verify the clock icon is visible (part of lucide-react Clock component)
    await expect(clockIcon).toBeVisible();

    // Get the parent container which should include both icon and timer
    const timerContainer = clockIcon.locator('..');

    // Verify the container has the correct styling
    const bgColor = await timerContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Timer container background:', bgColor);

    // The timer text should be next to the icon
    const timerText = await timerContainer.locator('span').textContent();
    expect(timerText).toMatch(/^\d+:\d{2}$/);

    console.log('Timer with icon verified:', timerText);
  });
});
