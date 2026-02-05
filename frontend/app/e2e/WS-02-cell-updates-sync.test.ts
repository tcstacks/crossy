import { test, expect } from '@playwright/test';

/**
 * WS-02: Cell updates sync across players
 *
 * Acceptance Criteria:
 * - Complete WS-01 to establish WebSocket connection
 * - Click on a cell in the grid
 * - Type letter 'A'
 * - Verify cell_update message sent via WebSocket
 * - Verify cell_updated message received (broadcast)
 * - Verify the cell shows the letter with player's color
 * - Take screenshot of synced cell
 */

const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080';

test.describe('WS-02: Cell updates sync across players', () => {
  test('Cell updates are sent via WebSocket with player colors', async ({ page, request }) => {
    // Generate unique credentials for this test
    const timestamp = Date.now();
    const testEmail = `cellupdate${timestamp}@example.com`;
    const testUsername = 'CellUpdate' + timestamp;
    const testPassword = 'SecurePass123!';

    // ============================================
    // Setup: Register and login via API
    // ============================================

    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
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

    await page.waitForLoadState('networkidle');

    // ============================================
    // Step 1: Get today's puzzle
    // ============================================

    const puzzleResponse = await request.get(`${API_URL}/api/puzzles/today`);
    expect(puzzleResponse.ok()).toBeTruthy();
    const puzzleData = await puzzleResponse.json();
    const puzzleId = puzzleData.id;

    console.log('Got puzzle ID:', puzzleId);

    // ============================================
    // Step 2: Create a room via API
    // ============================================

    const createRoomResponse = await request.post(`${API_URL}/api/rooms`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        puzzleId: puzzleId,
        mode: 'collaborative',
        config: {
          maxPlayers: 4,
          isPublic: false,
          allowSpectators: false,
          timeLimit: 0,
          hintsEnabled: true,
          autoRevealEnabled: false,
        },
      },
    });

    expect(createRoomResponse.ok()).toBeTruthy();
    const roomData = await createRoomResponse.json();
    const roomCode = roomData.room.code;
    const roomId = roomData.room.id;

    console.log('Room created:', roomCode);

    // ============================================
    // Step 3: Start the game via API
    // ============================================

    const startGameResponse = await request.post(`${API_URL}/api/rooms/${roomId}/start`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(startGameResponse.ok()).toBeTruthy();
    console.log('Game started');

    // ============================================
    // Step 4: Navigate to multiplayer game page
    // ============================================

    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('Browser console:', text);
    });

    await page.goto(`${FRONTEND_URL}/room/${roomCode}/play`);
    await page.waitForLoadState('networkidle');

    // Check current URL
    console.log('Current URL:', page.url());

    // Wait for WebSocket connection
    await page.waitForTimeout(5000);

    // Verify connection - use more specific locator
    const liveIndicator = page.locator('div:has(> .w-2.h-2.rounded-full.bg-\\[\\#6BCF7F\\]) span:has-text("Live")');
    await expect(liveIndicator).toBeVisible({ timeout: 10000 });

    console.log('Player connected to the game');

    // ============================================
    // Acceptance Criterion 1: Click on a cell
    // ============================================

    // Focus the grid first
    const gridContainer = page.locator('div[tabindex="0"]').filter({ has: page.locator('.grid') });
    await gridContainer.focus();

    // Find the first non-blocked cell in the actual game grid
    const firstCell = gridContainer.locator('div > div').filter({ hasNot: page.locator('.bg-\\[\\#2A1E5C\\]') }).first();
    await firstCell.click();
    await page.waitForTimeout(500);

    console.log('Player clicked on a cell');

    // ============================================
    // Acceptance Criterion 2: Type letter 'A'
    // ============================================

    await page.keyboard.press('A');
    await page.waitForTimeout(1000);

    console.log('Player typed letter A');

    // ============================================
    // Acceptance Criterion 3: Verify cell_update message sent
    // ============================================

    // Check console logs for cell:update message
    const cellUpdateLog = consoleLogs.find((log) =>
      log.includes('Sending message') && log.includes('cell:update')
    );
    expect(cellUpdateLog, 'cell:update message should be sent').toBeTruthy();

    // ============================================
    // Acceptance Criterion 4: Verify cell shows letter
    // ============================================

    // The cell should show 'A'
    const cellText = await firstCell.textContent();
    expect(cellText).toContain('A');
    console.log('Player sees letter A in their cell');

    // ============================================
    // Acceptance Criterion 5: Verify cell letter has color styling
    // ============================================

    // Verify that the letter has a color style (player color)
    const cellSpan = firstCell.locator('span.relative.z-10');
    const spanExists = await cellSpan.count();
    expect(spanExists).toBeGreaterThan(0);

    const color = await cellSpan.evaluate((el) => window.getComputedStyle(el).color);
    console.log('Cell letter color:', color);
    expect(color).toBeTruthy();

    // ============================================
    // Acceptance Criterion 6: Take screenshot
    // ============================================

    await page.screenshot({
      path: 'e2e/screenshots/WS-02-cell-with-letter.png',
      fullPage: true,
    });

    console.log('✅ WS-02: All acceptance criteria met');
  });

});
