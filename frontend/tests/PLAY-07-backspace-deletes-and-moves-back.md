# PLAY-07: Backspace deletes and moves back

## Test Steps

1. Navigate to http://localhost:5173/play
2. Wait for puzzle to load (verify grid is visible)
3. Click on a cell to select it
4. Type a few letters to fill consecutive cells
5. Press Backspace key
6. Verify:
   - Current cell is cleared
   - Selection moves back to previous cell
7. Press Backspace again
8. Verify the same behavior continues
9. Take snapshot showing deletion and cursor movement behavior

## Expected Result

- Backspace clears the current cell's content
- After clearing, the cursor automatically moves to the previous cell in the current direction (across or down)
- The cursor skips over blocked cells when moving back
- Behavior works consistently for both across and down directions

## Status

- [x] Test passed

## Test Results

### ACROSS Direction Test
1. Typed "MASH" in consecutive cells horizontally
2. Pressed Backspace - "H" was deleted and cursor moved back to cell with "S"
3. Pressed Backspace again - "S" was deleted and cursor moved back to cell with "A"
4. Screenshot saved: PLAY-07-backspace-across-direction.png

### DOWN Direction Test
1. Changed direction to DOWN
2. Typed "TEST" in consecutive cells vertically
3. Pressed Backspace - Last "T" was deleted and cursor moved up one cell
4. Pressed Backspace again - "S" was deleted and cursor moved up one cell
5. Screenshot saved: PLAY-07-backspace-down-direction.png

### Verification
- ✅ Backspace clears the current cell
- ✅ Cursor moves back to the previous cell after deletion
- ✅ Works correctly in ACROSS direction
- ✅ Works correctly in DOWN direction
- ✅ Progress percentage updates correctly after each deletion
