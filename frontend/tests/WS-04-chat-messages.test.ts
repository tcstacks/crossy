import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * WS-04 - Chat messages in multiplayer
 *
 * Acceptance Criteria:
 * - [x] Complete WS-01 to establish WebSocket connection
 * - [x] Find the chat panel
 * - [x] Type a message 'Hello team!'
 * - [x] Press Enter or click Send
 * - [x] Verify chat:message sent via WebSocket
 * - [x] Verify message appears in chat history with your name
 * - [x] Take screenshot of chat
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

test.describe('WS-04 - Chat messages in multiplayer', () => {
  let browser: Browser;
  let host: TestUser;
  let player: TestUser;
  let roomCode: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    // Setup test users
    host = {
      email: 'host-ws04@test.com',
      password: 'password123',
      username: 'TeamHost',
    };

    player = {
      email: 'player-ws04@test.com',
      password: 'password123',
      username: 'TeamPlayer',
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

  test('should send and receive chat messages with WebSocket', async () => {
    // AC: Complete WS-01 to establish WebSocket connection
    console.log('Setting up WebSocket connection for multiplayer game...');

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

    // Setup WebSocket message listeners
    const hostMessages: any[] = [];
    const playerMessages: any[] = [];

    // Listen to WebSocket messages on both pages
    await host.page.exposeFunction('captureHostMessage', (msg: any) => {
      hostMessages.push(msg);
    });

    await player.page.exposeFunction('capturePlayerMessage', (msg: any) => {
      playerMessages.push(msg);
    });

    // Inject WebSocket monitoring script for host
    await host.page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      (window as any).WebSocket = function(...args: any[]) {
        const ws = new originalWebSocket(...args);
        const originalOnMessage = ws.onmessage;
        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            (window as any).captureHostMessage(data);
          } catch (e) {
            // Not JSON
          }
        });
        return ws;
      };
    });

    // Inject WebSocket monitoring script for player
    await player.page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      (window as any).WebSocket = function(...args: any[]) {
        const ws = new originalWebSocket(...args);
        const originalOnMessage = ws.onmessage;
        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            (window as any).capturePlayerMessage(data);
          } catch (e) {
            // Not JSON
          }
        });
        return ws;
      };
    });

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
    console.log(`✓ Room created with code: ${roomCode}`);

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

    console.log('✓ Both players in lobby, WebSocket connection established');

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

    console.log('✓ Game started successfully');

    // Wait for game to load
    await host.page.waitForTimeout(2000);
    await player.page.waitForTimeout(2000);

    // AC: Find the chat panel
    console.log('AC: Find the chat panel...');

    const hostChatPanel = host.page.locator('text=Chat').first();
    const playerChatPanel = player.page.locator('text=Chat').first();

    await expect(hostChatPanel).toBeVisible({ timeout: 10000 });
    await expect(playerChatPanel).toBeVisible({ timeout: 10000 });

    console.log('✓ Chat panel found');

    // AC: Type a message 'Hello team!'
    console.log("AC: Type a message 'Hello team!'...");

    const hostChatInput = host.page.locator('input[placeholder*="message" i]');
    await expect(hostChatInput).toBeVisible({ timeout: 5000 });

    const testMessage = 'Hello team!';
    await hostChatInput.fill(testMessage);

    console.log(`✓ Message typed: "${testMessage}"`);

    // AC: Press Enter or click Send
    console.log('AC: Press Enter to send...');

    // Clear messages array to capture only the chat message
    hostMessages.length = 0;
    playerMessages.length = 0;

    await hostChatInput.press('Enter');

    console.log('✓ Message sent via Enter key');

    // AC: Verify chat:message sent via WebSocket
    console.log('AC: Verify chat:message sent via WebSocket...');

    // Wait for WebSocket messages to be captured
    await host.page.waitForTimeout(1000);

    // Check if chat:message was sent
    const chatMessages = [...hostMessages, ...playerMessages].filter(
      msg => msg.type === 'chat:message'
    );

    expect(chatMessages.length).toBeGreaterThan(0);
    console.log(`✓ WebSocket chat:message captured (${chatMessages.length} messages)`);
    console.log('  Message payload:', JSON.stringify(chatMessages[0], null, 2));

    // AC: Verify message appears in chat history with your name
    console.log('AC: Verify message appears in chat history with your name...');

    // Wait for message to appear in host's chat with "You" label
    await expect(host.page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    await expect(host.page.locator('text=You')).toBeVisible();
    console.log('✓ Message appears in host chat with "You" label');

    // Wait for message to appear in player's chat with host's username
    await expect(player.page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    await expect(player.page.locator(`text=${host.username}`)).toBeVisible();
    console.log(`✓ Message appears in player chat with username "${host.username}"`);

    // AC: Take screenshot of chat
    console.log('AC: Take screenshot of chat...');

    await host.page.screenshot({
      path: 'frontend/tests/screenshots/WS-04-chat-host.png',
      fullPage: true,
    });

    await player.page.screenshot({
      path: 'frontend/tests/screenshots/WS-04-chat-player.png',
      fullPage: true,
    });

    console.log('✓ Screenshots saved');
    console.log('✅ All acceptance criteria passed!');
  });

  test('should verify WebSocket message structure', async () => {
    console.log('Verifying WebSocket message structure...');

    if (!host.page || !player.page) {
      test.skip();
      return;
    }

    const wsMessages: any[] = [];

    // Capture WebSocket messages
    await host.page.evaluate(() => {
      (window as any).__wsMessages = [];
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data) {
        try {
          const parsed = JSON.parse(data as string);
          (window as any).__wsMessages.push({ direction: 'sent', ...parsed });
        } catch (e) {
          // Not JSON
        }
        return originalSend.call(this, data);
      };
    });

    // Send a message
    const hostChatInput = host.page.locator('input[placeholder*="message" i]');
    await hostChatInput.fill('Test message structure');
    await hostChatInput.press('Enter');

    // Wait for message to be sent
    await host.page.waitForTimeout(1000);

    // Get captured messages
    const capturedMessages = await host.page.evaluate(() => (window as any).__wsMessages);

    // Find the chat message
    const chatMessage = capturedMessages.find((msg: any) => msg.type === 'chat:message');

    expect(chatMessage).toBeDefined();
    expect(chatMessage.type).toBe('chat:message');
    expect(chatMessage.payload).toBeDefined();
    expect(chatMessage.payload.message).toBeDefined();
    expect(chatMessage.payload.message.userId).toBeDefined();
    expect(chatMessage.payload.message.username).toBe(host.username);
    expect(chatMessage.payload.message.message).toBe('Test message structure');
    expect(chatMessage.payload.message.timestamp).toBeDefined();

    console.log('✓ WebSocket message structure verified');
    console.log('  Message structure:', JSON.stringify(chatMessage, null, 2));
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
