import { test, expect } from '@playwright/test';

test.describe('LAND-04: Interactive demo puzzle', () => {
  test('should display and interact with demo puzzle', async ({ page }) => {
    // Navigate to / (home page)
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('section', { timeout: 10000 });

    console.log('✓ Home page loaded');

    // Find the interactive demo grid
    // The demo is in a section with crossword cells
    const demoSection = page.locator('section:has(.crossword-cell)').first();
    await expect(demoSection).toBeVisible();

    console.log('✓ Interactive demo grid found');

    // Find a clickable cell (not blocked)
    // Looking for cells in the demo grid
    const demoGrid = page.locator('.crossword-cell').first();
    await expect(demoGrid).toBeVisible();

    console.log('✓ Demo grid cells are visible');

    // Click on a cell in the demo
    // Find first non-blocked cell (should have white background, not blocked bg)
    const firstCell = page.locator('.crossword-cell').filter({ hasNot: page.locator('.blocked') }).first();
    await firstCell.click();

    console.log('✓ Clicked on a cell in the demo');

    // Verify cell is now selected (should have purple background)
    await expect(firstCell).toHaveClass(/selected/);

    console.log('✓ Cell is selected');

    // Type a letter
    await page.keyboard.press('C');

    console.log('✓ Typed letter "C"');

    // Verify letter appears in the demo grid
    // The cell should now contain the letter 'C'
    await expect(firstCell).toContainText('C');

    console.log('✓ Letter "C" appears in the demo grid');

    // Take snapshot of demo interaction
    await page.screenshot({
      path: 'frontend/tests/LAND-04-demo-interaction.png',
      fullPage: false
    });

    console.log('✓ Snapshot taken of demo interaction');
  });

  test('should support keyboard navigation in demo', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('.crossword-cell', { timeout: 10000 });

    // Click on first available cell
    const firstCell = page.locator('.crossword-cell').filter({ hasNot: page.locator('.blocked') }).first();
    await firstCell.click();

    console.log('✓ First cell selected');

    // Type multiple letters and verify auto-advance
    await page.keyboard.press('C');
    await page.waitForTimeout(100); // Small delay for state update

    await page.keyboard.press('A');
    await page.waitForTimeout(100);

    await page.keyboard.press('T');

    console.log('✓ Typed multiple letters with auto-advance');

    // Verify letters were entered
    const cells = page.locator('.crossword-cell').filter({ hasNot: page.locator('.blocked') });
    await expect(cells.nth(0)).toContainText('C');
    await expect(cells.nth(1)).toContainText('A');
    await expect(cells.nth(2)).toContainText('T');

    console.log('✓ Multiple letters appear in sequence');
  });

  test('should show clues and controls for demo puzzle', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for demo section to load
    await page.waitForSelector('.crossword-cell', { timeout: 10000 });

    // Verify clues section exists
    const cluesSection = page.locator('text=Clues').first();
    await expect(cluesSection).toBeVisible();

    console.log('✓ Clues section is visible');

    // Verify Across and Down clues are present
    const acrossClues = page.locator('text=Across').first();
    await expect(acrossClues).toBeVisible();

    const downClues = page.locator('text=Down').first();
    await expect(downClues).toBeVisible();

    console.log('✓ Across and Down clues are displayed');

    // Verify Check button exists
    const checkButton = page.locator('button:has-text("Check")').first();
    await expect(checkButton).toBeVisible();

    console.log('✓ Check button is visible');

    // Verify Hint button exists
    const hintButton = page.locator('button:has-text("Hint")').first();
    await expect(hintButton).toBeVisible();

    console.log('✓ Hint button is visible');
  });

  test('should handle letter input and demonstrate interactivity', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('.crossword-cell', { timeout: 10000 });

    // Click on first available cell
    const cells = page.locator('.crossword-cell').filter({ hasNot: page.locator('.blocked') });
    const firstCell = cells.first();
    await firstCell.click();

    console.log('✓ Cell selected');

    // Type multiple letters to show interactivity
    await page.keyboard.press('C');
    await page.waitForTimeout(100);
    await expect(firstCell).toContainText('C');

    console.log('✓ Letter "C" entered and displayed');

    // Move to next cell by typing another letter (auto-advance)
    await page.keyboard.press('A');
    await page.waitForTimeout(100);

    const secondCell = cells.nth(1);
    await expect(secondCell).toContainText('A');

    console.log('✓ Auto-advanced to next cell with letter "A"');

    // Take snapshot showing interactive state
    await page.screenshot({
      path: 'frontend/tests/LAND-04-interactive-typing.png',
      fullPage: false
    });

    console.log('✓ Interactive demo functionality verified');
  });

  test('should verify demo section title and description', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000/');

    // Wait for page to load
    await page.waitForSelector('section', { timeout: 10000 });

    // Verify demo section has a title
    const demoTitle = page.locator('text=Try a Quick Puzzle').first();
    await expect(demoTitle).toBeVisible();

    console.log('✓ Demo section title is displayed');

    // Verify demo section has description with grid size
    const demoDescription = page.locator('text=5×5').first();
    await expect(demoDescription).toBeVisible();

    console.log('✓ Demo section description is displayed');

    // Take snapshot of full demo section
    const demoSection = page.locator('section:has(.crossword-cell)').first();
    await demoSection.screenshot({
      path: 'frontend/tests/LAND-04-full-demo-section.png'
    });

    console.log('✓ Full demo section snapshot taken');
  });
});
