import { test, expect } from '@playwright/test';

test.describe('LAND-05: Feature cards display', () => {
  test('should display feature cards with icons and descriptions', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3001/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Scroll to features section
    const featuresSection = page.locator('section#features');
    await featuresSection.scrollIntoViewIfNeeded();

    // Wait for scroll animations to complete
    await page.waitForTimeout(1000);

    // Verify features section is visible
    await expect(featuresSection).toBeVisible();

    // Verify section heading
    await expect(page.locator('text=Why Players Love Crossy')).toBeVisible();

    // Verify multiple feature cards are displayed
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);

    // Verify each card has icon and description
    const expectedFeatures = [
      {
        title: 'Multiplayer Rooms',
        description: 'Create a room, share the code, and race friends to solve together in real-time.'
      },
      {
        title: 'Daily Streaks',
        description: 'Build your streak by solving daily. Use freezes to save it when life gets busy.'
      },
      {
        title: 'Smart Hints',
        description: 'Reveal a letter, check a word, or see the solution when you need help.'
      }
    ];

    for (let i = 0; i < expectedFeatures.length; i++) {
      const card = featureCards.nth(i);

      // Verify card is visible
      await expect(card).toBeVisible();

      // Verify icon is present (check for SVG element inside the colored div)
      const iconContainer = card.locator('div[class*="bg-"]').first();
      await expect(iconContainer).toBeVisible();
      const icon = iconContainer.locator('svg');
      await expect(icon).toBeVisible();

      // Verify title
      await expect(card.locator(`text=${expectedFeatures[i].title}`)).toBeVisible();

      // Verify description
      await expect(card.locator(`text=${expectedFeatures[i].description}`)).toBeVisible();
    }

    // Take snapshot of feature cards
    await featuresSection.screenshot({
      path: 'frontend/tests/LAND-05-feature-cards.png',
      fullPage: false
    });

    console.log('✓ Multiple feature cards are displayed');
    console.log('✓ Each card has icon and description');
    console.log('✓ Snapshot taken: LAND-05-feature-cards.png');
  });
});
