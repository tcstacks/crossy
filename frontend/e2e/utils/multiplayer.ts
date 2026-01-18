import { Page, BrowserContext } from '@playwright/test';

export interface ClientHelper {
  page: Page;
  context: BrowserContext;
  userId: string | null;
  displayName: string;
  token: string | null;

  // Navigation
  goto(path: string): Promise<void>;

  // Auth
  loginAsGuest(name: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  login(email: string, password: string): Promise<void>;

  // Room management
  createRoom(options: { mode: 'collaborative' | 'race' | 'relay'; puzzleId?: string }): Promise<string>;
  joinRoom(roomCode: string): Promise<void>;
  startGame(): Promise<void>;
  leaveRoom(): Promise<void>;

  // Game actions
  fillCell(row: number, col: number, value: string): Promise<void>;
  getCellValue(row: number, col: number): Promise<string | null>;
  clearCell(row: number, col: number): Promise<void>;

  // Chat
  sendChatMessage(message: string): Promise<void>;
  getLastChatMessage(): Promise<string>;

  // Assertions
  waitForPlayerCount(count: number): Promise<void>;
  waitForGameStart(): Promise<void>;
  waitForPuzzleComplete(): Promise<void>;
}

export async function createClient(context: BrowserContext, displayName: string): Promise<ClientHelper> {
  const page = await context.newPage();

  let userId: string | null = null;
  let token: string | null = null;

  const helper: ClientHelper = {
    page,
    context,
    userId,
    displayName,
    token,

    async goto(path: string) {
      await page.goto(`http://localhost:3000${path}`);
      await page.waitForLoadState('networkidle');
    },

    async loginAsGuest(name: string) {
      await page.goto('http://localhost:3000/auth');
      await page.waitForLoadState('networkidle');

      // Click guest tab
      const guestTab = page.locator('button:has-text("Guest")');
      await guestTab.click();

      // Fill display name
      await page.fill('input[name="displayName"]', name);

      // Submit
      await page.click('button:has-text("Continue as Guest")');

      // Wait for redirect
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

      // Extract token from localStorage
      token = await page.evaluate(() => localStorage.getItem('token'));
      userId = await page.evaluate(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr).id : null;
      });

      helper.token = token;
      helper.userId = userId;
      helper.displayName = name;
    },

    async register(email: string, password: string, displayName: string) {
      await page.goto('http://localhost:3000/auth');
      await page.waitForLoadState('networkidle');

      // Click register tab
      const registerTab = page.locator('button:has-text("Register")');
      await registerTab.click();

      // Fill form
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="displayName"]', displayName);

      // Submit
      await page.click('button:has-text("Create Account")');

      // Wait for redirect
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

