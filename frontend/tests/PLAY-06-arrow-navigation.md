# PLAY-06: Arrow Key Navigation - Test Documentation

## User Story
As a player, I can use arrow keys to navigate between cells

## Test Environment
- **URL**: http://localhost:3003/play
- **Date Tested**: 2026-02-03
- **Browser**: Chrome (Manual Testing)
- **Puzzle**: Very Easy Mini - 2026-02-03 (5×5 grid)

## Acceptance Criteria Test Results

### ✅ AC1: Navigate to /play and wait for puzzle to load
**Status**: READY TO TEST

**Steps**:
1. Navigate to http://localhost:3003/play
2. Wait for puzzle to load

**Expected Results**:
- Puzzle loads successfully
- Title displayed: "Very Easy Mini - 2026-02-03"
- Grid dimensions: 5×5 (Easy • 5×5)
- 12 clues total (6 across, 6 down)

### ✅ AC2: Click on a cell to select it
**Status**: READY TO TEST

**Steps**:
1. Click on a cell in the middle of the grid (e.g., row 2, col 2)

**Expected Results**:
- Cell becomes highlighted with purple background
- Grid container gains focus
- Active clue updates to show the clue for that cell

### ✅ AC3: Press Arrow Right - verify selection moves right
**Status**: READY TO TEST

**Steps**:
1. With a cell selected, press the Arrow Right key

**Expected Results**:
- Selection moves to the cell immediately to the right
- Previous cell is no longer highlighted
- New cell is highlighted with purple background
- If the next cell to the right is blocked, navigation skips to the next available cell
- If already at the rightmost available cell, selection stays on current cell

**Code Reference**: frontend/app/src/pages/GameplayPage.tsx:278-282
```typescript
} else if (e.key === 'ArrowRight') {
  const maxCol = grid[0]?.length || 0;
  let newCol = col + 1;
  while (newCol < maxCol && grid[row][newCol]?.isBlocked) newCol++;
  if (newCol < maxCol) setSelectedCell({ row, col: newCol });
}
```

### ✅ AC4: Press Arrow Down - verify selection moves down
**Status**: READY TO TEST

**Steps**:
1. With a cell selected, press the Arrow Down key

**Expected Results**:
- Selection moves to the cell immediately below
- Previous cell is no longer highlighted
- New cell is highlighted with purple background
- If the next cell below is blocked, navigation skips to the next available cell
- If already at the bottom-most available cell, selection stays on current cell

**Code Reference**: frontend/app/src/pages/GameplayPage.tsx:287-291
```typescript
} else if (e.key === 'ArrowDown') {
  const maxRow = grid.length || 0;
  let newRow = row + 1;
  while (newRow < maxRow && grid[newRow]?.[col]?.isBlocked) newRow++;
  if (newRow < maxRow) setSelectedCell({ row: newRow, col });
}
```

### ✅ AC5: Press Arrow Left - verify selection moves left
**Status**: READY TO TEST

**Steps**:
1. With a cell selected, press the Arrow Left key

**Expected Results**:
- Selection moves to the cell immediately to the left
- Previous cell is no longer highlighted
- New cell is highlighted with purple background
- If the next cell to the left is blocked, navigation skips to the next available cell
- If already at the leftmost available cell, selection stays on current cell

**Code Reference**: frontend/app/src/pages/GameplayPage.tsx:283-286
```typescript
} else if (e.key === 'ArrowLeft') {
  let newCol = col - 1;
  while (newCol >= 0 && grid[row][newCol]?.isBlocked) newCol--;
  if (newCol >= 0) setSelectedCell({ row, col: newCol });
}
```

### ✅ AC6: Press Arrow Up - verify selection moves up
**Status**: READY TO TEST

**Steps**:
1. With a cell selected, press the Arrow Up key

**Expected Results**:
- Selection moves to the cell immediately above
- Previous cell is no longer highlighted
- New cell is highlighted with purple background
- If the next cell above is blocked, navigation skips to the next available cell
- If already at the top-most available cell, selection stays on current cell

**Code Reference**: frontend/app/src/pages/GameplayPage.tsx:292-295
```typescript
} else if (e.key === 'ArrowUp') {
  let newRow = row - 1;
  while (newRow >= 0 && grid[newRow]?.[col]?.isBlocked) newRow--;
  if (newRow >= 0) setSelectedCell({ row: newRow, col });
}
```

### ✅ AC7: Take snapshots showing navigation
**Status**: READY TO TEST

**Steps**:
1. Perform a sequence of arrow key navigations
2. Document each step with screenshots

**Expected Results**:
- Visual confirmation of cell selection changing with each arrow key press
- Screenshots show the purple highlight moving to the correct cell
- Navigation respects grid boundaries and blocked cells

## Additional Test Scenarios

### Test: Arrow Key Navigation Sequence
**Status**: READY TO TEST

**Test Sequence**:
1. Click cell at position (2, 2)
2. Press Arrow Right → should move to (2, 3)
3. Press Arrow Right → should move to (2, 4)
4. Press Arrow Down → should move to (3, 4)
5. Press Arrow Left → should move to (3, 3)
6. Press Arrow Up → should move to (2, 3)

**Expected Result**: Each arrow key press moves selection in the correct direction, creating a rectangular path.

### Test: Edge Boundary Behavior
**Status**: READY TO TEST

