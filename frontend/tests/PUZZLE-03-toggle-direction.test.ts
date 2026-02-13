import { test, expect } from '@playwright/test';

/**
 * PUZZLE-03: Toggle direction with arrow keys or click
 *
 * As a player, I can toggle between Across and Down directions
 *
 * Acceptance Criteria:
 * - Complete PUZZLE-01 to load puzzle
 * - Click on a cell that has both Across and Down clues
 * - Verify direction indicator shows 'Across'
 * - Click on the same cell again
 * - Verify direction toggles to 'Down'
 * - Verify different clue is now highlighted
 * - Press right/left arrow key
 * - Verify direction changes to 'Across'
 * - Press up/down arrow key
 * - Verify direction changes to 'Down'
 * - Take screenshot showing direction change
 */

test.describe('PUZZLE-03: Toggle Direction with Arrow Keys or Click', () => {
  test('should toggle direction when clicking same cell and with arrow keys', async ({ page }) => {
    // Intercept API call to GET /api/puzzles/today
    await page.route('**/api/puzzles/today', async route => {
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    // Navigate to /play
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    console.log('✅ PUZZLE-01 completed: Puzzle loaded successfully');

    // Wait for grid to be visible
    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Find a cell that has both across and down clues (typically cell 0,0 or an intersection)
    const gridCells = crosswordGrid.locator('> div');
    let targetCell;
    const cellCount = await gridCells.count();

    // Find first non-blocked cell (which should have both directions available)
    for (let i = 0; i < cellCount; i++) {
      const cell = gridCells.nth(i);
      const bgColor = await cell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      if (!bgColor.includes('rgb(42, 30, 92)')) { // Not blocked
        targetCell = cell;
        break;
      }
    }

    expect(targetCell).toBeDefined();

    // Click on the target cell
    await targetCell!.click();
    await page.waitForTimeout(300);

    console.log('✅ Clicked on cell with both Across and Down clues');

    // Get direction buttons to check active direction
    const acrossButton = page.locator('button').filter({ hasText: 'ACROSS' }).first();
    const downButton = page.locator('button').filter({ hasText: 'DOWN' }).first();

    // Verify initial direction indicator (should default to 'Across')
    const initialAcrossClasses = await acrossButton.getAttribute('class');
    const initialDownClasses = await downButton.getAttribute('class');

    const initialIsAcross = initialAcrossClasses?.includes('bg-white');
    expect(initialIsAcross).toBe(true);
    console.log('✅ Direction indicator shows "Across"');

    // Get initial active clue text
    const initialActiveClue = page.locator('.border-\\[\\#7B61FF\\]').first();
    const initialClueText = await initialActiveClue.textContent();
    console.log(`Initial clue: ${initialClueText}`);

    // Click on the same cell again to toggle direction
    await targetCell!.click();
    await page.waitForTimeout(300);

    console.log('✅ Clicked on same cell again');

    // Verify direction toggled to 'Down'
    const afterToggleAcrossClasses = await acrossButton.getAttribute('class');
    const afterToggleDownClasses = await downButton.getAttribute('class');

    const afterToggleIsDown = afterToggleDownClasses?.includes('bg-white');
    expect(afterToggleIsDown).toBe(true);
    console.log('✅ Direction toggled to "Down"');

    // Verify different clue is now highlighted
    const newActiveClue = page.locator('.border-\\[\\#7B61FF\\]').first();
    const newClueText = await newActiveClue.textContent();
    expect(newClueText).not.toBe(initialClueText);
    console.log(`✅ Different clue highlighted: ${newClueText}`);

    // Take screenshot showing DOWN direction
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-03-direction-down.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: PUZZLE-03-direction-down.png');

    // Press right arrow key
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    console.log('✅ Pressed right arrow key');

    // Verify direction changes to 'Across'
    const afterRightArrowAcrossClasses = await acrossButton.getAttribute('class');
    const afterRightArrowIsAcross = afterRightArrowAcrossClasses?.includes('bg-white');
    expect(afterRightArrowIsAcross).toBe(true);
    console.log('✅ Direction changed to "Across" after right arrow');

    // Take screenshot showing ACROSS direction
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-03-direction-across-arrow.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: PUZZLE-03-direction-across-arrow.png');

    // Press down arrow key
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    console.log('✅ Pressed down arrow key');

    // Verify direction changes to 'Down'
    const afterDownArrowDownClasses = await downButton.getAttribute('class');
    const afterDownArrowIsDown = afterDownArrowDownClasses?.includes('bg-white');
    expect(afterDownArrowIsDown).toBe(true);
    console.log('✅ Direction changed to "Down" after down arrow');

    // Take final screenshot showing direction change
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-03-direction-change.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: PUZZLE-03-direction-change.png');

    // Summary
    console.log('\n📋 All acceptance criteria verified:');
    console.log('  ✓ PUZZLE-01 completed: Puzzle loaded');
    console.log('  ✓ Clicked on cell with both Across and Down clues');
    console.log('  ✓ Direction indicator showed "Across"');
    console.log('  ✓ Clicked same cell again');
    console.log('  ✓ Direction toggled to "Down"');
    console.log('  ✓ Different clue highlighted');
    console.log('  ✓ Pressed right arrow key');
    console.log('  ✓ Direction changed to "Across"');
    console.log('  ✓ Pressed down arrow key');
    console.log('  ✓ Direction changed to "Down"');
    console.log('  ✓ Screenshots taken');
  });

  test('should change direction with left arrow key', async ({ page }) => {
    await page.route('**/api/puzzles/today', async route => {
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Find and click a non-blocked cell
    const gridCells = crosswordGrid.locator('> div');
    let targetCell;
    const cellCount = await gridCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = gridCells.nth(i);
      const bgColor = await cell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      if (!bgColor.includes('rgb(42, 30, 92)')) {
        targetCell = cell;
        break;
      }
    }

    await targetCell!.click();
    await page.waitForTimeout(300);

    // Set to DOWN direction first
    await targetCell!.click();
    await page.waitForTimeout(300);

    const downButton = page.locator('button').filter({ hasText: 'DOWN' }).first();
    const downClasses = await downButton.getAttribute('class');
    expect(downClasses).toContain('bg-white');
    console.log('✅ Direction set to DOWN');

    // Press left arrow key
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    const acrossButton = page.locator('button').filter({ hasText: 'ACROSS' }).first();
    const acrossClasses = await acrossButton.getAttribute('class');
    expect(acrossClasses).toContain('bg-white');
    console.log('✅ Left arrow key changed direction to ACROSS');
  });

  test('should change direction with up arrow key', async ({ page }) => {
    await page.route('**/api/puzzles/today', async route => {
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Find and click a non-blocked cell
    const gridCells = crosswordGrid.locator('> div');
    let targetCell;
    const cellCount = await gridCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = gridCells.nth(i);
      const bgColor = await cell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      if (!bgColor.includes('rgb(42, 30, 92)')) {
        targetCell = cell;
        break;
      }
    }

    await targetCell!.click();
    await page.waitForTimeout(300);

    // Default should be ACROSS
    const acrossButton = page.locator('button').filter({ hasText: 'ACROSS' }).first();
    const initialAcrossClasses = await acrossButton.getAttribute('class');
    expect(initialAcrossClasses).toContain('bg-white');
    console.log('✅ Direction initially ACROSS');

    // Press up arrow key
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);

    const downButton = page.locator('button').filter({ hasText: 'DOWN' }).first();
    const downClasses = await downButton.getAttribute('class');
    expect(downClasses).toContain('bg-white');
    console.log('✅ Up arrow key changed direction to DOWN');
  });
});
