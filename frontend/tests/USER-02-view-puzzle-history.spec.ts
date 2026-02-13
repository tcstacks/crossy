import { test, expect } from '@playwright/test';

test.describe('USER-02: View puzzle history', () => {
  test('should display empty history state for user with no history', async ({ page }) => {
    // Mock authentication - set up a logged-in user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-token-for-history-test');
    });

    // Mock the /api/users/me endpoint (for auth check)
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com',
          isGuest: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });

    // Intercept API call to GET /api/users/me/history
    let historyRequestMade = false;
    await page.route('**/api/users/me/history', async route => {
      historyRequestMade = true;
      // Return empty history array
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    console.log('✓ API routes mocked');

    // Navigate to /history
    await page.goto('/history');
    console.log('✓ Navigated to /history');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 5000 });
    console.log('✓ History page loaded');

    // Verify API call to GET /api/users/me/history was made
    await page.waitForTimeout(1000); // Give time for API call
    expect(historyRequestMade).toBe(true);
    console.log('✓ API call to GET /api/users/me/history intercepted');
    console.log('✓ API returned 200 with puzzle history array (empty)');

    // Verify empty state is displayed
    await expect(page.locator('text=No Puzzles Yet!')).toBeVisible({ timeout: 5000 });
    console.log('✓ Empty state is displayed (no history)');

    await expect(page.locator('text=Start solving puzzles to build your history.')).toBeVisible();
    console.log('✓ Empty state message is displayed');

    // Verify Start Solving button is present
    await expect(page.locator('a[href="/play"]:has-text("Start Solving")')).toBeVisible();
    console.log('✓ Start Solving button is present');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/USER-02-history-empty.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: USER-02-history-empty.png');

    console.log('\n✅ USER-02: View puzzle history (empty state) test PASSED');
  });

  test('should display puzzle history with multiple entries', async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-token-for-history-test-2');
    });

    // Mock the /api/users/me endpoint
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com',
          isGuest: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });

    // Mock the history API to return sample data
    let historyRequestMade = false;
    const mockHistory = [
      {
        id: '1',
        userId: 'test-user',
        puzzleId: 'puzzle-1',
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        timeTaken: 300, // 5 minutes
        moveCount: 50,
        solved: true
      },
      {
        id: '2',
        userId: 'test-user',
        puzzleId: 'puzzle-2',
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        timeTaken: 450, // 7.5 minutes
        moveCount: 75,
        solved: true
      },
      {
        id: '3',
        userId: 'test-user',
        puzzleId: 'puzzle-3',
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
        timeTaken: 600, // 10 minutes
        moveCount: 100,
        solved: false
      }
    ];

    await page.route('**/api/users/me/history', async route => {
      historyRequestMade = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockHistory)
      });
    });
    console.log('✓ API routes mocked with sample history');

    // Navigate to history page
    await page.goto('/history');
    console.log('✓ Navigated to /history');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Puzzle History")', { timeout: 5000 });
    console.log('✓ History page loaded');

    // Verify API call was made
    await page.waitForTimeout(1000);
    expect(historyRequestMade).toBe(true);
    console.log('✓ API call to GET /api/users/me/history intercepted');
    console.log('✓ API returned 200 with puzzle history array (3 entries)');

    // Wait for history entries to render
    await page.waitForSelector('text=Puzzle Completed', { timeout: 5000 });

    // Verify history list is displayed
    const historyEntries = page.locator('[class*="crossy-card"][class*="p-6"]').filter({
      has: page.locator('text=Puzzle Completed')
    });
    const entryCount = await historyEntries.count();
    expect(entryCount).toBe(3);
    console.log(`✓ History list is displayed with ${entryCount} entries`);

    // Verify each entry has required fields
    for (let i = 0; i < entryCount; i++) {
      const entry = historyEntries.nth(i);

      // If history exists: verify each entry shows puzzle date
      const hasDate = await entry.getByText(/\w+ \d+, \d{4}/).count() > 0; // Matches "Feb 3, 2026" format
      expect(hasDate).toBe(true);

      // If history exists: verify each entry shows solve time
      await expect(entry.locator('text=Time')).toBeVisible();
      const hasTimeValue = await entry.getByText(/\d+:\d+/).count() > 0; // Matches "5:00" format
      expect(hasTimeValue).toBe(true);

      // If history exists: verify each entry shows completion status
      await expect(entry.locator('text=Status')).toBeVisible();
      const statusText = await entry.locator('text=Status').locator('..').locator('p').last().textContent();
      expect(statusText === 'Solved' || statusText === 'Incomplete').toBe(true);
    }
    console.log('✓ Each entry shows puzzle date');
    console.log('✓ Each entry shows solve time');
    console.log('✓ Each entry shows completion status');

    // Verify summary stats are displayed
    await expect(page.locator('text=Summary')).toBeVisible();
    await expect(page.locator('text=Puzzles Solved')).toBeVisible();
    await expect(page.locator('text=Avg Time')).toBeVisible();
    await expect(page.locator('text=Best Time')).toBeVisible();
    console.log('✓ Summary statistics are displayed');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/USER-02-history-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: USER-02-history-page.png');

    console.log('\n✅ USER-02: View puzzle history test PASSED - All acceptance criteria met');
  });

  test('should redirect unauthenticated users', async ({ page }) => {
    // Ensure no auth token
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Mock the API to return 401 for unauthorized
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' })
      });
    });

    // Try to navigate to /history
    await page.goto('/history');

    // Should redirect to home page (this is handled by ProtectedRoute)
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toContain('/');
    console.log('✓ Unauthenticated user redirected from /history to home page');

    console.log('\n✅ USER-02: Redirect unauthenticated users test PASSED');
  });
});
