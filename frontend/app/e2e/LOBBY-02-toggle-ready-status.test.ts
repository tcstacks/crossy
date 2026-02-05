import { test, expect } from '@playwright/test';

/**
 * LOBBY-02: Toggle ready status
 *
 * Acceptance Criteria:
 * - Complete ROOM-01 or JOIN-01 to be in a room lobby
 * - Verify 'Ready' button is visible
 * - Verify your status shows as 'Not Ready'
 * - Intercept API call to POST /api/rooms/:id/ready
 * - Click 'Ready' button
 * - Verify API returns 200 with ready: true
 * - Verify your status shows as 'Ready'
 * - Click button again to toggle off
 * - Verify status changes back to 'Not Ready'
 * - Take screenshots of both states
 */

const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080';

test.describe('LOBBY-02: Toggle ready status', () => {
  test('Player can toggle ready status in lobby', async ({ page }) => {
    // Generate unique credentials for this test
    const timestamp = Date.now();
    const testEmail = `readytest${timestamp}@example.com`;
    const testUsername = `ReadyPlayer${timestamp}`;
    const testPassword = 'SecurePass123!';

    // ============================================
    // Setup: Register and login via API
    // ============================================

    const registerResponse = await page.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        displayName: testUsername,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    const authToken = registerData.token;

    // Set the auth token in localStorage
    await page.goto(FRONTEND_URL);
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('✓ Setup: User registered and logged in');

    // ============================================
    // AC1: Complete ROOM-01 to create a room
    // ============================================

    // Navigate to create room page
    await page.goto(`${FRONTEND_URL}/room/create`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Navigated to /room/create');

    // Create the room
    const createButton = page.locator('button:has-text("Create Room")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Wait for navigation to lobby
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });
    const currentUrl = page.url();
    const roomCode = currentUrl.match(/\/room\/([A-Z0-9]{6})$/)?.[1];
    expect(roomCode).toBeDefined();
    expect(roomCode?.length).toBe(6);

    console.log(`✓ AC1: Room created successfully with code: ${roomCode}`);

    // Wait for lobby to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text="Room Lobby"', { timeout: 10000 });

    // Extract room ID from the room (we'll need this for API interception)
    // The room ID should be in the network requests or we can derive it from the API calls

    // ============================================
    // AC2: Verify 'Ready' button is visible
    // ============================================

    const readyButton = page.locator('button').filter({ hasText: /^Ready Up$|^Ready$/ }).first();
    await expect(readyButton).toBeVisible({ timeout: 5000 });
    console.log('✓ AC2: Ready button is visible');

    // ============================================
    // AC3: Verify your status shows as 'Not Ready'
    // ============================================

    // Find the player card for current user (marked with "You")
    const yourPlayerCard = page.locator('div:has-text("You")').filter({
      has: page.locator('div.rounded-full') // Avatar circle
    }).first();

    await expect(yourPlayerCard).toBeVisible({ timeout: 5000 });

    // Check for "Not Ready" status in the player card
    const notReadyStatus = yourPlayerCard.locator('text="Not Ready"');
    await expect(notReadyStatus).toBeVisible({ timeout: 5000 });
    console.log('✓ AC3: Status shows as "Not Ready"');

    // ============================================
    // AC4: Intercept API call to POST /api/rooms/:id/ready
    // ============================================

    // Setup API interception before clicking
    const readyApiPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/rooms/') &&
        response.url().includes('/ready') &&
        response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // ============================================
    // AC5: Click 'Ready' button
    // ============================================

    await readyButton.click();
    console.log('✓ AC5: Clicked Ready button');

    // ============================================
    // AC6: Verify API returns 200 with ready: true
    // ============================================

    const readyApiResponse = await readyApiPromise;
    expect(readyApiResponse.status()).toBe(200);

    const readyApiData = await readyApiResponse.json();
    expect(readyApiData).toHaveProperty('ready');
    expect(readyApiData.ready).toBe(true);
    console.log('✓ AC6: API returned 200 with ready: true');

    // ============================================
    // AC7: Verify your status shows as 'Ready'
    // ============================================

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Check for "Ready" status badge in the player card
    const readyStatus = yourPlayerCard.locator('div:has-text("Ready")').filter({
      has: page.locator('svg') // Check icon
    });
    await expect(readyStatus).toBeVisible({ timeout: 5000 });
    console.log('✓ AC7: Status shows as "Ready"');

    // Verify the button text changed
    const readyButtonAfter = page.locator('button').filter({ hasText: /Ready - Click to Unready/ }).first();
    await expect(readyButtonAfter).toBeVisible({ timeout: 5000 });
    console.log('✓ Ready button shows "Ready - Click to Unready"');

    // ============================================
    // AC8: Take screenshot of Ready state
    // ============================================

    await page.screenshot({
      path: 'frontend/app/e2e/LOBBY-02-ready-state.png',
      fullPage: true
    });
    console.log('✓ AC8: Screenshot saved - Ready state');

    // ============================================
    // AC9: Click button again to toggle off
    // ============================================

    // Setup API interception for the toggle off request
    const unreadyApiPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/rooms/') &&
        response.url().includes('/ready') &&
        response.request().method() === 'POST',
      { timeout: 10000 }
    );

    await readyButtonAfter.click();
    console.log('✓ AC9: Clicked button to toggle off');

    // ============================================
    // AC10: Verify status changes back to 'Not Ready'
    // ============================================

    // Verify API returns ready: false
    const unreadyApiResponse = await unreadyApiPromise;
    expect(unreadyApiResponse.status()).toBe(200);

    const unreadyApiData = await unreadyApiResponse.json();
    expect(unreadyApiData).toHaveProperty('ready');
    expect(unreadyApiData.ready).toBe(false);
    console.log('✓ AC10: API returned 200 with ready: false');

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Check that "Not Ready" status is shown again
    const notReadyStatusAgain = yourPlayerCard.locator('text="Not Ready"');
    await expect(notReadyStatusAgain).toBeVisible({ timeout: 5000 });
    console.log('✓ Status changed back to "Not Ready"');

    // Verify the button text changed back
    const readyButtonAgain = page.locator('button').filter({ hasText: /^Ready Up$/ }).first();
    await expect(readyButtonAgain).toBeVisible({ timeout: 5000 });
    console.log('✓ Ready button shows "Ready Up" again');

    // ============================================
    // AC11: Take screenshot of Not Ready state
    // ============================================

    await page.screenshot({
      path: 'frontend/app/e2e/LOBBY-02-not-ready-state.png',
      fullPage: true
    });
    console.log('✓ AC11: Screenshot saved - Not Ready state');

    console.log('\n✅ LOBBY-02: Toggle ready status - ALL ACCEPTANCE CRITERIA PASSED');
  });

  test('Multiple players can see each other\'s ready status', async ({ browser }) => {
    // This test simulates two users to verify ready status synchronization
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const timestamp = Date.now();

      // ============================================
      // User 1: Register and create room
      // ============================================

      const user1Email = `readyuser1_${timestamp}@example.com`;
      const user1Username = `ReadyUser1_${timestamp}`;
      const user1Password = 'SecurePass123!';

      const registerResponse1 = await page1.request.post(`${API_URL}/api/auth/register`, {
        data: {
          email: user1Email,
          password: user1Password,
          displayName: user1Username,
        },
      });

      expect(registerResponse1.ok()).toBeTruthy();
      const user1Data = await registerResponse1.json();
      const user1Token = user1Data.token;

      await page1.goto(FRONTEND_URL);
      await page1.evaluate((token) => {
        localStorage.setItem('auth_token', token);
      }, user1Token);
      await page1.reload();
      await page1.waitForLoadState('networkidle');
      console.log('✓ User 1 logged in');

      // Create room
      await page1.goto(`${FRONTEND_URL}/room/create`);
      await page1.waitForLoadState('networkidle');

      const createButton = page1.locator('button:has-text("Create Room")');
      await createButton.click();
      await page1.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });

      const roomUrl = page1.url();
      const roomCode = roomUrl.match(/\/room\/([A-Z0-9]{6})$/)?.[1];
      expect(roomCode).toBeDefined();
      console.log(`✓ User 1 created room: ${roomCode}`);

      await page1.waitForSelector('text="Room Lobby"', { timeout: 10000 });

      // ============================================
      // User 2: Register and join room
      // ============================================

      const user2Email = `readyuser2_${timestamp}@example.com`;
      const user2Username = `ReadyUser2_${timestamp}`;
      const user2Password = 'SecurePass123!';

      const registerResponse2 = await page2.request.post(`${API_URL}/api/auth/register`, {
        data: {
          email: user2Email,
          password: user2Password,
          displayName: user2Username,
        },
      });

      expect(registerResponse2.ok()).toBeTruthy();
      const user2Data = await registerResponse2.json();
      const user2Token = user2Data.token;

      await page2.goto(FRONTEND_URL);
      await page2.evaluate((token) => {
        localStorage.setItem('auth_token', token);
      }, user2Token);
      await page2.reload();
      await page2.waitForLoadState('networkidle');
      console.log('✓ User 2 logged in');

      // Join room
      await page2.goto(`${FRONTEND_URL}/room/join`);
      await page2.waitForLoadState('networkidle');

      // Enter room code (6 separate input fields)
      if (roomCode) {
        const inputs = page2.locator('input[maxlength="1"]');
        const inputCount = await inputs.count();
        expect(inputCount).toBe(6);

        for (let i = 0; i < 6; i++) {
          await inputs.nth(i).fill(roomCode[i]);
        }
      }

      // Click join button
      const joinButton = page2.locator('button:has-text("Join Room")');
      await joinButton.click();
      await page2.waitForURL(`${FRONTEND_URL}/room/${roomCode}`, { timeout: 10000 });
      console.log('✓ User 2 joined room');

      await page2.waitForSelector('text="Room Lobby"', { timeout: 10000 });

      // ============================================
      // Verify both users see each other as Not Ready
      // ============================================

      // Find User 2's card on User 1's screen
      const user2CardOnPage1 = page1.locator(`div:has-text("${user2Username}")`).filter({
        has: page1.locator('div.rounded-full')
      }).first();
      await expect(user2CardOnPage1).toBeVisible({ timeout: 10000 });

      const user2NotReady = user2CardOnPage1.locator('text="Not Ready"');
      await expect(user2NotReady).toBeVisible({ timeout: 5000 });
      console.log('✓ User 1 sees User 2 as Not Ready');

      // ============================================
      // User 2 toggles ready
      // ============================================

      const user2ReadyButton = page2.locator('button').filter({ hasText: /^Ready Up$|^Ready$/ }).first();
      await user2ReadyButton.click();
      console.log('✓ User 2 clicked Ready');

      // Wait for WebSocket to sync
      await page2.waitForTimeout(1000);
      await page1.waitForTimeout(1000);

      // ============================================
      // Verify User 1 sees User 2 as Ready
      // ============================================

      const user2Ready = user2CardOnPage1.locator('div:has-text("Ready")').filter({
        has: page1.locator('svg') // Check icon
      });
      await expect(user2Ready).toBeVisible({ timeout: 5000 });
      console.log('✓ User 1 sees User 2 as Ready');

      // ============================================
      // User 1 toggles ready
      // ============================================

      const user1ReadyButton = page1.locator('button').filter({ hasText: /^Ready Up$|^Ready$/ }).first();
      await user1ReadyButton.click();
      console.log('✓ User 1 clicked Ready');

      // Wait for WebSocket to sync
      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // ============================================
      // Verify both users show as Ready on both screens
      // ============================================

      // Check User 1's own status on their screen
      const user1OwnCard = page1.locator('div:has-text("You")').filter({
        has: page1.locator('div.rounded-full')
      }).first();
      const user1ReadyStatus = user1OwnCard.locator('div:has-text("Ready")').filter({
        has: page1.locator('svg')
      });
      await expect(user1ReadyStatus).toBeVisible({ timeout: 5000 });
      console.log('✓ User 1 sees themselves as Ready');

      // Check User 2's own status on their screen
      const user2OwnCard = page2.locator('div:has-text("You")').filter({
        has: page2.locator('div.rounded-full')
      }).first();
      const user2ReadyStatus = user2OwnCard.locator('div:has-text("Ready")').filter({
        has: page2.locator('svg')
      });
      await expect(user2ReadyStatus).toBeVisible({ timeout: 5000 });
      console.log('✓ User 2 sees themselves as Ready');

      // Take screenshots
      await page1.screenshot({
        path: 'frontend/app/e2e/LOBBY-02-both-ready-user1.png',
        fullPage: true
      });
      await page2.screenshot({
        path: 'frontend/app/e2e/LOBBY-02-both-ready-user2.png',
        fullPage: true
      });
      console.log('✓ Screenshots saved with both users ready');

      console.log('\n✅ Multiple players ready status synchronization - PASSED');
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
