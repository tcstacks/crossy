import { test, expect } from '@playwright/test';

/**
 * ROOM-02: Room creation with different modes
 *
 * Acceptance Criteria:
 * - Complete AUTH-02 to be logged in
 * - Navigate to /room/create
 * - Verify 'Collaborative' mode option exists
 * - Verify 'Race' mode option exists
 * - Verify 'Relay' mode option exists
 * - Select 'Race' mode
 * - Click 'Create Room'
 * - Verify API request includes mode: 'race'
 * - Verify room is created with race mode
 * - Take screenshot of mode selection
 */

/**
 * Helper function to register and login a test user
 */
async function loginAsTestUser(page: any, baseUrl: string): Promise<{ email: string; password: string; displayName: string }> {
  const timestamp = Date.now();
  const testUser = {
    email: `room02test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    displayName: `Room02User${timestamp}`,
  };

  // Navigate to landing page
  await page.goto(baseUrl);
  await page.waitForSelector('nav', { timeout: 10000 });

  // Open auth modal by clicking the Login button in the header
  const loginButton = page.locator('button:has-text("Login")').first();
  await loginButton.click();

  // Wait for auth modal to appear
  await page.waitForSelector('text=Welcome to Crossy!', { timeout: 5000 });

  // Switch to Register tab
  const registerTab = page.locator('button:has-text("Register")');
  await registerTab.click();

  // Wait for register form to be visible
  await page.waitForSelector('input[placeholder*="username" i]');

  // Fill in registration form
  await page.fill('#register-username', testUser.displayName);
  await page.fill('#register-email', testUser.email);
  await page.fill('#register-password', testUser.password);

  // Submit registration
  const registerButton = page.locator('button:has-text("Register")').last();
  await registerButton.click();

  // Wait for successful registration and redirect
  await page.waitForURL(baseUrl, { timeout: 10000 });

  // Verify we're logged in by checking for user menu or profile link
  await expect(page.locator('text=' + testUser.displayName).or(page.locator('[aria-label="User menu"]'))).toBeVisible({ timeout: 5000 });

  console.log(`✓ Logged in as: ${testUser.displayName}`);

  return testUser;
}

test.describe('ROOM-02: Room creation with different modes', () => {
  let baseUrl: string;
  let apiUrl: string;

  test.beforeAll(() => {
    baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    apiUrl = process.env.API_URL || 'http://localhost:8080';
  });

  test('should create a room with race mode', async ({ page }) => {
    // AC: Complete AUTH-02 to be logged in
    console.log('Step 1: Logging in as test user...');
    await loginAsTestUser(page, baseUrl);
    console.log('✓ Logged in successfully');

    // AC: Navigate to /room/create
    console.log('Step 2: Navigating to /room/create...');
    await page.goto(`${baseUrl}/room/create`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page.locator('h1:has-text("Create a Room")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Navigated to room creation page');

    // AC: Verify 'Collaborative' mode option exists
    console.log('Step 3: Verifying game mode options exist...');
    const collaborativeMode = page.locator('button:has-text("Collaborative")');
    await expect(collaborativeMode).toBeVisible();
    await expect(page.locator('text=Work together to solve the puzzle')).toBeVisible();
    console.log('✓ Collaborative mode option exists');

    // AC: Verify 'Race' mode option exists
    const raceMode = page.locator('button:has-text("Race")');
    await expect(raceMode).toBeVisible();
    await expect(page.locator('text=First to finish wins')).toBeVisible();
    console.log('✓ Race mode option exists');

    // AC: Verify 'Relay' mode option exists
    const relayMode = page.locator('button:has-text("Relay")');
    await expect(relayMode).toBeVisible();
    await expect(page.locator('text=Take turns solving')).toBeVisible();
    console.log('✓ Relay mode option exists');

    // AC: Take screenshot of mode selection
    console.log('Step 4: Taking screenshot of mode selection...');
    await page.screenshot({
      path: 'frontend/tests/ROOM-02-mode-selection.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: ROOM-02-mode-selection.png');

    // AC: Select 'Race' mode
    console.log('Step 5: Selecting Race mode...');
    await raceMode.click();

    // Verify race mode is selected (has active styling)
    await expect(raceMode).toHaveClass(/bg-\[#7B61FF\]/);
    console.log('✓ Race mode selected');

    // Take screenshot of selected race mode
    await page.screenshot({
      path: 'frontend/tests/ROOM-02-race-mode-selected.png',
      fullPage: true
    });

    // AC: Click 'Create Room' and verify API request includes mode: 'race'
    console.log('Step 6: Creating room and verifying API request...');

    // Set up request interception to verify the API call
    let createRoomRequest: any = null;
    const requestPromise = page.waitForRequest(
      request => request.url().includes('/api/rooms') && request.method() === 'POST',
      { timeout: 10000 }
    );

    // Set up response interception to verify the response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/rooms') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // AC: Click 'Create Room'
    const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for and capture the API request
    const request = await requestPromise;
    createRoomRequest = {
      url: request.url(),
      method: request.method(),
      postData: request.postDataJSON(),
    };

    // Wait for and capture the API response
    const response = await responsePromise;
    const createRoomResponse = await response.json();

    // Wait for navigation to room lobby
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
    console.log('✓ Navigated to room lobby');

    // AC: Verify API request includes mode: 'race'
    expect(createRoomRequest).not.toBeNull();
    expect(createRoomRequest.postData).toBeDefined();
    expect(createRoomRequest.postData.mode).toBe('race');
    console.log('✓ API request includes mode: "race"');
    console.log('  Request payload:', JSON.stringify(createRoomRequest.postData, null, 2));

    // AC: Verify room is created with race mode
    expect(createRoomResponse).not.toBeNull();
    expect(createRoomResponse.room).toBeDefined();
    expect(createRoomResponse.room.mode).toBe('race');
    console.log('✓ Room created with race mode');
    console.log('  Room details:', {
      code: createRoomResponse.room.code,
      mode: createRoomResponse.room.mode,
      id: createRoomResponse.room.id,
    });

    // Take final screenshot of room lobby
    await page.screenshot({
      path: 'frontend/tests/ROOM-02-room-lobby.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: ROOM-02-room-lobby.png');

    console.log('\n========================================');
    console.log('✅ ROOM-02: ALL ACCEPTANCE CRITERIA PASSED');
    console.log('========================================\n');
  });

  test('should create a room with collaborative mode', async ({ page }) => {
    // Login
    await loginAsTestUser(page, baseUrl);

    // Navigate to create room
    await page.goto(`${baseUrl}/room/create`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create a Room")')).toBeVisible({ timeout: 10000 });

    // Collaborative should be selected by default
    const collaborativeMode = page.locator('button:has-text("Collaborative")');
    await expect(collaborativeMode).toHaveClass(/bg-\[#7B61FF\]/);

    // Set up request and response promises
    const requestPromise = page.waitForRequest(
      request => request.url().includes('/api/rooms') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/rooms') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Create room
    const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
    await createButton.click();

    // Wait for and capture API request
    const request = await requestPromise;
    const createRoomRequest = {
      postData: request.postDataJSON(),
    };

    // Wait for and capture API response
    const response = await responsePromise;
    const createRoomResponse = await response.json();

    // Wait for navigation
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

    // Verify API request includes mode: 'collaborative'
    expect(createRoomRequest).not.toBeNull();
    expect(createRoomRequest.postData.mode).toBe('collaborative');
    console.log('✓ Collaborative mode API request verified');

    // Verify room created with collaborative mode
    expect(createRoomResponse).not.toBeNull();
    expect(createRoomResponse.room.mode).toBe('collaborative');
    console.log('✓ Room created with collaborative mode');
  });

  test('should create a room with relay mode', async ({ page }) => {
    // Login
    await loginAsTestUser(page, baseUrl);

    // Navigate to create room
    await page.goto(`${baseUrl}/room/create`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create a Room")')).toBeVisible({ timeout: 10000 });

    // Select relay mode
    const relayMode = page.locator('button:has-text("Relay")');
    await relayMode.click();
    await expect(relayMode).toHaveClass(/bg-\[#7B61FF\]/);

    // Set up request and response promises
    const requestPromise = page.waitForRequest(
      request => request.url().includes('/api/rooms') && request.method() === 'POST',
      { timeout: 10000 }
    );

    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/rooms') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Create room
    const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
    await createButton.click();

    // Wait for and capture API request
    const request = await requestPromise;
    const createRoomRequest = {
      postData: request.postDataJSON(),
    };

    // Wait for and capture API response
    const response = await responsePromise;
    const createRoomResponse = await response.json();

    // Wait for navigation
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

    // Verify API request includes mode: 'relay'
    expect(createRoomRequest).not.toBeNull();
    expect(createRoomRequest.postData.mode).toBe('relay');
    console.log('✓ Relay mode API request verified');

    // Verify room created with relay mode
    expect(createRoomResponse).not.toBeNull();
    expect(createRoomResponse.room.mode).toBe('relay');
    console.log('✓ Room created with relay mode');
  });
});
