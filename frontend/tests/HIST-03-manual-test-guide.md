# HIST-03: Play Again from History - Manual Test Guide

## Story
As a user, I can click 'Play Again' to re-solve a puzzle from my history.

## Prerequisites
- Backend server running on http://localhost:8080
- Frontend app running on http://localhost:3000
- Test user account created and logged in
- At least one completed puzzle in history

## Test Steps

### AC1: Login and navigate to /history
1. Open browser to http://localhost:3000
2. Login with test credentials
3. Navigate to http://localhost:3000/history
4. **Expected**: History page loads showing "Puzzle History" heading
5. **Expected**: See list of completed puzzles with stats (time, accuracy, date)

### AC2: Find a puzzle entry with 'Play Again' button
1. Scroll through the history list
2. **Expected**: Each puzzle entry has a purple "Play Again" button on the right side
3. **Expected**: Button displays PlayCircle icon and "Play Again" text
4. Take screenshot: `HIST-03-history-page.png`

### AC3: Click 'Play Again'
1. Click the "Play Again" button on any puzzle entry
2. **Expected**: Button shows hover effect (shadow changes, button translates)
3. **Expected**: Navigation occurs immediately after click

### AC4: Verify navigation to /play with that puzzle loaded
1. **Expected**: URL changes to http://localhost:3000/play
2. **Expected**: Puzzle grid loads and displays
3. **Expected**: Grid shows the crossword cells with numbers
4. **Expected**: Puzzle title is displayed at the top
5. **Expected**: Timer starts from 0:00
6. **Expected**: Clues panel shows "Across" and "Down" tabs with clues

### AC5: Take snapshot of loaded puzzle
1. Wait for puzzle to fully load (no skeleton loaders)
2. **Expected**: All puzzle elements are visible:
   - Title bar with puzzle name and difficulty
   - Timer showing 0:XX
   - Crossword grid with all cells
   - Current clue bar (purple background)
   - Clues panel with list
   - Action buttons (Check, Letter, Reveal Word, Reset)
   - Progress bar at 0%
   - Crossy mascot with speech bubble
3. Take screenshot: `HIST-03-loaded-puzzle.png`

### Additional Verification
1. Click on a cell in the grid
2. **Expected**: Cell highlights in purple
3. **Expected**: Word highlights in light purple
4. Type a letter
5. **Expected**: Letter appears in the cell
6. **Expected**: Cursor auto-advances to next cell

## Pass Criteria
- ✅ All expected behaviors occur
- ✅ No console errors
- ✅ Puzzle loads with correct data (same puzzle ID from history)
- ✅ Grid is interactive and functional
- ✅ Screenshots captured successfully

## Code Changes Implemented
- ✅ HistoryPage already has `handlePlayAgain` function (line 138-142)
- ✅ GameplayPage updated to accept `puzzleId` from location state
- ✅ GameplayPage fetches puzzle by ID when navigating from history
- ✅ Play Again button already styled and functional in HistoryPage

## Files Modified
- `frontend/app/src/pages/GameplayPage.tsx`
  - Added `useLocation` import
  - Added `puzzleIdFromState` from location state
  - Updated puzzle fetch logic to prioritize: puzzleId > date > today
  - Updated retry logic to handle puzzleId
