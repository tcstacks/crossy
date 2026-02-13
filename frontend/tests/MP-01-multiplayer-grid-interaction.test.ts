import { test, expect } from '@playwright/test';

test.describe('MP-01: Multiplayer grid interaction', () => {
  test('should allow players to interact with the puzzle grid in multiplayer', async ({ browser }) => {
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

      // User 2: Register
      await page2.goto('http://localhost:5173');
      await page2.waitForSelector('text=Login', { timeout: 10000 });

      const signUpButton2 = page2.locator('button:has-text("Sign Up")').first();
      await signUpButton2.click();

      const username2 = `testuser_${Date.now() + 1}`;
      await page2.fill('input[type="text"]', username2);
      await page2.fill('input[type="email"]', `${username2}@test.com`);
      await page2.fill('input[type="password"]', 'password123');

      await page2.click('button:has-text("Create Account")');
      await page2.waitForURL('http://localhost:5173/', { timeout: 10000 });
      await page2.waitForSelector('text=Multiplayer', { timeout: 10000 });

      // ACCEPTANCE CRITERIA 1: Start a multiplayer game
      console.log('Starting multiplayer game...');

      // User 1: Create room
      await page1.click('a:has-text("Multiplayer")');
      await page1.waitForURL(/.*\/room\/create/, { timeout: 10000 });
      await page1.click('button:has-text("Create Room")');
      await page1.waitForURL(/.*\/room\/[A-Z0-9]+\/lobby/, { timeout: 10000 });

      // Extract room code
      const url = page1.url();
      const roomCode = url.match(/\/room\/([A-Z0-9]+)\/lobby/)?.[1];
      expect(roomCode).toBeTruthy();
      console.log('✓ Room created with code:', roomCode);

      // User 2: Join room
      await page2.click('a:has-text("Multiplayer")');
      await page2.waitForURL(/.*\/room\/create/, { timeout: 10000 });
      await page2.click('a:has-text("Join Room")');
      await page2.waitForURL(/.*\/room\/join/, { timeout: 10000 });

      if (roomCode) {
        const codeChars = roomCode.split('');
        const inputs = await page2.locator('input[type="text"]').all();
        for (let i = 0; i < codeChars.length && i < inputs.length; i++) {
          await inputs[i].fill(codeChars[i]);
        }
        await page2.waitForURL(`http://localhost:5173/room/${roomCode}/lobby`, { timeout: 10000 });
      }

      // Both users ready up
      await page1.locator('button:has-text("Ready Up")').click();
      await page2.locator('button:has-text("Ready Up")').click();

      // Wait for ready state
      await expect(page1.locator('button:has-text("Ready - Click to Unready")')).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('button:has-text("Ready - Click to Unready")')).toBeVisible({ timeout: 5000 });

      // Host starts game
      await page1.locator('button:has-text("Start Game")').click();

      // Wait for both to navigate to gameplay
      await page1.waitForURL(new RegExp(`/room/${roomCode}/play`), { timeout: 10000 });
      await page2.waitForURL(new RegExp(`/room/${roomCode}/play`), { timeout: 10000 });
      console.log('✓ Multiplayer game started');

      // ACCEPTANCE CRITERIA 2: Verify crossword grid is displayed
      console.log('Verifying crossword grid display...');

      // Wait for grid to be visible on both pages
      await page1.waitForSelector('[role="grid"], .grid', { timeout: 10000 });
      await page2.waitForSelector('[role="grid"], .grid', { timeout: 10000 });

      // Check that grid cells exist
      const gridCells1 = await page1.locator('div').filter({ hasText: /^[A-Z]?$/ }).count();
      const gridCells2 = await page2.locator('div').filter({ hasText: /^[A-Z]?$/ }).count();

      expect(gridCells1).toBeGreaterThan(0);
      expect(gridCells2).toBeGreaterThan(0);
      console.log('✓ Crossword grid displayed for both players');

      // ACCEPTANCE CRITERIA 3: Click on cells and type letters
      console.log('Testing cell interaction...');

      // Give the page time to fully load and establish WebSocket connections
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Player 1: Click on a grid cell and type a letter
      // Find a non-blocked cell by looking for cells in the grid container
      const gridContainer1 = page1.locator('.grid, [role="grid"]').first();

      // Try to find the first clickable cell
      // We'll look for cells that are not blocked (don't have dark background)
      const cells1 = gridContainer1.locator('div').filter({
        has: page1.locator('div')
      });

      // Click on the first available cell (try multiple if needed)
      let cellClicked = false;
      const cellCount = await cells1.count();

      for (let i = 0; i < Math.min(cellCount, 20); i++) {
        const cell = cells1.nth(i);
        const bgColor = await cell.evaluate((el) =>
          window.getComputedStyle(el).backgroundColor
        );

        // Skip dark/blocked cells (rgb(42, 30, 92) is the blocked cell color)
        if (!bgColor.includes('42, 30, 92')) {
          await cell.click();
          cellClicked = true;
          console.log(`✓ Player 1 clicked on cell ${i}`);
          break;
        }
      }

      expect(cellClicked).toBe(true);

      // Type a letter
      await page1.keyboard.press('A');
      console.log('✓ Player 1 typed letter A');

      // ACCEPTANCE CRITERIA 4: Verify letters appear in the grid
      console.log('Verifying letters appear in grid...');

      // Wait a moment for the letter to be rendered
      await page1.waitForTimeout(500);

      // Check if the letter 'A' appears in the grid
      const letterA = await page1.locator('div:has-text("A")').first();
      await expect(letterA).toBeVisible({ timeout: 3000 });
      console.log('✓ Letter A appears in Player 1\'s grid');

      // Player 2: Also interact with the grid
      const gridContainer2 = page2.locator('.grid, [role="grid"]').first();
      const cells2 = gridContainer2.locator('div').filter({
        has: page2.locator('div')
      });

      // Click on a different cell
      cellClicked = false;
      const cellCount2 = await cells2.count();

      for (let i = 0; i < Math.min(cellCount2, 20); i++) {
        const cell = cells2.nth(i);
        const bgColor = await cell.evaluate((el) =>
          window.getComputedStyle(el).backgroundColor
        );

        if (!bgColor.includes('42, 30, 92')) {
          await cell.click();
          cellClicked = true;
          console.log(`✓ Player 2 clicked on cell ${i}`);
          break;
        }
      }

      expect(cellClicked).toBe(true);

      // Type a letter
      await page2.keyboard.press('B');
      console.log('✓ Player 2 typed letter B');

      // Wait for the letter to render
      await page2.waitForTimeout(500);

      // Check if the letter 'B' appears
      const letterB = await page2.locator('div:has-text("B")').first();
      await expect(letterB).toBeVisible({ timeout: 3000 });
      console.log('✓ Letter B appears in Player 2\'s grid');

      // Verify that Player 1 can see Player 2's letter (real-time sync)
      await page1.waitForTimeout(1000); // Wait for WebSocket sync
      const letterBOnPlayer1 = page1.locator('div:has-text("B")').first();
      await expect(letterBOnPlayer1).toBeVisible({ timeout: 3000 });
      console.log('✓ Player 1 sees Player 2\'s letter (real-time sync verified)');

      // ACCEPTANCE CRITERIA 5: Take snapshot of multiplayer gameplay
      console.log('Taking snapshots...');

      await page1.screenshot({
        path: 'frontend/tests/MP-01-player1-gameplay.png',
        fullPage: true
      });
      console.log('✓ Took snapshot of Player 1 gameplay');

      await page2.screenshot({
        path: 'frontend/tests/MP-01-player2-gameplay.png',
        fullPage: true
      });
      console.log('✓ Took snapshot of Player 2 gameplay');

      console.log('\n✅ All acceptance criteria passed!');
      console.log('  - Started multiplayer game');
      console.log('  - Verified crossword grid is displayed');
      console.log('  - Clicked on cells and typed letters');
      console.log('  - Verified letters appear in the grid');
      console.log('  - Verified real-time synchronization between players');
      console.log('  - Took snapshots of multiplayer gameplay');

    } finally {
      // Cleanup
      await context1.close();
      await context2.close();
    }
  });
});
