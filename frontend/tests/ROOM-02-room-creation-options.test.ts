import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';

/**
 * ROOM-02: Room creation form options
 *
 * Test Suite: Verify room creation form has all required options
 *
 * Acceptance Criteria:
 * - Login and navigate to /room/create
 * - Verify game mode selector has options (Collaborative/Race/Relay)
 * - Verify max players selector allows 2-8 players
 * - Verify puzzle selection options exist (Today's/Random/Archive)
 * - Take snapshot of form options
 */

test.describe('ROOM-02: Room creation form options', () => {
  let baseUrl: string;

  test.beforeAll(() => {
    baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  });

  test('should display all room creation form options', async ({ page }) => {
    // Navigate to the application
    await page.goto(baseUrl);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on login/sign up button to open auth modal
    const authButton = page.locator('button', { hasText: /login|sign up|get started/i }).first();
    await authButton.click();

    // Wait for auth modal
    await page.waitForSelector('text=Guest Login', { timeout: 5000 });

    // Use guest login for quick test
    await page.click('text=Guest Login');

    // Fill in guest display name
    const displayNameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
    await displayNameInput.fill('Test User');

    // Click continue/login button
    const submitButton = page.locator('button', { hasText: /continue|login|submit/i }).first();
    await submitButton.click();

    // Wait for navigation and authentication
    await page.waitForLoadState('networkidle');

    // Navigate to /room/create
    await page.goto(`${baseUrl}/room/create`);
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h1')).toContainText('Create a Room');

    // ===== ACCEPTANCE CRITERION 1: Game Mode Selector =====
    console.log('✓ Checking game mode selector options...');

    // Verify Collaborative mode exists
    const collaborativeMode = page.locator('button:has-text("Collaborative")');
    await expect(collaborativeMode).toBeVisible();
    await expect(page.locator('text=Work together to solve the puzzle')).toBeVisible();

    // Verify Race mode exists
    const raceMode = page.locator('button:has-text("Race")');
    await expect(raceMode).toBeVisible();
    await expect(page.locator('text=First to finish wins')).toBeVisible();

    // Verify Relay mode exists
    const relayMode = page.locator('button:has-text("Relay")');
    await expect(relayMode).toBeVisible();
    await expect(page.locator('text=Take turns solving')).toBeVisible();

    console.log('✓ All game modes are present: Collaborative, Race, Relay');

    // Test game mode selection interaction
    await raceMode.click();
    await expect(raceMode).toHaveClass(/bg-\[#7B61FF\]/);

    await relayMode.click();
    await expect(relayMode).toHaveClass(/bg-\[#7B61FF\]/);

    await collaborativeMode.click();
    await expect(collaborativeMode).toHaveClass(/bg-\[#7B61FF\]/);

    // ===== ACCEPTANCE CRITERION 2: Max Players Selector =====
    console.log('✓ Checking max players selector (2-8 players)...');

    // Verify max players slider exists
    const maxPlayersSlider = page.locator('input[type="range"]');
    await expect(maxPlayersSlider).toBeVisible();
    await expect(maxPlayersSlider).toHaveAttribute('min', '2');
    await expect(maxPlayersSlider).toHaveAttribute('max', '8');

    // Verify initial value display (should be 4 by default)
    let playerCountDisplay = page.locator('text=Max Players').locator('..').locator('text=/^[2-8]$/');
    await expect(playerCountDisplay).toBeVisible();

    // Test slider interaction - set to 2
    await maxPlayersSlider.fill('2');
    playerCountDisplay = page.locator('span:has-text("2")').last();
    await expect(playerCountDisplay).toBeVisible();

    // Test slider interaction - set to 8
    await maxPlayersSlider.fill('8');
    playerCountDisplay = page.locator('span:has-text("8")').last();
    await expect(playerCountDisplay).toBeVisible();

    // Test mid-range value
    await maxPlayersSlider.fill('5');
    playerCountDisplay = page.locator('span:has-text("5")').last();
    await expect(playerCountDisplay).toBeVisible();

    console.log('✓ Max players selector works correctly (2-8 range)');

    // ===== ACCEPTANCE CRITERION 3: Puzzle Selection Options =====
    console.log('✓ Checking puzzle selection options...');

    // Verify Today's Puzzle option
    const todayPuzzle = page.locator('button:has-text("Today\'s Puzzle")');
    await expect(todayPuzzle).toBeVisible();

    // Verify Random Puzzle option
    const randomPuzzle = page.locator('button:has-text("Random Puzzle")');
    await expect(randomPuzzle).toBeVisible();

    // Verify Choose from Archive option
    const archivePuzzle = page.locator('button:has-text("Choose from Archive")');
    await expect(archivePuzzle).toBeVisible();
    await expect(page.locator('text=Pick any past puzzle')).toBeVisible();

    console.log('✓ All puzzle selection options present: Today\'s, Random, Archive');

    // Test puzzle selection interaction
    await randomPuzzle.click();
    await expect(randomPuzzle).toHaveClass(/bg-\[#7B61FF\]/);

    await archivePuzzle.click();
    await expect(archivePuzzle).toHaveClass(/bg-\[#7B61FF\]/);

    await todayPuzzle.click();
    await expect(todayPuzzle).toHaveClass(/bg-\[#7B61FF\]/);

    // ===== ACCEPTANCE CRITERION 4: Take Snapshot =====
    console.log('✓ Taking snapshot of form options...');

    // Reset form to default state for clean snapshot
    await collaborativeMode.click();
    await maxPlayersSlider.fill('4');
    await todayPuzzle.click();

    // Take full page screenshot
    await page.screenshot({
      path: 'frontend/tests/ROOM-02-form-options.png',
      fullPage: true
    });

    // Take focused screenshot of just the form
    const formElement = page.locator('form');
    await formElement.screenshot({
      path: 'frontend/tests/ROOM-02-form-options-focused.png'
    });

    console.log('✓ Snapshots saved: ROOM-02-form-options.png, ROOM-02-form-options-focused.png');

    // ===== ADDITIONAL VERIFICATION: Form Structure =====
    console.log('✓ Verifying complete form structure...');

    // Verify Room Name field exists
    const roomNameInput = page.locator('input[placeholder*="room name" i]');
    await expect(roomNameInput).toBeVisible();

    // Verify Create Room button exists and is enabled
    const createButton = page.locator('button[type="submit"]:has-text("Create Room")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();

    // Verify mascot/helper is present
    const crossyMascot = page.locator('img[alt="Crossy"]');
    await expect(crossyMascot).toBeVisible();

    console.log('✓ All form elements verified successfully');

    // ===== FINAL VALIDATION: Test complete form interaction =====
    console.log('✓ Testing complete form interaction...');

    // Set all form values
    await roomNameInput.fill('Test Room');
    await raceMode.click();
    await maxPlayersSlider.fill('6');
    await randomPuzzle.click();

    // Verify all selections are maintained
    await expect(roomNameInput).toHaveValue('Test Room');
    await expect(raceMode).toHaveClass(/bg-\[#7B61FF\]/);
    await expect(page.locator('span:has-text("6")').last()).toBeVisible();
    await expect(randomPuzzle).toHaveClass(/bg-\[#7B61FF\]/);

    // Take final state screenshot
    await page.screenshot({
      path: 'frontend/tests/ROOM-02-form-filled.png',
      fullPage: true
    });

    console.log('✓ Form interaction test complete');
    console.log('\n========================================');
    console.log('✅ ROOM-02 Test Suite: ALL TESTS PASSED');
    console.log('========================================\n');
  });

  test('should validate form behavior and defaults', async ({ page }) => {
    // Navigate and login
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    const authButton = page.locator('button', { hasText: /login|sign up|get started/i }).first();
    await authButton.click();
    await page.waitForSelector('text=Guest Login', { timeout: 5000 });
    await page.click('text=Guest Login');

    const displayNameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
    await displayNameInput.fill('Test User 2');
    const submitButton = page.locator('button', { hasText: /continue|login|submit/i }).first();
    await submitButton.click();
    await page.waitForLoadState('networkidle');

    // Navigate to create room page
    await page.goto(`${baseUrl}/room/create`);
    await page.waitForLoadState('networkidle');

    // Verify default selections
    const collaborativeMode = page.locator('button:has-text("Collaborative")');
    await expect(collaborativeMode).toHaveClass(/bg-\[#7B61FF\]/);

    const todayPuzzle = page.locator('button:has-text("Today\'s Puzzle")');
    await expect(todayPuzzle).toHaveClass(/bg-\[#7B61FF\]/);

    // Verify default max players is 4
    const playerCountDisplay = page.locator('text=Max Players').locator('..').locator('span:has-text("4")');
    await expect(playerCountDisplay).toBeVisible();

    console.log('✓ Default values verified: Collaborative mode, 4 players, Today\'s puzzle');
  });
});
