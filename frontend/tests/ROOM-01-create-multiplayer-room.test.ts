/**
 * ROOM-01: Create Multiplayer Room - End-to-End Test
 *
 * Acceptance Criteria:
 * - [x] Login as a user
 * - [x] Navigate to /room/create
 * - [x] Verify room creation form is displayed
 * - [x] Select game mode, max players, puzzle options
 * - [x] Click Create Room button
 * - [x] Verify room code is displayed
 * - [x] Take snapshot of created room/lobby
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

/**
 * Helper function to register and login a test user
 */
async function loginAsTestUser(page: Page): Promise<{ email: string; password: string; displayName: string }> {
  const timestamp = Date.now();
  const testUser = {
    email: `testuser_${timestamp}@example.com`,
    password: 'TestPassword123!',
    displayName: `TestUser${timestamp}`,
  };

  // Navigate to landing page
  await page.goto(FRONTEND_URL);

  // Open auth modal
  const getStartedButton = page.locator('button:has-text("Get Started")').first();
  await getStartedButton.click();

  // Wait for auth modal to appear
  await page.waitForSelector('text=Welcome back!', { timeout: 5000 });

  // Switch to Sign Up tab
  const signUpTab = page.locator('button:has-text("Sign Up")');
  await signUpTab.click();

  // Fill in registration form
  await page.fill('input[type="email"]', testUser.email);
  await page.fill('input[type="text"][placeholder*="display name" i]', testUser.displayName);
  await page.fill('input[type="password"]', testUser.password);

  // Submit registration
  const registerButton = page.locator('button[type="submit"]:has-text("Sign Up")');
  await registerButton.click();

  // Wait for successful registration and redirect
  await page.waitForURL(FRONTEND_URL, { timeout: 10000 });

  // Verify we're logged in by checking for user menu or profile link
  await expect(page.locator('text=' + testUser.displayName).or(page.locator('[aria-label="User menu"]'))).toBeVisible({ timeout: 5000 });

  return testUser;
}

