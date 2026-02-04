import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * MP-02 - Chat panel in multiplayer
 *
 * Acceptance Criteria:
 * - [ ] Start a multiplayer game
 * - [ ] Find the chat panel
 * - [ ] Type a message in the chat input
 * - [ ] Press Enter or click Send
 * - [ ] Verify message appears in chat history
 * - [ ] Take snapshot of chat
 */

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080';

interface TestUser {
  email: string;
  password: string;
  username: string;
  token?: string;
  context?: BrowserContext;
  page?: Page;
}

test.describe('MP-02 - Chat panel in multiplayer', () => {
  let browser: Browser;
  let host: TestUser;
  let player: TestUser;
  let roomCode: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    // Setup test users
    host = {
      email: 'host-mp02@test.com',
      password: 'password123',
      username: 'HostPlayer',
    };

    player = {
      email: 'player-mp02@test.com',
      password: 'password123',
      username: 'ChatPlayer',
    };

    // Register and login users
    await registerAndLoginUser(host);
    await registerAndLoginUser(player);
  });

  test.afterAll(async () => {
    // Cleanup contexts
    if (host.context) await host.context.close();
    if (player.context) await player.context.close();
  });

  test('should allow players to send and receive chat messages', async () => {
    // Step 1: Start a multiplayer game
    console.log('Step 1: Creating multiplayer room...');

    // Create browser contexts for both users
    host.context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [{
          origin: BASE_URL,
          localStorage: [{
            name: 'crossword_token',
            value: host.token!,
          }],
        }],
      },
    });
    host.page = await host.context.newPage();

    player.context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [{
          origin: BASE_URL,
          localStorage: [{
            name: 'crossword_token',
            value: player.token!,
          }],
        }],
      },
    });
    player.page = await player.context.newPage();

    // Host creates a room
    await host.page.goto(`${BASE_URL}/lobby`);
    await host.page.waitForLoadState('networkidle');

    const createButton = host.page.getByRole('button', { name: /create room/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for room code to appear
    await host.page.waitForURL(/\/room\/[A-Z0-9]+$/);
    const url = host.page.url();
    roomCode = url.match(/\/room\/([A-Z0-9]+)$/)?.[1] || '';
    expect(roomCode).toBeTruthy();
    console.log(`Room created with code: ${roomCode}`);

    // Player joins the room
    await player.page.goto(`${BASE_URL}/join`);
    await player.page.waitForLoadState('networkidle');

    const codeInput = player.page.locator('input[placeholder*="room code" i], input[placeholder*="code" i]').first();
    await expect(codeInput).toBeVisible({ timeout: 10000 });
    await codeInput.fill(roomCode);

    const joinButton = player.page.getByRole('button', { name: /join/i }).first();
    await joinButton.click();

    // Wait for both players to be in the lobby
    await expect(host.page.locator('text=Waiting for players')).toBeVisible({ timeout: 10000 });
    await expect(player.page.locator('text=Waiting for players')).toBeVisible({ timeout: 10000 });

    console.log('Both players in lobby');

    // Mark both as ready
    const hostReadyButton = host.page.getByRole('button', { name: /ready/i }).first();
    await hostReadyButton.click();
    await host.page.waitForTimeout(500);

    const playerReadyButton = player.page.getByRole('button', { name: /ready/i }).first();
    await playerReadyButton.click();
    await player.page.waitForTimeout(500);

    // Host starts the game
    const startButton = host.page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();

    // Wait for both players to enter the game
    await host.page.waitForURL(/\/room\/[A-Z0-9]+\/play$/, { timeout: 15000 });
    await player.page.waitForURL(/\/room\/[A-Z0-9]+\/play$/, { timeout: 15000 });

    console.log('Game started successfully');

    // Wait for game to load
    await host.page.waitForTimeout(2000);
    await player.page.waitForTimeout(2000);

    // Step 2: Find the chat panel
    console.log('Step 2: Finding chat panel...');

    // Chat panel should be visible on large screens (we're using desktop viewport)
    const hostChatPanel = host.page.locator('text=Chat').first();
    const playerChatPanel = player.page.locator('text=Chat').first();

    await expect(hostChatPanel).toBeVisible({ timeout: 10000 });
    await expect(playerChatPanel).toBeVisible({ timeout: 10000 });

    console.log('Chat panels found for both players');

    // Step 3: Type a message in the chat input
    console.log('Step 3: Typing message from host...');

    const hostChatInput = host.page.locator('input[placeholder*="message" i]');
    await expect(hostChatInput).toBeVisible({ timeout: 5000 });

    const testMessage = 'Hello from the host!';
    await hostChatInput.fill(testMessage);

    console.log(`Host typed message: "${testMessage}"`);

    // Step 4: Press Enter or click Send
    console.log('Step 4: Sending message...');

    // Click the send button
    const sendButton = host.page.locator('button[type="button"]').filter({ has: host.page.locator('svg') }).last();
    await sendButton.click();

    console.log('Message sent');

    // Step 5: Verify message appears in chat history for both players
    console.log('Step 5: Verifying message appears in chat history...');

    // Wait for message to appear in host's chat
    await expect(host.page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    console.log('Message visible in host chat');

    // Wait for message to appear in player's chat
    await expect(player.page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    console.log('Message visible in player chat');

    // Verify username is shown with the message
    await expect(host.page.locator('text=You')).toBeVisible();
    await expect(player.page.locator(`text=${host.username}`)).toBeVisible();

    // Test bi-directional chat - player sends a message
    console.log('Testing bi-directional chat...');

    const playerChatInput = player.page.locator('input[placeholder*="message" i]');
    const playerMessage = 'Hi host! Chat works great!';
    await playerChatInput.fill(playerMessage);
    await playerChatInput.press('Enter'); // Test Enter key instead of button

    // Verify player's message appears for both
    await expect(player.page.locator(`text="${playerMessage}"`)).toBeVisible({ timeout: 5000 });
    await expect(host.page.locator(`text="${playerMessage}"`)).toBeVisible({ timeout: 5000 });

    console.log('Bi-directional chat verified');

    // Step 6: Take snapshot of chat
    console.log('Step 6: Taking snapshots...');

    await host.page.screenshot({
      path: 'frontend/tests/MP-02-chat-panel-host.png',
      fullPage: true,
    });

    await player.page.screenshot({
      path: 'frontend/tests/MP-02-chat-panel-player.png',
      fullPage: true,
    });

    console.log('Snapshots saved');
    console.log('✓ All acceptance criteria passed!');
  });

  test('should show typing indicator when user is typing', async () => {
    console.log('Testing typing indicator...');

    // Use existing contexts from previous test
    if (!host.page || !player.page) {
      test.skip();
      return;
    }

    // Player starts typing
    const playerChatInput = player.page.locator('input[placeholder*="message" i]');
    await playerChatInput.fill('T');

    // Host should see typing indicator
    await expect(host.page.locator(`text=${player.username} is typing`)).toBeVisible({ timeout: 2000 });
    console.log('Typing indicator appeared');

    // Wait for typing indicator to disappear (1 second timeout)
    await host.page.waitForTimeout(1500);
    await expect(host.page.locator(`text=${player.username} is typing`)).not.toBeVisible({ timeout: 2000 });
    console.log('Typing indicator disappeared after timeout');

    console.log('✓ Typing indicator test passed!');
  });
});

// Helper function to register and login a user
async function registerAndLoginUser(user: TestUser): Promise<void> {
  try {
    // Try to register
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        username: user.username,
      }),
    });

    if (registerResponse.ok) {
      const data = await registerResponse.json();
      user.token = data.token;
      console.log(`✓ User registered: ${user.username}`);
      return;
    }
  } catch (error) {
    // Registration might fail if user exists, try login
  }

  // Try to login
  try {
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      user.token = data.token;
      console.log(`✓ User logged in: ${user.username}`);
    } else {
      throw new Error(`Failed to login user ${user.username}`);
    }
  } catch (error) {
    console.error(`Failed to authenticate user ${user.username}:`, error);
    throw error;
  }
}
