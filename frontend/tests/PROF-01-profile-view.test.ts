import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * PROF-01: View profile with username and email
 *
 * Acceptance Criteria:
 * - Login as a user
 * - Navigate to /profile
 * - Verify username is displayed
 * - Verify email is displayed
 * - Take snapshot of profile page
 */

test.describe('PROF-01: View profile with username and email', () => {
  test('should display user profile with username and email', async ({ page, request }) => {
    const testUser = {
      email: 'prof01test@example.com',
      password: 'Test123456',
      displayName: 'PROF01 Test User',
    };

    // ✅ AC1: Login as a user - Use API for reliable authentication

    // Try to register the user first (ignore errors if user exists)
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
        },
      });
    } catch (error) {
      // User might already exist, continue to login
    }

    // Login via API to get auth token
    const loginResponse = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', loginResponse.status(), errorText);
    }
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    // Set the auth token in localStorage via page context
    await page.goto('http://localhost:3000');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    console.log('✅ AC1: User logged in successfully');

    // ✅ AC2: Navigate to /profile
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');

    // Wait for profile page to load (no skeleton/loading state)
    await page.waitForSelector('h1', { timeout: 10000 });

    console.log('✅ AC2: Navigated to /profile');

    // ✅ AC3: Verify username is displayed
    const usernameElement = page.locator(`h1:has-text("${testUser.displayName}")`);
    await expect(usernameElement).toBeVisible({ timeout: 5000 });
    console.log('✅ AC3: Username displayed:', testUser.displayName);

    // ✅ AC4: Verify email is displayed
    const emailElement = page.locator(`text=${testUser.email}`);
    await expect(emailElement).toBeVisible({ timeout: 5000 });
    console.log('✅ AC4: Email displayed:', testUser.email);

    // ✅ AC5: Take snapshot of profile page
    const screenshotPath = path.join(__dirname, 'PROF-01-profile-page.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('✅ AC5: Screenshot saved to:', screenshotPath);

    // Additional verification: Check that stats section is present
    const statsSection = page.locator('text="Your Stats"');
    await expect(statsSection).toBeVisible();
    console.log('✅ Stats section is visible');

    // Verify profile header elements
    const profileHeader = page.locator('.crossy-card').first();
    await expect(profileHeader).toBeVisible();
    console.log('✅ Profile header card is visible');

    console.log('\n✅ All acceptance criteria passed for PROF-01');
  });
});