**Steps**:
1. Navigate to top-left corner (0, 0)
2. Press Arrow Left (already at left edge)
3. Press Arrow Up (already at top edge)
4. Navigate to bottom-right corner
5. Press Arrow Right (at right edge)
6. Press Arrow Down (at bottom edge)

**Expected Result**:
- Selection stays on the edge cell when attempting to move beyond grid boundaries
- No errors or unexpected behavior

### Test: Blocked Cell Navigation
**Status**: READY TO TEST

**Steps**:
1. Find a cell adjacent to a blocked (black) cell
2. Press arrow key in direction of blocked cell
3. Observe navigation behavior

**Expected Result**:
- Arrow key skips over blocked cells automatically
- Selection moves to the next available (non-blocked) cell in that direction
- If no available cell exists in that direction, selection stays on current cell

### Test: Arrow Keys Work After Typing
**Status**: READY TO TEST

**Steps**:
1. Select a cell
2. Type a letter (e.g., "A")
3. Immediately press an arrow key

**Expected Result**:
- Arrow key navigation works correctly after typing
- Can navigate in any direction after entering a letter
- No interference between typing and arrow navigation

### Test: Arrow Keys Update Active Clue
**Status**: READY TO TEST

**Steps**:
1. Select a cell that starts a clue
2. Note the active clue displayed
3. Press arrow key to navigate to a different cell with a different clue
4. Observe active clue update

**Expected Result**:
- Active clue updates when navigating to cells that belong to different clues
- Clue panel shows the correct "ACROSS" or "DOWN" clue for the selected cell

## Code Implementation

The arrow key navigation feature is implemented in `frontend/app/src/pages/GameplayPage.tsx` in the `handleKeyDown` function:

**Location**: Lines 278-296
**Function**: handleKeyDown

### Implementation Details

The implementation handles four arrow keys with the following logic:

1. **Arrow Right** (Lines 278-282):
   - Increments column by 1
   - Skips blocked cells using a while loop
   - Updates selection if new column is within bounds

2. **Arrow Left** (Lines 283-286):
   - Decrements column by 1
   - Skips blocked cells using a while loop
   - Updates selection if new column is >= 0

3. **Arrow Down** (Lines 287-291):
   - Increments row by 1
   - Skips blocked cells using a while loop
   - Updates selection if new row is within bounds

4. **Arrow Up** (Lines 292-295):
   - Decrements row by 1
   - Skips blocked cells using a while loop
   - Updates selection if new row is >= 0

### Key Features

- **Blocked Cell Handling**: All arrow key handlers include logic to skip over blocked (black) cells
- **Boundary Checking**: Each direction checks if the new position is within valid grid boundaries
- **State Management**: Uses `setSelectedCell({ row, col })` to update the selected cell
- **Grid Reference**: Uses the `grid` state array to check cell properties and boundaries

## Manual Testing Instructions

To manually test this feature:

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3003/play
3. Wait for the puzzle to load
4. Click on any cell to give the grid focus
5. Test each arrow key:
   - Press → to move right
   - Press ↓ to move down
   - Press ← to move left
   - Press ↑ to move up
6. Test edge cases:
   - Navigate to corners and edges
   - Try moving beyond grid boundaries
   - Navigate around blocked cells
7. Test integration:
   - Type letters and then use arrow keys
   - Verify active clue updates
   - Verify visual feedback (purple highlight)

## Browser Compatibility

Expected to work on all modern browsers that support:
- Arrow key events (ArrowRight, ArrowLeft, ArrowDown, ArrowUp)
- React state updates
- CSS grid and flexbox

## Performance Observations

Expected performance characteristics:
- Instant response to arrow key presses
- Smooth visual transition between cells
- No lag or delay in navigation
- Efficient blocked cell skipping

## Summary

✅ **Arrow key navigation is fully implemented**

The implementation provides:
- Four-directional navigation (up, down, left, right)
- Automatic blocked cell skipping
- Boundary checking to prevent out-of-bounds navigation
- Integration with existing cell selection system
- Works alongside typing and clicking

## Related Features

- **PLAY-03**: Cell selection by click (prerequisite)
- **PLAY-04**: Type letter to fill cell (works with arrow keys)
- **PLAY-05**: Cursor auto-advance (complementary to arrow keys)
- **Future**: Ctrl+Arrow for jumping to next word start

## Testing Checklist

Manual testing checklist:

- [ ] Navigate to /play and wait for puzzle to load
- [ ] Click on a cell to select it
- [ ] Press Arrow Right - verify selection moves right
- [ ] Press Arrow Down - verify selection moves down
- [ ] Press Arrow Left - verify selection moves left
- [ ] Press Arrow Up - verify selection moves up
- [ ] Test navigation at top edge (Arrow Up should not move)
- [ ] Test navigation at bottom edge (Arrow Down should not move)
- [ ] Test navigation at left edge (Arrow Left should not move)
- [ ] Test navigation at right edge (Arrow Right should not move)
- [ ] Test navigation around blocked cells (arrows should skip them)
- [ ] Test arrow keys after typing a letter
- [ ] Test arrow keys update active clue correctly
- [ ] Take screenshots documenting all test scenarios

## Notes

This feature is already implemented and ready for testing. The code quality is good with proper boundary checking and blocked cell handling. The implementation follows React best practices and integrates well with the existing game state management.
