/**
 * JOIN-01: Enter Room Code to Join - End-to-End Test
 *
 * Acceptance Criteria:
 * - [x] Login as a user
 * - [x] Navigate to /room/join
 * - [x] Verify room code input field is displayed
 * - [x] Enter a valid room code
 * - [x] Click Join button
 * - [x] Verify navigation to room lobby
 * - [x] Take snapshot of join page and lobby
 */

import { test, expect, Page, Browser } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

/**
 * Helper function to register and login a test user
 */
async function loginAsTestUser(page: Page, suffix: string = ''): Promise<{ email: string; password: string; displayName: string }> {
  const timestamp = Date.now();
  const testUser = {
    email: `testuser_${timestamp}${suffix}@example.com`,
    password: 'TestPassword123!',
    displayName: `TestUser${timestamp}${suffix}`,
  };

  // Navigate to landing page
  await page.goto(FRONTEND_URL);

  // Open auth modal by clicking Login button in header
  const loginButton = page.locator('button:has-text("Login")').first();
  await loginButton.click();

  // Wait for auth modal to appear
  await page.waitForSelector('text=Welcome to Crossy!', { timeout: 5000 });

  // Switch to Register tab
  const registerTab = page.locator('button:has-text("Register")');
  await registerTab.click();

  // Fill in registration form
  await page.fill('#register-username', testUser.displayName);
  await page.fill('#register-email', testUser.email);
  await page.fill('#register-password', testUser.password);

  // Submit registration
  const registerButton = page.locator('button[type="submit"]:has-text("Register")');
  await registerButton.click();

  // Wait for successful registration and redirect
  await page.waitForURL(FRONTEND_URL, { timeout: 10000 });

  // Verify we're logged in by checking for user menu or profile link
  await expect(page.locator('text=' + testUser.displayName).or(page.locator('[aria-label="User menu"]'))).toBeVisible({ timeout: 5000 });

  return testUser;
}

/**
 * Helper function to create a room and return the room code
 */
async function createRoom(page: Page): Promise<string> {
  // Navigate to create room page
  await page.goto(`${FRONTEND_URL}/room/create`);
  await page.waitForLoadState('networkidle');

  // Verify room creation form is displayed
  await expect(page.locator('h1:has-text("Create a Room")')).toBeVisible();

  // Use default settings (Collaborative, 4 players, Today's Puzzle)
  const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
  await expect(createButton).toBeVisible();
  await expect(createButton).toBeEnabled();

  // Click Create Room button
  await createButton.click();

  // Wait for navigation to room lobby
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });

  // Extract room code from URL
  const urlMatch = page.url().match(/\/room\/([A-Z0-9]{6})$/);
  expect(urlMatch).not.toBeNull();
  const roomCode = urlMatch![1];

  console.log(`Room created with code: ${roomCode}`);
  return roomCode;
}

