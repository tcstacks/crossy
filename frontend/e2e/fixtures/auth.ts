import { test as base } from '@playwright/test';
import { ClientHelper, createClient } from '../utils/multiplayer';

interface AuthFixtures {
  guestUser: ClientHelper;
  registeredUser: ClientHelper;
  authenticatedUser: ClientHelper;
}

export const test = base.extend<AuthFixtures>({
  guestUser: async ({ context }, use) => {
    const client = await createClient(context, 'Guest User');
    await client.loginAsGuest('Guest User');
    await use(client);
    await client.page.close();
  },

  registeredUser: async ({ context }, use) => {
    const client = await createClient(context, 'Test User');
    const timestamp = Date.now();
    await client.register(
      `testuser${timestamp}@test.com`,
      'password123',
      'Test User'
    );
    await use(client);
    await client.page.close();
  },

  authenticatedUser: async ({ context }, use) => {
    const client = await createClient(context, 'Auth User');
    const timestamp = Date.now();
    const email = `authuser${timestamp}@test.com`;

    // Register first
    await client.register(email, 'password123', 'Auth User');

    // Logout
    await client.page.goto('http://localhost:3000');
    await client.page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Login again
    await client.login(email, 'password123');

    await use(client);
    await client.page.close();
  },
});

export { expect } from '@playwright/test';
