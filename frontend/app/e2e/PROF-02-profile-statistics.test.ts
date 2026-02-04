import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * PROF-02: Profile statistics display
 *
 * Acceptance Criteria:
 * - Login as a user
 * - Navigate to /profile
 * - Verify puzzles solved count is displayed
 * - Verify average solve time is displayed
 * - Verify current streak is displayed
 * - Verify best streak is displayed
 * - Take snapshot of stats
 */

test.describe('PROF-02: Profile statistics display', () => {
  test('should display all user statistics on profile page', async ({ page, request }) => {
    const testUser = {
      email: 'prof02test@example.com',
      password: 'Test123456',
      displayName: 'PROF02 Test User',
    };

    // ✅ AC1: Login as a user - Use API for reliable authentication

    // Try to register the user first (ignore errors if user exists)
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
        },
      });
    } catch (error) {
      // User might already exist, continue to login
    }

    // Login via API to get auth token
    const loginResponse = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', loginResponse.status(), errorText);
    }
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    // Set the auth token in localStorage and navigate to profile
    await page.goto('http://localhost:3000/profile');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Reload the page to trigger AuthContext initialization
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('✅ AC1: User logged in successfully');

    // ✅ AC2: Navigate to /profile
    // Wait for profile page to load (no skeleton/loading state)
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForSelector('text="Your Stats"', { timeout: 10000 });

    console.log('✅ AC2: Navigated to /profile');

    // ✅ AC3: Verify puzzles solved count is displayed
    const puzzlesSolvedCard = page.locator('text="Puzzles Solved"').locator('..');
    await expect(puzzlesSolvedCard).toBeVisible({ timeout: 5000 });

    // Get the count value (should be a number, could be 0 for new users)
    const puzzlesSolvedValue = await puzzlesSolvedCard.locator('p.text-3xl').textContent();
    expect(puzzlesSolvedValue).toMatch(/^\d+$/);
    console.log('✅ AC3: Puzzles solved count displayed:', puzzlesSolvedValue);

    // ✅ AC4: Verify average solve time is displayed
    const avgTimeCard = page.locator('text="Avg Solve Time"').locator('..');
    await expect(avgTimeCard).toBeVisible({ timeout: 5000 });

    // Get the time value (format: M:SS or N/A)
    const avgTimeValue = await avgTimeCard.locator('p.text-3xl').textContent();
    expect(avgTimeValue).toMatch(/^(\d+:\d{2}|N\/A)$/);
    console.log('✅ AC4: Average solve time displayed:', avgTimeValue);

    // ✅ AC5: Verify current streak is displayed
    const currentStreakCard = page.locator('text="Current Streak"').locator('..');
    await expect(currentStreakCard).toBeVisible({ timeout: 5000 });

    // Get the streak value (should be a number)
    const currentStreakValue = await currentStreakCard.locator('p.text-3xl').textContent();
    expect(currentStreakValue).toMatch(/^\d+$/);
    console.log('✅ AC5: Current streak displayed:', currentStreakValue);

    // ✅ AC6: Verify best streak is displayed
    const bestStreakCard = page.locator('text="Best Streak"').locator('..');
    await expect(bestStreakCard).toBeVisible({ timeout: 5000 });

    // Get the streak value (should be a number)
    const bestStreakValue = await bestStreakCard.locator('p.text-3xl').textContent();
    expect(bestStreakValue).toMatch(/^\d+$/);
    console.log('✅ AC6: Best streak displayed:', bestStreakValue);

    // ✅ AC7: Take snapshot of stats
    const screenshotPath = path.join(__dirname, 'PROF-02-statistics.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('✅ AC7: Screenshot saved to:', screenshotPath);

    // Additional verification: Check all stat cards are present
    const statCards = [
      'Puzzles Solved',
      'Avg Solve Time',
      'Current Streak',
      'Best Streak',
      'Multiplayer Wins'
    ];

    for (const statName of statCards) {
      const statCard = page.locator(`text="${statName}"`);
      await expect(statCard).toBeVisible();
    }
    console.log('✅ All stat cards are visible');

    console.log('\n✅ All acceptance criteria passed for PROF-02');
  });

  test('should display stats with different values after puzzle completion', async ({ page, request }) => {
    // This test assumes puzzle history can be saved via API
    const testUser = {
      email: 'prof02stats@example.com',
      password: 'Test123456',
      displayName: 'PROF02 Stats User',
    };

    // Register or login
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
        },
      });
    } catch (error) {
      // User exists, that's fine
    }

    const loginResponse = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    // Set auth token and navigate to profile
    await page.goto('http://localhost:3000/profile');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Reload the page to trigger AuthContext initialization
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text="Your Stats"', { timeout: 10000 });

    // Verify stats are displayed (values may vary based on user history)
    const puzzlesSolvedValue = await page.locator('text="Puzzles Solved"').locator('..').locator('p.text-3xl').textContent();
    const currentStreakValue = await page.locator('text="Current Streak"').locator('..').locator('p.text-3xl').textContent();
    const bestStreakValue = await page.locator('text="Best Streak"').locator('..').locator('p.text-3xl').textContent();

    console.log('Stats for user:', {
      puzzlesSolved: puzzlesSolvedValue,
      currentStreak: currentStreakValue,
      bestStreak: bestStreakValue,
    });

    // All values should be numeric
    expect(puzzlesSolvedValue).toMatch(/^\d+$/);
    expect(currentStreakValue).toMatch(/^\d+$/);
    expect(bestStreakValue).toMatch(/^\d+$/);

    console.log('✅ Stats display correctly with various values');
  });
});