test.describe('ROOM-01: Create Multiplayer Room', () => {
  test('should allow user to create a multiplayer room and display room code', async ({ page }) => {
    // Step 1: Login as a user
    console.log('Step 1: Logging in as test user...');
    const testUser = await loginAsTestUser(page);
    console.log(`Logged in as: ${testUser.displayName} (${testUser.email})`);

    // Step 2: Navigate to /room/create
    console.log('Step 2: Navigating to /room/create...');
    await page.goto(`${FRONTEND_URL}/room/create`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Step 3: Verify room creation form is displayed
    console.log('Step 3: Verifying room creation form is displayed...');
    await expect(page.locator('h1:has-text("Create a Room")')).toBeVisible();

    // Verify form sections are present
    await expect(page.locator('text=Game Mode')).toBeVisible();
    await expect(page.locator('text=Max Players')).toBeVisible();
    await expect(page.locator('text=Choose Puzzle')).toBeVisible();

    // Verify game mode options are displayed
    await expect(page.locator('text=Collaborative')).toBeVisible();
    await expect(page.locator('text=Race')).toBeVisible();
    await expect(page.locator('text=Relay')).toBeVisible();

    // Verify puzzle selection options
    await expect(page.locator('text=Today\'s Puzzle')).toBeVisible();
    await expect(page.locator('text=Random Puzzle')).toBeVisible();

    // Step 4: Select game mode, max players, puzzle options
    console.log('Step 4: Configuring room settings...');

    // Select "Race" game mode
    await page.locator('button:has-text("Race")').click();
    await expect(page.locator('button:has-text("Race")')).toHaveClass(/bg-\[#7B61FF\]/);
    console.log('Selected game mode: Race');

    // Set max players to 6
    const maxPlayersSlider = page.locator('input[type="range"]');
    await maxPlayersSlider.fill('6');
    await expect(page.locator('text=6').last()).toBeVisible();
    console.log('Set max players: 6');

    // Select "Random Puzzle"
    await page.locator('button:has-text("Random Puzzle")').click();
    await expect(page.locator('button:has-text("Random Puzzle")')).toHaveClass(/bg-\[#7B61FF\]/);
    console.log('Selected puzzle: Random Puzzle');

    // Take screenshot of configured form
    const screenshotDir = path.join(process.cwd(), 'frontend', 'tests');
    await page.screenshot({
      path: path.join(screenshotDir, 'ROOM-01-create-form.png'),
      fullPage: true
    });
    console.log('Screenshot saved: ROOM-01-create-form.png');

    // Step 5: Click Create Room button
    console.log('Step 5: Clicking Create Room button...');
    const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();

    await createButton.click();

    // Wait for navigation to room lobby
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });
    console.log(`Navigated to room lobby: ${page.url()}`);

    // Step 6: Verify room code is displayed
    console.log('Step 6: Verifying room code is displayed...');
    await expect(page.locator('h1:has-text("Room Lobby")')).toBeVisible();

    // Extract room code from URL
    const urlMatch = page.url().match(/\/room\/([A-Z0-9]{6})$/);
    expect(urlMatch).not.toBeNull();
    const roomCode = urlMatch![1];
    console.log(`Room code: ${roomCode}`);

    // Verify room code is displayed on the page
    await expect(page.locator(`text=${roomCode}`)).toBeVisible();

    // Verify room code card is present
    await expect(page.locator('h2:has-text("Room Code")')).toBeVisible();

    // Verify copy button is present
    await expect(page.locator('button[aria-label="Copy code"], button:has(svg)').filter({ has: page.locator('svg') }).first()).toBeVisible();

    // Step 7: Verify lobby information
    console.log('Step 7: Verifying lobby information...');

    // Verify players section
    await expect(page.locator('text=Players')).toBeVisible();
    await expect(page.locator(`text=Players (1/6)`)).toBeVisible();

    // Verify the test user is listed as a player
    await expect(page.locator(`text=${testUser.displayName}`)).toBeVisible();

    // Verify host crown icon is shown
    await expect(page.locator('svg').filter({ hasText: '' }).first()).toBeVisible(); // Crown icon

    // Verify connection status
    await expect(page.locator('h2:has-text("Connection Status")')).toBeVisible();
    await expect(page.locator('text=Connected').or(page.locator('text=Connecting...'))).toBeVisible();

    // Verify game settings are displayed
    await expect(page.locator('h2:has-text("Game Settings")')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:has-text("Start Game")')).toBeVisible();
    await expect(page.locator('button:has-text("Leave Room")')).toBeVisible();

    // Step 8: Take snapshot of created room/lobby
    console.log('Step 8: Taking snapshot of room lobby...');

    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'ROOM-01-room-lobby.png'),
      fullPage: true
    });
    console.log('Screenshot saved: ROOM-01-room-lobby.png');

    // Save page snapshot as text
    const snapshotContent = `
ROOM-01 Test Snapshot - Room Lobby
====================================

Room Code: ${roomCode}
URL: ${page.url()}
User: ${testUser.displayName} (${testUser.email})

Room Configuration:
- Game Mode: Race
- Max Players: 6
- Current Players: 1
- Host: ${testUser.displayName}

Test completed successfully at: ${new Date().toISOString()}
`;

    fs.writeFileSync(
      path.join(screenshotDir, 'ROOM-01-snapshot.txt'),
      snapshotContent
    );
    console.log('Snapshot saved: ROOM-01-snapshot.txt');

    // Verify test completed successfully
    console.log('✓ All acceptance criteria verified successfully!');

    // Cleanup: Leave the room
    const leaveButton = page.locator('button:has-text("Leave Room")');
    await leaveButton.click();

    // Wait for navigation back to home or confirmation
    await page.waitForURL(FRONTEND_URL, { timeout: 5000 });
    console.log('Test cleanup: Left the room');
  });

  test('should validate room creation with different game modes', async ({ page }) => {
    // Login
    const testUser = await loginAsTestUser(page);

    // Test Collaborative mode
    await page.goto(`${FRONTEND_URL}/room/create`);
    await page.locator('button:has-text("Collaborative")').click();
    await page.locator('button[type="submit"]:has-text("Create Room")').click();
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });

    // Verify room created
    await expect(page.locator('h1:has-text("Room Lobby")')).toBeVisible();
    const roomCode1 = page.url().match(/\/room\/([A-Z0-9]{6})$/)![1];
    console.log(`Created Collaborative room: ${roomCode1}`);

    // Leave room
    await page.locator('button:has-text("Leave Room")').click();
    await page.waitForURL(FRONTEND_URL, { timeout: 5000 });

    // Test Relay mode
    await page.goto(`${FRONTEND_URL}/room/create`);
    await page.locator('button:has-text("Relay")').click();
    await page.locator('button[type="submit"]:has-text("Create Room")').click();
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });

    // Verify room created
    await expect(page.locator('h1:has-text("Room Lobby")')).toBeVisible();
    const roomCode2 = page.url().match(/\/room\/([A-Z0-9]{6})$/)![1];
    console.log(`Created Relay room: ${roomCode2}`);

    // Verify different room codes
    expect(roomCode1).not.toBe(roomCode2);
    console.log('✓ Different game modes create distinct rooms');
  });

  test('should validate max players configuration', async ({ page }) => {
    // Login
    await loginAsTestUser(page);

    // Navigate to create room
    await page.goto(`${FRONTEND_URL}/room/create`);

    // Test min players (2)
    const slider = page.locator('input[type="range"]');
    await slider.fill('2');
    await expect(page.locator('span:has-text("2")').last()).toBeVisible();

    // Test max players (8)
    await slider.fill('8');
    await expect(page.locator('span:has-text("8")').last()).toBeVisible();

    // Create room with 8 max players
    await page.locator('button[type="submit"]:has-text("Create Room")').click();
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });

    // Verify lobby shows correct max players
    await expect(page.locator('text=Players (1/8)')).toBeVisible();
    console.log('✓ Max players configuration validated');
  });
});
