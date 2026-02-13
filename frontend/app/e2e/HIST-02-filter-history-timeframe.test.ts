import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HIST-02: Filter history by timeframe
 *
 * Acceptance Criteria:
 * - Login and navigate to /history
 * - Find the timeframe filter
 * - Select 'This Week' filter
 * - Verify list updates to show only recent entries
 * - Select 'All Time' filter
 * - Verify all entries are shown
 * - Take snapshots of filtered results
 */

test.describe('HIST-02: Filter history by timeframe', () => {
  test('should filter history by different timeframes', async ({ page, request }) => {
    const testUser = {
      email: 'hist02test@example.com',
      password: 'Test123456',
      displayName: 'HIST02 Test User',
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
    } catch {
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

    console.log('✅ AC1: User logged in successfully');

    // Get a puzzle ID to create history entries
    const todayPuzzleResponse = await request.get('http://localhost:8080/api/puzzles/today');
    expect(todayPuzzleResponse.ok()).toBeTruthy();
    const todayPuzzle = await todayPuzzleResponse.json();
    const puzzleId = todayPuzzle.id;

    // Create multiple history entries with different solve times
    // This will help us verify that all entries are displayed
    const historyEntries = [
      {
        puzzleId,
        solveTime: 120, // 2:00
        completed: true,
        accuracy: 95.0,
        hintsUsed: 0,
      },
      {
        puzzleId,
        solveTime: 180, // 3:00
        completed: true,
        accuracy: 90.0,
        hintsUsed: 1,
      },
      {
        puzzleId,
        solveTime: 240, // 4:00
        completed: true,
        accuracy: 85.0,
        hintsUsed: 2,
      },
    ];

    for (const entry of historyEntries) {
      const historyResponse = await request.post('http://localhost:8080/api/users/me/history', {
        data: entry,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!historyResponse.ok()) {
        const errorText = await historyResponse.text();
        console.log('History entry creation response:', historyResponse.status(), errorText);
      }
    }

    console.log('✅ Created test puzzle history entries');

    // Set the auth token in localStorage and navigate to history page
    await page.goto('http://localhost:3000/history');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Reload the page to trigger AuthContext initialization
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ✅ AC1: Navigate to /history
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 10000 });
    console.log('✅ AC1: Navigated to /history');

    // ✅ AC2: Find the timeframe filter
    const filterSection = page.locator('text="Filter"');
    await expect(filterSection).toBeVisible({ timeout: 5000 });
    console.log('✅ AC2: Filter section is displayed');

    // Verify all filter buttons are present
    const filterButtons = ['All', 'This Week', 'This Month', 'This Year'];
    for (const buttonText of filterButtons) {
      const button = page.locator(`button:has-text("${buttonText}")`);
      await expect(button).toBeVisible();
    }
    console.log('✅ AC2: All filter buttons are visible');

    // Count initial history entries (should show all entries)
    const initialCards = page.locator('[class*="crossy-card"]:has-text("Puzzle Completed")');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);
    console.log(`✅ Initial history shows ${initialCount} entries`);

    // ✅ AC3: Select 'This Week' filter
    const weekFilterButton = page.locator('button:has-text("This Week")');
    await weekFilterButton.click();
    await page.waitForTimeout(500); // Wait for filter to apply
    console.log('✅ AC3: Clicked "This Week" filter');

    // Verify the button is now active (has purple background)
    const weekButtonClasses = await weekFilterButton.getAttribute('class');
    expect(weekButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ AC3: "This Week" filter is now active');

    // ✅ AC4: Verify list updates to show only recent entries
    // Since we just created the entries, they should all be from this week
    const weekCards = page.locator('[class*="crossy-card"]:has-text("Puzzle Completed")');
    const weekCount = await weekCards.count();
    expect(weekCount).toBeGreaterThan(0);
    console.log(`✅ AC4: Week filter shows ${weekCount} entries`);

    // Take snapshot of week filter
    const weekScreenshotPath = path.join(__dirname, 'HIST-02-filter-week.png');
    await page.screenshot({
      path: weekScreenshotPath,
      fullPage: true
    });
    console.log('✅ AC7: Week filter screenshot saved to:', weekScreenshotPath);

    // ✅ AC5: Select 'All Time' filter
    const allFilterButton = page.locator('button:has-text("All")').first();
    await allFilterButton.click();
    await page.waitForTimeout(500); // Wait for filter to apply
    console.log('✅ AC5: Clicked "All" filter');

    // Verify the button is now active
    const allButtonClasses = await allFilterButton.getAttribute('class');
    expect(allButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ AC5: "All" filter is now active');

    // ✅ AC6: Verify all entries are shown
    const allCards = page.locator('[class*="crossy-card"]:has-text("Puzzle Completed")');
    const allCount = await allCards.count();
    expect(allCount).toBeGreaterThanOrEqual(weekCount);
    expect(allCount).toBe(initialCount); // Should match initial count
    console.log(`✅ AC6: All filter shows ${allCount} entries (all history)`);

    // Take snapshot of all filter
    const allScreenshotPath = path.join(__dirname, 'HIST-02-filter-all.png');
    await page.screenshot({
      path: allScreenshotPath,
      fullPage: true
    });
    console.log('✅ AC7: All filter screenshot saved to:', allScreenshotPath);

    // Additional verification: Test 'This Month' filter
    const monthFilterButton = page.locator('button:has-text("This Month")');
    await monthFilterButton.click();
    await page.waitForTimeout(500);

    const monthButtonClasses = await monthFilterButton.getAttribute('class');
    expect(monthButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ Additional: "This Month" filter works');

    // Take snapshot of month filter
    const monthScreenshotPath = path.join(__dirname, 'HIST-02-filter-month.png');
    await page.screenshot({
      path: monthScreenshotPath,
      fullPage: true
    });
    console.log('✅ Additional: Month filter screenshot saved to:', monthScreenshotPath);

    // Additional verification: Test 'This Year' filter
    const yearFilterButton = page.locator('button:has-text("This Year")');
    await yearFilterButton.click();
    await page.waitForTimeout(500);

    const yearButtonClasses = await yearFilterButton.getAttribute('class');
    expect(yearButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ Additional: "This Year" filter works');

    // Take snapshot of year filter
    const yearScreenshotPath = path.join(__dirname, 'HIST-02-filter-year.png');
    await page.screenshot({
      path: yearScreenshotPath,
      fullPage: true
    });
    console.log('✅ Additional: Year filter screenshot saved to:', yearScreenshotPath);

    console.log('\n✅ All acceptance criteria passed for HIST-02');
  });

  test('should show empty state when filter has no matching entries', async ({ page, request }) => {
    const testUser = {
      email: `hist02empty${Date.now()}@example.com`,
      password: 'Test123456',
      displayName: 'HIST02 Empty Filter User',
    };

    // Register a brand new user (should have no history)
    const registerResponse = await request.post('http://localhost:8080/api/auth/register', {
      data: {
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.displayName,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    const authToken = registerData.token;

    // Set the auth token and navigate to history page
    await page.goto('http://localhost:3000/history');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for history page to load
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 10000 });

    // Verify empty state is displayed when user has no history at all
    const emptyStateHeading = page.locator('h2:has-text("No Puzzles Yet!")');
    await expect(emptyStateHeading).toBeVisible({ timeout: 5000 });
    console.log('✅ Empty state is displayed for user with no history');

    // Verify filter is NOT visible in empty state (filters only show when there's history)
    const filterSection = page.locator('text="Filter"');
    const filterVisible = await filterSection.isVisible().catch(() => false);
    expect(filterVisible).toBe(false);
    console.log('✅ Filter controls are hidden in empty state');

    console.log('\n✅ Empty state test passed for HIST-02');
  });

  test('should maintain filter selection across page interactions', async ({ page, request }) => {
    const testUser = {
      email: 'hist02persist@example.com',
      password: 'Test123456',
      displayName: 'HIST02 Persist User',
    };

    // Login/register user
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
        },
      });
    } catch {
      // User exists
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

    // Create history entry
    const todayPuzzleResponse = await request.get('http://localhost:8080/api/puzzles/today');
    const todayPuzzle = await todayPuzzleResponse.json();

    await request.post('http://localhost:8080/api/users/me/history', {
      data: {
        puzzleId: todayPuzzle.id,
        solveTime: 150,
        completed: true,
        accuracy: 92.0,
        hintsUsed: 0,
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    // Navigate to history page
    await page.goto('http://localhost:3000/history');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 10000 });

    // Select 'This Month' filter
    const monthFilterButton = page.locator('button:has-text("This Month")');
    await monthFilterButton.click();
    await page.waitForTimeout(300);

    // Verify filter is active
    let monthButtonClasses = await monthFilterButton.getAttribute('class');
    expect(monthButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ "This Month" filter selected');

    // Interact with sort buttons (should not affect filter selection)
    const fastestSortButton = page.locator('button:has-text("Fastest")');
    await fastestSortButton.click();
    await page.waitForTimeout(300);

    // Verify filter is still active after sorting
    monthButtonClasses = await monthFilterButton.getAttribute('class');
    expect(monthButtonClasses).toContain('bg-[#7B61FF]');
    console.log('✅ Filter selection persists after sorting');

    console.log('\n✅ Filter persistence test passed for HIST-02');
  });
});
