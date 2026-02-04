import { test, expect } from '@playwright/test';

test.describe('NAV-05: 404 Page Display', () => {
  test('should display 404 page for invalid routes', async ({ page }) => {
    // Navigate to an invalid page
    await page.goto('http://localhost:3000/some-invalid-page-xyz');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'frontend/tests/NAV-05-404-page.png',
      fullPage: true
    });

    // Verify 404 page is displayed with "not found" message
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('h2')).toContainText('Page Not Found');

    // Verify there's explanatory text about not found
    await expect(page.getByText(/doesn't exist/i)).toBeVisible();

    // Verify there's a link/button to go home
    const homeButton = page.getByRole('button', { name: /go home/i });
    await expect(homeButton).toBeVisible();

    // Test that the home button works
    await homeButton.click();
    await page.waitForURL('http://localhost:3000/');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should display 404 page for deeply nested invalid routes', async ({ page }) => {
    // Test another invalid route to ensure catch-all works
    await page.goto('http://localhost:3000/deeply/nested/invalid/route');
    await page.waitForLoadState('networkidle');

    // Verify 404 elements are present
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.getByRole('button', { name: /go home/i })).toBeVisible();
  });
});