      // Extract token
      token = await page.evaluate(() => localStorage.getItem('token'));
      userId = await page.evaluate(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr).id : null;
      });

      helper.token = token;
      helper.userId = userId;
      helper.displayName = displayName;
    },

    async login(email: string, password: string) {
      await page.goto('http://localhost:3000/auth');
      await page.waitForLoadState('networkidle');

      // Login tab should be default
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);

      // Submit
      await page.click('button:has-text("Sign In")');

      // Wait for redirect
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });

      // Extract token
      token = await page.evaluate(() => localStorage.getItem('token'));
      userId = await page.evaluate(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr).id : null;
      });

      helper.token = token;
      helper.userId = userId;
    },

    async createRoom(options: { mode: 'collaborative' | 'race' | 'relay'; puzzleId?: string }) {
      await page.goto('http://localhost:3000/room/create');
      await page.waitForLoadState('networkidle');

      // Select mode
      await page.click(`button:has-text("${options.mode}")`);

      // Create room
      await page.click('button:has-text("Create Room")');

      // Wait for redirect to room page
      await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });

      // Extract room code from URL
      const url = page.url();
      const match = url.match(/\/room\/([A-Z0-9]+)/);
      const roomCode = match ? match[1] : '';

      return roomCode;
    },

    async joinRoom(roomCode: string) {
      await page.goto(`http://localhost:3000/room/${roomCode}`);
      await page.waitForLoadState('networkidle');

      // Wait for room to load
      await page.waitForSelector('.player-list', { timeout: 10000 });
    },

    async startGame() {
      const startButton = page.locator('button:has-text("Start Game")');
      await startButton.click();

      // Wait for game to start
      await page.waitForSelector('.crossword-grid', { timeout: 10000 });
    },

    async leaveRoom() {
      const leaveButton = page.locator('button:has-text("Leave")');
      await leaveButton.click();

      // Wait for redirect
      await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    },

    async fillCell(row: number, col: number, value: string) {
      // Click on the cell to focus it
      const cellSelector = `[data-row="${row}"][data-col="${col}"]`;
      await page.click(cellSelector);

      // Type the value
      await page.keyboard.type(value.toUpperCase());

      // Wait a bit for the update to propagate
      await page.waitForTimeout(100);
    },

    async getCellValue(row: number, col: number): Promise<string | null> {
      const cellSelector = `[data-row="${row}"][data-col="${col}"]`;
      const cell = page.locator(cellSelector);
      const value = await cell.getAttribute('data-value');
      return value || null;
    },

    async clearCell(row: number, col: number) {
      const cellSelector = `[data-row="${row}"][data-col="${col}"]`;
      await page.click(cellSelector);
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100);
    },

    async sendChatMessage(message: string) {
      const chatInput = page.locator('input[placeholder*="message"]');
      await chatInput.fill(message);
      await chatInput.press('Enter');
      await page.waitForTimeout(100);
    },

    async getLastChatMessage(): Promise<string> {
      const messages = page.locator('.chat-message');
      const count = await messages.count();
      if (count === 0) return '';
      const lastMessage = messages.nth(count - 1);
      return await lastMessage.textContent() || '';
    },

    async waitForPlayerCount(count: number) {
      await page.waitForFunction(
        (expectedCount) => {
          const playerItems = document.querySelectorAll('.player-list .player-item');
          return playerItems.length === expectedCount;
        },
        count,
        { timeout: 10000 }
      );
    },

    async waitForGameStart() {
      await page.waitForSelector('.crossword-grid', { timeout: 15000 });
    },

    async waitForPuzzleComplete() {
      await page.waitForSelector('.results-modal', { timeout: 30000 });
    },
  };

  return helper;
}

export async function createMultipleClients(
  context: BrowserContext,
  count: number
): Promise<ClientHelper[]> {
  const clients: ClientHelper[] = [];

  for (let i = 0; i < count; i++) {
    const client = await createClient(context, `Player ${i + 1}`);
    clients.push(client);
  }

  return clients;
}

export async function createRoomWithPlayers(
  context: BrowserContext,
  playerCount: number,
  mode: 'collaborative' | 'race' | 'relay' = 'collaborative'
): Promise<{ clients: ClientHelper[]; roomCode: string }> {
  const clients = await createMultipleClients(context, playerCount);

  // First player logs in and creates room
  await clients[0].loginAsGuest(`Host`);
  const roomCode = await clients[0].createRoom({ mode });

  // Other players log in and join
  for (let i = 1; i < playerCount; i++) {
    await clients[i].loginAsGuest(`Player ${i + 1}`);
    await clients[i].joinRoom(roomCode);
  }

  // Wait for all players to be in room
  await clients[0].waitForPlayerCount(playerCount);

  return { clients, roomCode };
}

export async function waitForWebSocketMessage(
  page: Page,
  messageType: string,
  timeout = 5000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for WebSocket message: ${messageType}`));
    }, timeout);

    // Listen for WebSocket messages
    page.on('websocket', (ws) => {
      ws.on('framereceived', (event) => {
        try {
          const data = JSON.parse(event.payload as string);
          if (data.type === messageType) {
            clearTimeout(timeoutId);
            resolve(data.payload);
          }
        } catch {
          // Ignore parse errors
        }
      });
    });
  });
}
