import { test, expect } from '@playwright/test';

test.describe('LAND-06: FAQ accordion', () => {
  test('should expand and collapse FAQ items', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3002/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Scroll to FAQ section
    const faqSection = page.locator('section').filter({ has: page.locator('text=Questions?') });
    await faqSection.scrollIntoViewIfNeeded();

    // Wait for scroll animations to complete
    await page.waitForTimeout(1000);

    // Verify FAQ section is visible
    await expect(faqSection).toBeVisible();
    await expect(page.locator('text=Questions?')).toBeVisible();

    // Verify FAQ items are present
    const faqItems = page.locator('.faq-item');
    await expect(faqItems).toHaveCount(4);

    // Test first FAQ item
    const firstFaqButton = faqItems.first().locator('button');
    const firstFaqQuestion = 'Is Crossy free to play?';
    const firstFaqAnswer = 'Yes! Daily puzzles are completely free. Premium unlocks the full archive and unlimited hints.';

    // Verify question is visible
    await expect(firstFaqButton.locator(`text=${firstFaqQuestion}`)).toBeVisible();

    // Initially answer should NOT be visible
    await expect(page.locator(`text=${firstFaqAnswer}`)).not.toBeVisible();

    // Take snapshot of collapsed state
    await faqSection.screenshot({
      path: 'tests/LAND-06-faq-collapsed.png',
      fullPage: false
    });

    // Click on FAQ question to expand
    await firstFaqButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Verify answer is now visible
    await expect(page.locator(`text=${firstFaqAnswer}`)).toBeVisible();

    // Verify chevron icon rotated (check for rotate-180 class)
    const chevronIcon = firstFaqButton.locator('svg').last();
    await expect(chevronIcon).toHaveClass(/rotate-180/);

    // Take snapshot of expanded state
    await faqSection.screenshot({
      path: 'tests/LAND-06-faq-expanded.png',
      fullPage: false
    });

    // Click on same question again to collapse
    await firstFaqButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Verify answer is hidden again
    await expect(page.locator(`text=${firstFaqAnswer}`)).not.toBeVisible();

    // Verify chevron icon returned to normal (no rotate-180 class)
    await expect(chevronIcon).not.toHaveClass(/rotate-180/);

    console.log('✓ FAQ question is visible');
    console.log('✓ Answer expands when clicked');
    console.log('✓ Answer collapses when clicked again');
    console.log('✓ Snapshots taken: LAND-06-faq-collapsed.png, LAND-06-faq-expanded.png');
  });
});
