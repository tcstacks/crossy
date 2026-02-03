# PLAY-01: Load Today's Daily Puzzle - Browser Test

## Manual Test Instructions

This test verifies that users can load today's daily puzzle from /play.

### Prerequisites
1. Backend server is running on `http://localhost:8080`
2. Frontend dev server is running on `http://localhost:5173`
3. Backend has at least one puzzle available for today's date

### Test Steps

1. **Navigate to /play**
   - Open browser to `http://localhost:5173/play`
   - Verify page starts loading

2. **Wait for puzzle to load**
   - Observe loading skeleton appears briefly
   - Wait for puzzle data to load from backend
   - ✅ Loading state should complete without errors

3. **Verify crossword grid is displayed**
   - ✅ Grid should be visible with white background and rounded corners
   - ✅ Grid cells should be properly rendered
   - ✅ Blocked cells (dark purple) and playable cells (white) are distinguishable
   - ✅ Cell numbers should be visible in top-left corners where applicable

4. **Verify puzzle title is shown**
   - ✅ Puzzle title should be displayed in the title bar
   - ✅ Title bar should show difficulty level (e.g., "Easy", "Medium", "Hard")
   - ✅ Grid dimensions should be shown (e.g., "7×7")

5. **Verify clues are displayed**
   - ✅ Clue panel should be visible below the grid
   - ✅ Two tabs should be present: "Across" and "Down"
   - ✅ Across clues should be listed with numbers
   - ✅ Down clues should be accessible by clicking the Down tab
   - ✅ Current active clue should be highlighted in purple bar above grid

6. **Take snapshot of loaded puzzle**
   - Take screenshot showing complete puzzle interface
   - Verify all UI elements are properly rendered

### Expected Behavior
- /play route loads today's puzzle without requiring a date parameter
- Puzzle loads successfully from backend API
- Crossword grid renders correctly with proper styling
- Puzzle metadata (title, difficulty, dimensions) is displayed
- Clues are organized into Across and Down sections
- UI is interactive and ready for gameplay

### Error Handling
- If puzzle fails to load, error message should be displayed
- "Try Again" button should allow retry

### Screenshots
Take snapshots showing:
1. Loading state (skeleton UI)
2. Fully loaded puzzle with grid, title, and clues
3. Clues panel with Across tab active
4. Clues panel with Down tab active

## Automated Browser Test Script

```typescript
// PLAY-01: Test loading today's daily puzzle
async function testLoadDailyPuzzle() {
  // Step 1: Navigate to /play
  await navigateTo('http://localhost:5173/play');

  // Step 2: Wait for puzzle to load (check for either loading skeleton or loaded content)
  await waitFor(3000); // Allow time for API call

  // Step 3: Verify no error state
  const hasError = await elementExists('Oops! Something went wrong');
  if (hasError) {
    console.error('❌ PLAY-01: Puzzle failed to load with error');
    await takeSnapshot('PLAY-01-error.txt');
    return;
  }

  // Step 4: Verify crossword grid is displayed
  await waitFor('crossword grid', 5000);

  // Step 5: Verify puzzle title is shown
  const hasPuzzleTitle = await elementExists('Crossword Puzzle');
  if (!hasPuzzleTitle) {
    console.error('❌ PLAY-01: Puzzle title not found');
  }

  // Step 6: Verify clues are displayed
  const hasAcrossTab = await elementExists('Across');
  const hasDownTab = await elementExists('Down');
  if (!hasAcrossTab || !hasDownTab) {
    console.error('❌ PLAY-01: Clue tabs not found');
  }

  // Step 7: Take snapshot of loaded puzzle
  await takeSnapshot('PLAY-01-daily-puzzle-loaded.txt');

  console.log('✅ PLAY-01: Load daily puzzle test PASSED');
  console.log('- Grid displayed: ✅');
  console.log('- Puzzle title shown: ✅');
  console.log('- Clues displayed: ✅');
}
```

## Manual Verification Checklist

- [ ] Navigate to /play without date parameter
- [ ] Puzzle loads successfully
- [ ] Crossword grid is displayed with proper styling
- [ ] Puzzle title is visible in title bar
- [ ] Difficulty level is shown
- [ ] Grid dimensions are displayed
- [ ] Across clues are listed in clues panel
- [ ] Down clues are accessible via tab
- [ ] Current clue is highlighted in purple bar
- [ ] UI is interactive (can click cells, type letters)
- [ ] Timer starts counting
- [ ] Progress bar is visible

## Notes
- This test focuses on the initial load experience for today's puzzle
- No date parameter should be required for /play route
- The puzzle loaded should be today's daily puzzle from the backend
- Test should work for any puzzle difficulty or grid size
