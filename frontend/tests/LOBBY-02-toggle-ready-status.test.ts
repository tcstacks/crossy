import { test, expect } from '@playwright/test';

test.describe('LOBBY-02: Toggle Ready Status', () => {
  test('should allow player to toggle ready status in lobby', async ({ browser }) => {
    // Create two contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1: Register and create room
      await page1.goto('http://localhost:5173');
      await page1.waitForSelector('text=Login', { timeout: 10000 });

      // Click Sign Up
      const signUpButton = page1.locator('button:has-text("Sign Up")').first();
      await signUpButton.click();

      // Fill registration form
      const username1 = `testuser_${Date.now()}`;
      await page1.fill('input[type="text"]', username1);
      await page1.fill('input[type="email"]', `${username1}@test.com`);
      await page1.fill('input[type="password"]', 'password123');

      // Submit registration
      await page1.click('button:has-text("Create Account")');

      // Wait for redirect to home
      await page1.waitForURL('http://localhost:5173/', { timeout: 10000 });
      await page1.waitForSelector('text=Multiplayer', { timeout: 10000 });

      // Click Multiplayer
      await page1.click('a:has-text("Multiplayer")');

      // Wait for room creation page
      await page1.waitForURL(/.*\/room\/create/, { timeout: 10000 });

      // Create room with default settings
      await page1.click('button:has-text("Create Room")');

      // Wait for lobby page
      await page1.waitForURL(/.*\/room\/[A-Z0-9]+\/lobby/, { timeout: 10000 });

      // Extract room code from URL
      const url = page1.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)\/lobby/)?.[1];
      expect(roomCode).toBeTruthy();

      console.log('Room created with code:', roomCode);

      // User 2: Register and join the room
      await page2.goto('http://localhost:5173');
      await page2.waitForSelector('text=Login', { timeout: 10000 });

      // Click Sign Up
      const signUpButton2 = page2.locator('button:has-text("Sign Up")').first();
      await signUpButton2.click();

      // Fill registration form
      const username2 = `testuser_${Date.now() + 1}`;
      await page2.fill('input[type="text"]', username2);
      await page2.fill('input[type="email"]', `${username2}@test.com`);
      await page2.fill('input[type="password"]', 'password123');

      // Submit registration
      await page2.click('button:has-text("Create Account")');

      // Wait for redirect to home
      await page2.waitForURL('http://localhost:5173/', { timeout: 10000 });
      await page2.waitForSelector('text=Multiplayer', { timeout: 10000 });

      // Click Multiplayer
      await page2.click('a:has-text("Multiplayer")');

      // Wait for room creation page
      await page2.waitForURL(/.*\/room\/create/, { timeout: 10000 });

      // Click Join Room instead
      await page2.click('a:has-text("Join Room")');

      // Wait for join page
      await page2.waitForURL(/.*\/room\/join/, { timeout: 10000 });

      // Enter room code
      if (roomCode) {
        // Split the room code into individual characters
        const codeChars = roomCode.split('');
        const inputs = await page2.locator('input[type="text"]').all();

        for (let i = 0; i < codeChars.length && i < inputs.length; i++) {
          await inputs[i].fill(codeChars[i]);
        }

        // Wait for join to complete
        await page2.waitForURL(`http://localhost:5173/room/${roomCode}/lobby`, { timeout: 10000 });
      }

      // Both users should now be in the lobby
      // Wait for both players to appear in player list
      await page1.waitForSelector(`text=${username1}`, { timeout: 5000 });
      await page1.waitForSelector(`text=${username2}`, { timeout: 5000 });

      await page2.waitForSelector(`text=${username1}`, { timeout: 5000 });
      await page2.waitForSelector(`text=${username2}`, { timeout: 5000 });

      console.log('Both users joined the lobby');

      // ACCEPTANCE CRITERIA 1: Find the Ready button (User 2)
      const readyButton2 = page2.locator('button:has-text("Ready Up")');
      await expect(readyButton2).toBeVisible({ timeout: 5000 });
      console.log('✓ Found Ready button');

      // Take initial snapshot (both not ready)
      await page2.screenshot({ path: 'frontend/tests/LOBBY-02-initial-state.png', fullPage: true });
      console.log('✓ Took snapshot of initial state');

      // ACCEPTANCE CRITERIA 2 & 3: Click Ready button and verify status shows as ready
      await readyButton2.click();

      // Wait for button text to change
      await expect(page2.locator('button:has-text("Ready - Click to Unready")')).toBeVisible({ timeout: 5000 });
      console.log('✓ Clicked Ready button');

      // ACCEPTANCE CRITERIA 4: Verify status shows as ready
      // Check for green "Ready" badge on both pages
      await expect(page2.locator('text=Ready').first()).toBeVisible({ timeout: 5000 });
      await expect(page1.locator('text=Ready').first()).toBeVisible({ timeout: 5000 });
      console.log('✓ Verified status shows as ready');

      // Take snapshot with user ready
      await page2.screenshot({ path: 'frontend/tests/LOBBY-02-ready-state.png', fullPage: true });
      console.log('✓ Took snapshot of ready state');

      // ACCEPTANCE CRITERIA 5: Click button again to unready
      const unreadyButton = page2.locator('button:has-text("Ready - Click to Unready")');
      await unreadyButton.click();

      // Wait for button text to change back
      await expect(page2.locator('button:has-text("Ready Up")')).toBeVisible({ timeout: 5000 });
      console.log('✓ Clicked Unready button');

      // ACCEPTANCE CRITERIA 6: Verify status changes back
      await expect(page2.locator('text=Not Ready').first()).toBeVisible({ timeout: 5000 });
      await expect(page1.locator('text=Not Ready').first()).toBeVisible({ timeout: 5000 });
      console.log('✓ Verified status changed back to not ready');

      // Take final snapshot (unready state)
      await page2.screenshot({ path: 'frontend/tests/LOBBY-02-unready-state.png', fullPage: true });
      console.log('✓ Took snapshot of unready state');

      console.log('\n✅ All acceptance criteria passed!');

    } finally {
      // Cleanup
      await context1.close();
      await context2.close();
    }
  });
});
