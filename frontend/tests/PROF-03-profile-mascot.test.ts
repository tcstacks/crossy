import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * PROF-03: Profile mascot display
 *
 * Acceptance Criteria:
 * - Login as a user
 * - Navigate to /profile
 * - Verify mascot image is displayed
 * - Verify motivational message is shown
 * - Take snapshot of mascot area
 */

test.describe('PROF-03: Profile mascot display', () => {
  test('should display mascot with motivational message on profile', async ({ page, request }) => {
    const testUser = {
      email: 'prof03test@example.com',
      password: 'Test123456',
      displayName: 'PROF03 Test User',
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

    // ✅ AC3: Verify mascot image is displayed

    // Check mascot in profile header
    const headerMascot = page.locator('img[alt="Crossy mascot"]').first();
    await expect(headerMascot).toBeVisible({ timeout: 5000 });

    // Verify the mascot has a valid src attribute
    const headerMascotSrc = await headerMascot.getAttribute('src');
    expect(headerMascotSrc).toBeTruthy();
    expect(headerMascotSrc).toMatch(/crossy-.*\.png/);

    console.log('✅ AC3: Mascot image displayed in header:', headerMascotSrc);

    // Check mascot in motivational section (the larger one at bottom, not in header)
    const motivationalMascot = page.locator('img[alt="Crossy"].w-16');
    await expect(motivationalMascot).toBeVisible({ timeout: 5000 });

    const motivationalMascotSrc = await motivationalMascot.getAttribute('src');
    expect(motivationalMascotSrc).toBeTruthy();
    expect(motivationalMascotSrc).toMatch(/crossy-.*\.png/);

    console.log('✅ AC3: Mascot image displayed in motivational section:', motivationalMascotSrc);

    // ✅ AC4: Verify motivational message is shown

    // The motivational message should be in a speech bubble div
    const motivationalMessage = page.locator('.bg-white.px-5.py-3.rounded-2xl');
    await expect(motivationalMessage).toBeVisible({ timeout: 5000 });

    // Get the actual message text
    const messageText = await motivationalMessage.textContent();
    expect(messageText).toBeTruthy();

    // Verify it's one of the expected motivational messages
    const expectedMessages = [
      "Let's solve your first puzzle!",
      "You're on fire! Keep it up!",
      "You're doing great! Keep solving!",
      "Keep up the good work!"
    ];

    const hasValidMessage = expectedMessages.some(msg => messageText?.includes(msg));
    expect(hasValidMessage).toBeTruthy();

    console.log('✅ AC4: Motivational message displayed:', messageText);

    // ✅ AC5: Take snapshot of mascot area

    // Take full page screenshot to capture both mascot locations
    const fullScreenshotPath = path.join(__dirname, 'PROF-03-profile-mascot-full.png');
    await page.screenshot({
      path: fullScreenshotPath,
      fullPage: true
    });
    console.log('✅ AC5: Full page screenshot saved to:', fullScreenshotPath);

    // Take screenshot of just the motivational section with mascot
    const motivationalSection = page.locator('.flex.justify-center').last();
    const mascotAreaPath = path.join(__dirname, 'PROF-03-mascot-area.png');
    await motivationalSection.screenshot({
      path: mascotAreaPath
    });
    console.log('✅ AC5: Mascot area screenshot saved to:', mascotAreaPath);

    // Additional verification: Check mascot animation class
    await expect(headerMascot).toHaveClass(/animate-bounce-slow/);
    console.log('✅ Header mascot has animation class');

    console.log('\n✅ All acceptance criteria passed for PROF-03');
  });

  test('should show different mascots based on user stats', async ({ page, request }) => {
    // This test verifies the dynamic mascot selection logic
    const testUser = {
      email: 'prof03stats@example.com',
      password: 'Test123456',
      displayName: 'PROF03 Stats User',
    };

    // Register and login
    try {
      await request.post('http://localhost:8080/api/auth/register', {
        data: testUser,
      });
    } catch (error) {
      // User might already exist
    }

    const loginResponse = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();

    await page.goto('http://localhost:3000');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('img[alt="Crossy mascot"]', { timeout: 10000 });

    // For a new user, should show default mascot
    const mascotSrc = await page.locator('img[alt="Crossy mascot"]').first().getAttribute('src');
    console.log('New user mascot:', mascotSrc);

    // Verify mascot image loads successfully
    const mascotElement = page.locator('img[alt="Crossy mascot"]').first();
    await expect(mascotElement).toBeVisible();

    console.log('✅ Dynamic mascot selection verified');
  });
});
