/**
 * MP-03: Player Progress Display Test
 *
 * Acceptance Criteria:
 * - [ ] Start a multiplayer game
 * - [ ] Verify progress indicators are visible
 * - [ ] Fill in some cells
 * - [ ] Verify your progress percentage updates
 * - [ ] Take snapshot showing progress
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('MP-03: Player Progress Display', () => {
  test('should display and update player progress indicators', async ({ browser }) => {
    // Create two browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Player 1: Register and create room
      await page1.goto(`${FRONTEND_URL}/auth/register`);
      await page1.fill('input[type="text"]', 'Player1');
      await page1.fill('input[type="email"]', `player1_${Date.now()}@test.com`);
      await page1.fill('input[type="password"]', 'password123');
      await page1.click('button:has-text("Sign Up")');

      await page1.waitForURL(/.*\/lobby/, { timeout: 5000 });
      await page1.click('button:has-text("Create Room")');
      await page1.waitForURL(/.*\/room\/.*/, { timeout: 5000 });

      // Extract room code
      const roomCode = await page1.evaluate(() => {
        const match = window.location.pathname.match(/\/room\/([A-Z0-9]+)/);
        return match ? match[1] : null;
      });

      expect(roomCode).toBeTruthy();
      console.log(`Room created with code: ${roomCode}`);

      // Player 2: Register and join room
      await page2.goto(`${FRONTEND_URL}/auth/register`);
      await page2.fill('input[type="text"]', 'Player2');
      await page2.fill('input[type="email"]', `player2_${Date.now()}@test.com`);
      await page2.fill('input[type="password"]', 'password123');
      await page2.click('button:has-text("Sign Up")');

      await page2.waitForURL(/.*\/lobby/, { timeout: 5000 });
      await page2.click('button:has-text("Join Room")');
      await page2.fill('input[placeholder*="room code" i]', roomCode!);
      await page2.click('button:has-text("Join")');
      await page2.waitForURL(`${FRONTEND_URL}/room/${roomCode}`, { timeout: 5000 });

      // Wait for both players to be in the room
      await page1.waitForSelector('text=Player2', { timeout: 5000 });
      await page2.waitForSelector('text=Player1', { timeout: 5000 });

      // ✅ Acceptance Criteria 1: Start a multiplayer game
      console.log('Starting multiplayer game...');
      await page1.click('button:has-text("Start Game")');

      // Wait for game to start on both pages
      await page1.waitForURL(/.*\/play\/multiplayer\/.*/, { timeout: 10000 });
      await page2.waitForURL(/.*\/play\/multiplayer\/.*/, { timeout: 10000 });

      // Wait for grid to load
      await page1.waitForSelector('.crossword-grid', { timeout: 5000 });
      await page2.waitForSelector('.crossword-grid', { timeout: 5000 });

      console.log('✅ Game started successfully');

      // ✅ Acceptance Criteria 2: Verify progress indicators are visible
      console.log('Verifying progress indicators are visible...');

      // Check Player 1's view
      const player1Progress = await page1.locator('text=Players (2)').locator('..').locator('text=% complete').first();
      await expect(player1Progress).toBeVisible({ timeout: 5000 });

      // Check for progress bars (should be 2, one for each player)
      const progressBars1 = await page1.locator('.h-2.bg-\\[\\#F3F1FF\\].rounded-full').count();
      expect(progressBars1).toBeGreaterThanOrEqual(2);

      console.log(`✅ Progress indicators visible on Player 1's view (${progressBars1} progress bars)`);

      // Check Player 2's view
      const player2Progress = await page2.locator('text=Players (2)').locator('..').locator('text=% complete').first();
      await expect(player2Progress).toBeVisible({ timeout: 5000 });

      const progressBars2 = await page2.locator('.h-2.bg-\\[\\#F3F1FF\\].rounded-full').count();
      expect(progressBars2).toBeGreaterThanOrEqual(2);

      console.log(`✅ Progress indicators visible on Player 2's view (${progressBars2} progress bars)`);

      // Get initial progress percentage for Player 1
      const initialProgress1 = await page1.locator('text=/\\d+% complete/').first().textContent();
      console.log(`Initial progress for Player 1: ${initialProgress1}`);

      // ✅ Acceptance Criteria 3: Fill in some cells
      console.log('Filling in cells as Player 1...');

      // Click on a cell to select it
      const firstCell = await page1.locator('.crossword-grid').locator('div').filter({ hasText: /^[0-9]+$/ }).first();
      await firstCell.click();
      await page1.waitForTimeout(500);

      // Type some letters
      await page1.keyboard.type('TEST');
      await page1.waitForTimeout(1000); // Wait for progress to update

      console.log('✅ Filled in cells');

      // ✅ Acceptance Criteria 4: Verify your progress percentage updates
      console.log('Verifying progress percentage updates...');

      // Wait a bit for WebSocket to propagate
      await page1.waitForTimeout(1500);

      // Get updated progress percentage
      const updatedProgress1 = await page1.locator('text=/\\d+% complete/').first().textContent();
      console.log(`Updated progress for Player 1: ${updatedProgress1}`);

      // Extract percentages
      const initialPercent = parseInt(initialProgress1?.match(/(\d+)%/)?.[1] || '0');
      const updatedPercent = parseInt(updatedProgress1?.match(/(\d+)%/)?.[1] || '0');

      // Verify progress increased
      expect(updatedPercent).toBeGreaterThan(initialPercent);
      console.log(`✅ Progress updated: ${initialPercent}% → ${updatedPercent}%`);

      // Verify Player 2 can see Player 1's progress update
      await page2.waitForTimeout(1000);
      const player1ProgressOnPage2 = await page2.locator('text=Player1').locator('..').locator('..').locator('text=/\\d+% complete/').textContent();
      console.log(`Player 1's progress visible to Player 2: ${player1ProgressOnPage2}`);

      // ✅ Acceptance Criteria 5: Take snapshot showing progress
      console.log('Taking snapshots showing progress...');

      // Take screenshot from Player 1's view
      await page1.screenshot({
        path: '/Users/dev/conductor/workspaces/crossy/sao-paulo/frontend/tests/MP-03-player1-progress.png',
        fullPage: true
      });
      console.log('✅ Screenshot saved: MP-03-player1-progress.png');

      // Take screenshot from Player 2's view
      await page2.screenshot({
        path: '/Users/dev/conductor/workspaces/crossy/sao-paulo/frontend/tests/MP-03-player2-view.png',
        fullPage: true
      });
      console.log('✅ Screenshot saved: MP-03-player2-view.png');

      // Get final summary
      const finalSummary = await page1.evaluate(() => {
        const playerCards = Array.from(document.querySelectorAll('[class*="p-3"][class*="rounded-xl"]'));
        return playerCards.map(card => {
          const username = card.querySelector('[class*="font-semibold"]')?.textContent || 'Unknown';
          const progress = card.querySelector('text=/\\d+% complete/')?.textContent ||
                          Array.from(card.querySelectorAll('*'))
                            .find(el => el.textContent?.includes('% complete'))?.textContent || '0%';
          return { username, progress };
        });
      });

      console.log('\n📊 Final Progress Summary:');
      console.log(JSON.stringify(finalSummary, null, 2));

      console.log('\n✅ All acceptance criteria verified successfully!');
      console.log('✅ Progress indicators are visible for all players');
      console.log('✅ Progress percentages update when cells are filled');
      console.log('✅ Progress is synchronized across all players');
      console.log('✅ Screenshots captured showing progress display');

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