test.describe('JOIN-01: Enter Room Code to Join', () => {
  test('should allow user to enter room code and join a room', async ({ browser }) => {
    // Create two separate browser contexts for host and joiner
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const joinerContext = await browser.newContext();
    const joinerPage = await joinerContext.newPage();

    try {
      // Host: Create a room
      console.log('Host: Logging in and creating a room...');
      const hostUser = await loginAsTestUser(hostPage, '_host');
      console.log(`Host logged in as: ${hostUser.displayName}`);

      const roomCode = await createRoom(hostPage);
      console.log(`Host created room with code: ${roomCode}`);

      // Joiner: Step 1: Login as a user
      console.log('Joiner: Step 1 - Logging in as test user...');
      const joinerUser = await loginAsTestUser(joinerPage, '_joiner');
      console.log(`Joiner logged in as: ${joinerUser.displayName}`);

      // Joiner: Step 2: Navigate to /room/join
      console.log('Joiner: Step 2 - Navigating to /room/join...');
      await joinerPage.goto(`${FRONTEND_URL}/room/join`);
      await joinerPage.waitForLoadState('networkidle');

      // Joiner: Step 3: Verify room code input field is displayed
      console.log('Joiner: Step 3 - Verifying room code input fields are displayed...');
      await expect(joinerPage.locator('h1:has-text("Join a Room")')).toBeVisible();
      await expect(joinerPage.locator('label:has-text("Room Code")')).toBeVisible();
      await expect(joinerPage.locator('text=Enter the 6-character code shared by your host')).toBeVisible();

      // Verify 6 input fields are present
      const inputFields = joinerPage.locator('input[type="text"][maxlength="6"]');
      await expect(inputFields).toHaveCount(6);

      // Verify Join button is present but disabled (no code entered yet)
      const joinButton = joinerPage.locator('button[type="submit"]:has-text("Join Room")');
      await expect(joinButton).toBeVisible();
      await expect(joinButton).toBeDisabled();

      // Take screenshot of join page
      const screenshotDir = path.join(process.cwd(), 'frontend', 'tests');
      await joinerPage.screenshot({
        path: path.join(screenshotDir, 'JOIN-01-join-page.png'),
        fullPage: true
      });
      console.log('Screenshot saved: JOIN-01-join-page.png');

      // Joiner: Step 4: Enter a valid room code
      console.log(`Joiner: Step 4 - Entering room code: ${roomCode}...`);

      // Enter room code character by character
      const codeChars = roomCode.split('');
      for (let i = 0; i < codeChars.length; i++) {
        const input = joinerPage.locator(`input[type="text"]`).nth(i);
        await input.fill(codeChars[i]);
      }

      // Verify all inputs are filled
      for (let i = 0; i < 6; i++) {
        const input = joinerPage.locator(`input[type="text"]`).nth(i);
        await expect(input).toHaveValue(codeChars[i]);
      }
      console.log('Room code entered successfully');

      // Verify Join button is now enabled
      await expect(joinButton).toBeEnabled();

      // Take screenshot of filled join form
      await joinerPage.screenshot({
        path: path.join(screenshotDir, 'JOIN-01-join-page-filled.png'),
        fullPage: true
      });
      console.log('Screenshot saved: JOIN-01-join-page-filled.png');

      // Joiner: Step 5: Click Join button
      console.log('Joiner: Step 5 - Clicking Join button...');
      await joinButton.click();

      // Joiner: Step 6: Verify navigation to room lobby
      console.log('Joiner: Step 6 - Verifying navigation to room lobby...');
      await joinerPage.waitForURL(`${FRONTEND_URL}/room/${roomCode}`, { timeout: 10000 });
      console.log(`Joiner navigated to room lobby: ${joinerPage.url()}`);

      // Verify lobby page is displayed
      await expect(joinerPage.locator('h1:has-text("Room Lobby")')).toBeVisible();

      // Verify room code is displayed on the lobby page
      await expect(joinerPage.locator(`text=${roomCode}`)).toBeVisible();
      await expect(joinerPage.locator('h2:has-text("Room Code")')).toBeVisible();

      // Verify joiner is listed as a player
      await expect(joinerPage.locator(`text=${joinerUser.displayName}`)).toBeVisible();

      // Verify player count shows 2 players
      await expect(joinerPage.locator('text=Players (2/4)')).toBeVisible({ timeout: 5000 });

      // Verify joiner sees the host
      await expect(joinerPage.locator(`text=${hostUser.displayName}`)).toBeVisible();

      // Verify joiner sees Ready button (not Start Game button, since they're not the host)
      await expect(joinerPage.locator('button:has-text("Ready")')).toBeVisible();
      await expect(joinerPage.locator('button:has-text("Start Game")')).not.toBeVisible();

      // Verify Leave Room button is present
      await expect(joinerPage.locator('button:has-text("Leave Room")')).toBeVisible();

      // Joiner: Step 7: Take snapshot of lobby
      console.log('Joiner: Step 7 - Taking snapshot of room lobby...');
      await joinerPage.screenshot({
        path: path.join(screenshotDir, 'JOIN-01-lobby-joiner-view.png'),
        fullPage: true
      });
      console.log('Screenshot saved: JOIN-01-lobby-joiner-view.png');

      // Also verify host sees the new player
      console.log('Host: Verifying new player appears in lobby...');
      await hostPage.waitForSelector(`text=${joinerUser.displayName}`, { timeout: 5000 });
      await expect(hostPage.locator('text=Players (2/4)')).toBeVisible();

      // Take screenshot of host view with both players
      await hostPage.screenshot({
        path: path.join(screenshotDir, 'JOIN-01-lobby-host-view.png'),
        fullPage: true
      });
      console.log('Screenshot saved: JOIN-01-lobby-host-view.png');

      // Save test snapshot
      const snapshotContent = `
JOIN-01 Test Snapshot - Enter Room Code to Join
================================================

Room Code: ${roomCode}
URL: ${joinerPage.url()}

Host User: ${hostUser.displayName} (${hostUser.email})
Joiner User: ${joinerUser.displayName} (${joinerUser.email})

Room Configuration:
- Game Mode: Collaborative (default)
- Max Players: 4
- Current Players: 2

Players in Lobby:
1. ${hostUser.displayName} (Host)
2. ${joinerUser.displayName} (Joiner)

Test Verification:
✓ Room code input fields displayed (6 individual inputs)
✓ Room code entered successfully: ${roomCode}
✓ Join button clicked
✓ Navigation to room lobby successful
✓ Joiner appears in lobby player list
✓ Host sees joiner in lobby
✓ Player count updated to 2/4
✓ Joiner sees Ready button (not host controls)
✓ All acceptance criteria verified

Test completed successfully at: ${new Date().toISOString()}
`;

      fs.writeFileSync(
        path.join(screenshotDir, 'JOIN-01-snapshot.txt'),
        snapshotContent
      );
      console.log('Snapshot saved: JOIN-01-snapshot.txt');

      console.log('✓ All acceptance criteria verified successfully!');

    } finally {
      // Cleanup: Close both contexts
      await hostContext.close();
      await joinerContext.close();
    }
  });

  test('should display error for invalid room code', async ({ page }) => {
    // Login
    console.log('Logging in as test user...');
    const testUser = await loginAsTestUser(page);

    // Navigate to join page
    await page.goto(`${FRONTEND_URL}/room/join`);
    await page.waitForLoadState('networkidle');

    // Enter invalid room code
    const invalidCode = 'XXXXXX';
    console.log(`Entering invalid room code: ${invalidCode}...`);

    const codeChars = invalidCode.split('');
    for (let i = 0; i < codeChars.length; i++) {
      const input = page.locator(`input[type="text"]`).nth(i);
      await input.fill(codeChars[i]);
    }

    // Click Join button
    const joinButton = page.locator('button[type="submit"]:has-text("Join Room")');
    await expect(joinButton).toBeEnabled();
    await joinButton.click();

    // Verify error message is displayed
    console.log('Verifying error message for invalid room code...');
    await expect(page.locator('text=Room not found')).toBeVisible({ timeout: 5000 });

    // Verify user stays on join page
    expect(page.url()).toContain('/room/join');

    console.log('✓ Error handling for invalid room code verified');
  });

  test('should support pasting room code', async ({ page }) => {
    // Login
    const testUser = await loginAsTestUser(page);

    // Navigate to join page
    await page.goto(`${FRONTEND_URL}/room/join`);
    await page.waitForLoadState('networkidle');

    // Simulate pasting a room code
    const testCode = 'ABC123';
    console.log(`Testing paste functionality with code: ${testCode}...`);

    // Focus first input
    const firstInput = page.locator(`input[type="text"]`).first();
    await firstInput.click();

    // Paste the code (simulated by typing all characters at once)
    await firstInput.fill(testCode);

    // Verify all inputs are filled
    for (let i = 0; i < 6; i++) {
      const input = page.locator(`input[type="text"]`).nth(i);
      const expectedValue = testCode[i];
      await expect(input).toHaveValue(expectedValue);
    }

    // Verify Join button is enabled
    const joinButton = page.locator('button[type="submit"]:has-text("Join Room")');
    await expect(joinButton).toBeEnabled();

    console.log('✓ Paste functionality verified');
  });

  test('should support keyboard navigation between inputs', async ({ page }) => {
    // Login
    const testUser = await loginAsTestUser(page);

    // Navigate to join page
    await page.goto(`${FRONTEND_URL}/room/join`);
    await page.waitForLoadState('networkidle');

    console.log('Testing keyboard navigation...');

    // Focus first input
    const firstInput = page.locator(`input[type="text"]`).first();
    await firstInput.click();

    // Type characters and verify auto-advance
    await page.keyboard.type('A');
    await expect(page.locator(`input[type="text"]`).nth(0)).toHaveValue('A');

    // Second character should auto-focus next input
    await page.keyboard.type('B');
    await expect(page.locator(`input[type="text"]`).nth(1)).toHaveValue('B');

    // Continue typing
    await page.keyboard.type('C123');

    // Verify all inputs filled
    const expectedCode = ['A', 'B', 'C', '1', '2', '3'];
    for (let i = 0; i < 6; i++) {
      const input = page.locator(`input[type="text"]`).nth(i);
      await expect(input).toHaveValue(expectedCode[i]);
    }

    // Test backspace navigation
    await page.keyboard.press('Backspace');
    await expect(page.locator(`input[type="text"]`).nth(5)).toHaveValue('');

    // Test arrow key navigation
    await page.keyboard.press('ArrowLeft');
    const input4 = page.locator(`input[type="text"]`).nth(4);
    await expect(input4).toBeFocused();

    await page.keyboard.press('ArrowRight');
    const input5 = page.locator(`input[type="text"]`).nth(5);
    await expect(input5).toBeFocused();

    console.log('✓ Keyboard navigation verified');
  });
});
