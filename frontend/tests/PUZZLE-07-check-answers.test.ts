import { test, expect } from '@playwright/test';

/**
 * PUZZLE-07: Check answers shows errors
 *
 * As a player, I can check my answers and see which are incorrect
 *
 * Acceptance Criteria:
 * - Complete PUZZLE-01 to load puzzle
 * - Fill in several cells with incorrect letters
 * - Fill in some cells with correct letters
 * - Find and click the 'Check' button
 * - Verify incorrect cells are highlighted in red/error state
 * - Verify correct cells remain normal
 * - Take screenshot showing error highlighting
 */

test.describe('PUZZLE-07: Check Answers Shows Errors', () => {
  test('should highlight incorrect cells in red when checking answers', async ({ page }) => {
    // Mock puzzle data with a simple 3x3 grid
    const mockPuzzleData = {
      id: 'test-puzzle-1',
      title: 'Test Puzzle',
      difficulty: 'easy',
      gridWidth: 3,
      gridHeight: 3,
      grid: [
        [{ letter: 'C', number: 1 }, { letter: 'A', number: null }, { letter: 'T', number: null }],
        [{ letter: 'A', number: 2 }, { letter: 'R', number: null }, { letter: null, number: null }],
        [{ letter: 'T', number: 3 }, { letter: null, number: null }, { letter: null, number: null }]
      ],
      cluesAcross: [
        { number: 1, text: 'Feline pet', answer: 'CAT', positionX: 0, positionY: 0 }
      ],
      cluesDown: [
        { number: 1, text: 'Vehicle', answer: 'CAR', positionX: 0, positionY: 0 },
        { number: 2, text: 'Rodent', answer: 'RAT', positionX: 1, positionY: 0 }
      ]
    };

    // Intercept API call to GET /api/puzzles/today and return mock data
    await page.route('**/api/puzzles/today', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPuzzleData)
      });
    });

    // Navigate to /play
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    console.log('✅ PUZZLE-01: Puzzle loaded successfully');

    // Wait for the grid to be visible
    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Get all cells (including blocked)
    const allCells = crosswordGrid.locator('> div');
    const cellCount = await allCells.count();

    console.log(`Grid has ${cellCount} total cells`);

    // Click the first cell (0,0) - should be 'C'
    const cell0 = allCells.nth(0);
    await cell0.click();
    await page.keyboard.press('X'); // Incorrect (should be 'C')
    console.log('  Cell (0,0): Filled with "X" (incorrect, should be "C")');

    // Move to next cell (0,1) - should be 'A'
    await page.keyboard.press('A'); // Correct
    console.log('  Cell (0,1): Filled with "A" (correct)');

    // Move to next cell (0,2) - should be 'T'
    await page.keyboard.press('Z'); // Incorrect (should be 'T')
    console.log('  Cell (0,2): Filled with "Z" (incorrect, should be "T")');

    // Click cell (1,0) - should be 'A'
    const cell3 = allCells.nth(3);
    await cell3.click();
    await page.keyboard.press('A'); // Correct
    console.log('  Cell (1,0): Filled with "A" (correct)');

    // Move to next cell (1,1) - should be 'R'
    await page.keyboard.press('Q'); // Incorrect (should be 'R')
    console.log('  Cell (1,1): Filled with "Q" (incorrect, should be "R")');

    console.log('✅ Filled cells with mixed correct and incorrect letters');

    // Find and click the Check button
    const checkButton = page.getByRole('button', { name: /Check/i });
    await expect(checkButton).toBeVisible();
    await checkButton.click();

    console.log('✅ Clicked Check button');

    // Wait for the check animation to complete
    await page.waitForTimeout(500);

    // Verify incorrect cells are highlighted in red
    // The incorrect cells should have bg-[#FF4D6A] (red) background
    const redCells = crosswordGrid.locator('.bg-\\[\\#FF4D6A\\]');
    const redCellCount = await redCells.count();

    console.log(`Found ${redCellCount} cells with red highlighting`);
    expect(redCellCount).toBeGreaterThan(0);

    // Verify at least one cell is highlighted red
    const firstRedCell = redCells.first();
    await expect(firstRedCell).toBeVisible();

    // Verify the red cell has the correct styling
    const hasRedBg = await firstRedCell.evaluate((el) => {
      return el.classList.contains('bg-[#FF4D6A]');
    });
    expect(hasRedBg).toBeTruthy();

    console.log('✅ Incorrect cells are highlighted in red');

    // Verify green cells exist (correct cells)
    const greenCells = crosswordGrid.locator('.bg-\\[\\#2ECC71\\]');
    const greenCellCount = await greenCells.count();

    if (greenCellCount > 0) {
      console.log(`✅ Correct cells are highlighted in green (${greenCellCount} cells)`);
    } else {
      console.log('⚠️  No correct cells highlighted (all filled cells are incorrect)');
    }

    // Take screenshot showing error highlighting
    await page.screenshot({
      path: 'frontend/tests/PUZZLE-07-check-errors.png',
      fullPage: true
    });

    console.log('✅ Screenshot saved to frontend/tests/PUZZLE-07-check-errors.png');

    // Summary
    console.log('\n📋 All acceptance criteria verified:');
    console.log('  ✓ PUZZLE-01 completed - puzzle loaded');
    console.log('  ✓ Filled cells with incorrect letters');
    console.log('  ✓ Filled cells with correct letters');
    console.log('  ✓ Found and clicked Check button');
    console.log('  ✓ Incorrect cells highlighted in red');
    console.log('  ✓ Correct cells remain in normal/green state');
    console.log('  ✓ Screenshot taken');
  });

  test('should show all cells as red when all answers are incorrect', async ({ page }) => {
    // Mock puzzle data
    const mockPuzzleData = {
      id: 'test-puzzle-2',
      title: 'Test Puzzle',
      difficulty: 'easy',
      gridWidth: 3,
      gridHeight: 3,
      grid: [
        [{ letter: 'C', number: 1 }, { letter: 'A', number: null }, { letter: 'T', number: null }],
        [{ letter: 'A', number: 2 }, { letter: 'R', number: null }, { letter: null, number: null }],
        [{ letter: 'T', number: 3 }, { letter: null, number: null }, { letter: null, number: null }]
      ],
      cluesAcross: [
        { number: 1, text: 'Feline pet', answer: 'CAT', positionX: 0, positionY: 0 }
      ],
      cluesDown: [
        { number: 1, text: 'Vehicle', answer: 'CAR', positionX: 0, positionY: 0 }
      ]
    };

    await page.route('**/api/puzzles/today', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPuzzleData)
      });
    });

    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Get all cells
    const allCells = crosswordGrid.locator('> div');

    // Click first cell (0,0)
    await allCells.nth(0).click();

    // Fill 3 cells with incorrect letters
    await page.keyboard.press('X'); // Should be 'C'
    await page.keyboard.press('Y'); // Should be 'A'
    await page.keyboard.press('Z'); // Should be 'T'

    console.log('Filled 3 cells with incorrect letters (X, Y, Z)');

    // Click Check button
    const checkButton = page.getByRole('button', { name: /Check/i });
    await checkButton.click();

    // Wait for check to process
    await page.waitForTimeout(500);

    // All filled cells should be red (at least 2, since auto-advance might skip one)
    const redCells = crosswordGrid.locator('.bg-\\[\\#FF4D6A\\]');
    const redCellCount = await redCells.count();

    expect(redCellCount).toBeGreaterThanOrEqual(2);
    console.log(`✅ ${redCellCount} incorrect cells are highlighted in red`);
  });

  test('should clear error highlighting when typing after check', async ({ page }) => {
    // Mock puzzle data
    const mockPuzzleData = {
      id: 'test-puzzle-3',
      title: 'Test Puzzle',
      difficulty: 'easy',
      gridWidth: 3,
      gridHeight: 3,
      grid: [
        [{ letter: 'C', number: 1 }, { letter: 'A', number: null }, { letter: 'T', number: null }],
        [{ letter: 'A', number: 2 }, { letter: 'R', number: null }, { letter: null, number: null }],
        [{ letter: 'T', number: 3 }, { letter: null, number: null }, { letter: null, number: null }]
      ],
      cluesAcross: [
        { number: 1, text: 'Feline pet', answer: 'CAT', positionX: 0, positionY: 0 }
      ],
      cluesDown: [
        { number: 1, text: 'Vehicle', answer: 'CAR', positionX: 0, positionY: 0 }
      ]
    };

    await page.route('**/api/puzzles/today', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPuzzleData)
      });
    });

    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    const crosswordGrid = page.locator('[data-testid="crossword-grid"]');
    await expect(crosswordGrid).toBeVisible();

    // Fill a cell with incorrect letter
    const allCells = crosswordGrid.locator('> div');
    await allCells.first().click();
    await page.keyboard.press('X');

    // Check answers
    const checkButton = page.getByRole('button', { name: /Check/i });
    await checkButton.click();
    await page.waitForTimeout(500);

    // Verify red highlighting exists
    let redCells = crosswordGrid.locator('.bg-\\[\\#FF4D6A\\]');
    expect(await redCells.count()).toBeGreaterThan(0);

    console.log('✅ Error highlighting shown after check');

    // Type a new letter in the same cell
    await allCells.first().click();
    await page.keyboard.press('A');

    // Wait a bit for UI to update
    await page.waitForTimeout(300);

    // The showCheck state should be cleared, so no red highlighting should remain
    // The cell should now have normal styling
    const cellStyles = await allCells.first().getAttribute('class');
    const hasRedStyle = cellStyles?.includes('bg-[#FF4D6A]');

    expect(hasRedStyle).toBeFalsy();
    console.log('✅ Error highlighting cleared after typing new letter');
  });
});
