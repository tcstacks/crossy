import { test, expect } from '@playwright/test';

test.describe('LOBBY-03: Host can start game', () => {
  test('should allow host to start the game when players are ready', async ({ browser }) => {
    // Create two contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1: Register and create room (becomes host)
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

      // ACCEPTANCE CRITERIA 1: Create a room (you are host)
      await page1.click('a:has-text("Multiplayer")');
      await page1.waitForURL(/.*\/room\/create/, { timeout: 10000 });
      await page1.click('button:has-text("Create Room")');
      await page1.waitForURL(/.*\/room\/[A-Z0-9]+\/lobby/, { timeout: 10000 });

      // Extract room code from URL
      const url = page1.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)\/lobby/)?.[1];
      expect(roomCode).toBeTruthy();

      console.log('✓ Room created with code:', roomCode);
      console.log('✓ User is host');

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
      await page1.waitForSelector(`text=${username1}`, { timeout: 5000 });
      await page1.waitForSelector(`text=${username2}`, { timeout: 5000 });

      console.log('✓ Both users joined the lobby');

      // ACCEPTANCE CRITERIA 2: Verify Start Game button is visible (only to host)
      const startGameButton = page1.locator('button:has-text("Start Game")');
      await expect(startGameButton).toBeVisible({ timeout: 5000 });
      console.log('✓ Start Game button visible to host');

      // Verify non-host does not see Start Game button
      await expect(page2.locator('button:has-text("Start Game")')).not.toBeVisible();
      await expect(page2.locator('text=Waiting for host to start...')).toBeVisible();
      console.log('✓ Non-host sees waiting message instead of Start Game button');

      // Take snapshot before toggling ready
      await page1.screenshot({ path: 'frontend/tests/LOBBY-03-initial-state.png', fullPage: true });
      console.log('✓ Took snapshot of initial state');

      // ACCEPTANCE CRITERIA 3: Toggle ready status
      const readyButton1 = page1.locator('button:has-text("Ready Up")');
      await readyButton1.click();
      await expect(page1.locator('button:has-text("Ready - Click to Unready")')).toBeVisible({ timeout: 5000 });
      console.log('✓ Host toggled ready status');

      const readyButton2 = page2.locator('button:has-text("Ready Up")');
      await readyButton2.click();
      await expect(page2.locator('button:has-text("Ready - Click to Unready")')).toBeVisible({ timeout: 5000 });
      console.log('✓ Player 2 toggled ready status');

      // Verify both players show as ready
      const readyBadges1 = page1.locator('text=Ready').first();
      const readyBadges2 = page2.locator('text=Ready').first();
      await expect(readyBadges1).toBeVisible({ timeout: 5000 });
      await expect(readyBadges2).toBeVisible({ timeout: 5000 });
      console.log('✓ Both players show as ready');

      // Take snapshot with both ready
      await page1.screenshot({ path: 'frontend/tests/LOBBY-03-ready-state.png', fullPage: true });
      console.log('✓ Took snapshot of ready state');

      // ACCEPTANCE CRITERIA 4: Click Start Game button
      await startGameButton.click();
      console.log('✓ Clicked Start Game button');

      // ACCEPTANCE CRITERIA 5: Verify game starts and navigates to gameplay
      // Both pages should navigate to the game page
      await page1.waitForURL(new RegExp(`/room/${roomCode}/play`), { timeout: 10000 });
      await page2.waitForURL(new RegExp(`/room/${roomCode}/play`), { timeout: 10000 });
      console.log('✓ Both players navigated to gameplay');

      // Verify we're on the game page
      expect(page1.url()).toContain('/play');
      expect(page2.url()).toContain('/play');
      console.log('✓ Verified navigation to gameplay page');

      // ACCEPTANCE CRITERIA 6: Take snapshot of game start
      await page1.screenshot({ path: 'frontend/tests/LOBBY-03-game-started.png', fullPage: true });
      await page2.screenshot({ path: 'frontend/tests/LOBBY-03-game-started-player2.png', fullPage: true });
      console.log('✓ Took snapshots of game start');

      console.log('\n✅ All acceptance criteria passed!');

    } finally {
      // Cleanup
      await context1.close();
      await context2.close();
    }
  });
});
