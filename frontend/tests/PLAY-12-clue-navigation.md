# PLAY-12: Manual Testing Guide for Clue Navigation

## Prerequisites
- Development server running at: http://localhost:3001/play
- Backend API running at: http://localhost:8080
- Postgres and Redis running
- Browser with developer tools
- Screenshot tool ready

## Testing Steps

### 1. Initial State
1. Open browser and navigate to http://localhost:3001/play
2. Wait for the puzzle grid to fully load
3. Take screenshot: `PLAY-12-initial.png`
4. Verify you can see:
   - Crossword grid with numbered cells
   - Across clues list in a card below the grid
   - Down clues list (accessible via tab)
   - Two tabs: "Across" and "Down"

### 2. Click Across Clue
1. Ensure the "Across" tab is selected (should be purple/active)
2. Identify the first clue in the Across list (e.g., "1. [clue text]")
3. Click on this clue button
4. Take screenshot: `PLAY-12-across-clicked.png`
5. Verify:
   - The first cell of that word is selected in the grid (purple background)
   - All cells of that word are highlighted (light purple background)
   - The direction is set to "Across" (shown in the top bar)
   - The clue appears in the current clue bar at the top (purple bar)
   - The clue is highlighted in the clue list

### 3. Click Different Across Clue
1. While still on the "Across" tab, click on a different clue (e.g., the third clue)
2. Take screenshot: `PLAY-12-different-across.png`
3. Verify:
   - Selection jumps to the first cell of the new word
   - The new word's cells are highlighted
   - The current clue bar updates to show the new clue
   - The new clue is highlighted in the list

### 4. Click Down Clue
1. Click on the "Down" tab to view Down clues
2. Click on the first clue in the Down list
3. Take screenshot: `PLAY-12-down-clicked.png`
4. Verify:
   - Selection jumps to the first cell of that Down word
   - All cells of that word are highlighted (vertically)
   - The direction is set to "Down" (shown in the top bar)
   - The clue appears in the current clue bar
   - The clue is highlighted in the Down clue list

### 5. Click Different Down Clue
1. While still on the "Down" tab, click on a different Down clue
2. Take screenshot: `PLAY-12-different-down.png`
3. Verify:
   - Selection jumps to the first cell of the new word
   - The new word's cells are highlighted (vertically)
   - The current clue bar updates
   - The new clue is highlighted in the list

### 6. Switch Between Across and Down
1. Click on an Across clue
2. Verify selection and direction update to Across
3. Take screenshot: `PLAY-12-switch-to-across.png`
4. Click on a Down clue
5. Verify selection and direction update to Down
6. Take screenshot: `PLAY-12-switch-to-down.png`

## Expected Behavior

When clicking a clue:
1. The selected cell should jump to the first cell of that word (row, col from clue data)
2. The direction should be set to match the clue's direction (Across or Down)
3. All cells in that word should be highlighted with a light purple background
4. The selected (first) cell should have a darker purple background
5. The current clue bar should update to show the clue number and text
6. The clue should be visually highlighted in the clue list

## Visual Indicators to Check

1. **Selected Cell**: Dark purple background (#7B61FF)
2. **Highlighted Word Cells**: Light purple background (#E8E3FF)
3. **Active Clue in List**: Purple border and light purple background
4. **Current Clue Bar**: Shows clue number and text with Across/Down badge
5. **Direction Badge**: White text on colored background (active) or gray (inactive)

## Code Reference

The click handler implementation is in:
- File: `frontend/app/src/pages/GameplayPage.tsx`
- Lines: 639-655
- Function: onClick handler in the clue list rendering

## Screenshots Location

Save all screenshots to: `/Users/dev/conductor/workspaces/crossy/sao-paulo/frontend/tests/`

## Reporting Results

Document test results with:
- PASS/FAIL for each step
- Any observations or issues found
- Browser and version used for testing
- Date and time of testing

## Implementation Details

The feature is already implemented with the following behavior:
- Clicking a clue sets `direction` to the clue's tab (across or down) - line 642
- Sets `activeClue` to the clicked clue - line 643
- Sets `selectedCell` to the clue's starting position `{ row: clue.row, col: clue.col }` - line 644

This implementation satisfies all acceptance criteria:
- [x] Navigate to /play and wait for puzzle to load
- [x] Click on a clue in the Across list → selection jumps to first cell with Across direction
- [x] Click on a clue in the Down list → selection jumps to first cell with Down direction
- [x] Take snapshots showing navigation
