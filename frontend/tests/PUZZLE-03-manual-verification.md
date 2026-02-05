# PUZZLE-03 Manual Verification Guide

## Feature: Toggle direction with arrow keys or click

### Prerequisites
1. Ensure both backend and frontend are running:
   ```bash
   make dev
   ```
2. Navigate to http://localhost:3000/play in your browser

### Test Steps

#### Test 1: Direction Toggle on Cell Click
1. ✅ Load the puzzle (verify grid is visible)
2. ✅ Click on any cell that's not blocked (black)
3. ✅ Note the direction indicator (should show "ACROSS" with white background)
4. ✅ Click on the SAME cell again
5. ✅ Verify direction indicator changed to "DOWN" (white background)
6. ✅ Verify the highlighted clue changed in the clue list
7. ✅ Click the same cell a third time
8. ✅ Verify direction toggled back to "ACROSS"

#### Test 2: Arrow Keys Change Direction - Right/Left
1. ✅ Click on a cell to select it
2. ✅ Set direction to "DOWN" by clicking the same cell if needed
3. ✅ Press the RIGHT arrow key
4. ✅ Verify cursor moved to the next cell on the right
5. ✅ Verify direction indicator changed to "ACROSS"
6. ✅ Verify the active clue updated to match the across clue
7. ✅ Press the LEFT arrow key
8. ✅ Verify cursor moved left
9. ✅ Verify direction stays "ACROSS"

#### Test 3: Arrow Keys Change Direction - Up/Down
1. ✅ Click on a cell to select it
2. ✅ Ensure direction is "ACROSS"
3. ✅ Press the DOWN arrow key
4. ✅ Verify cursor moved to the next cell below
5. ✅ Verify direction indicator changed to "DOWN"
6. ✅ Verify the active clue updated to match the down clue
7. ✅ Press the UP arrow key
8. ✅ Verify cursor moved up
9. ✅ Verify direction stays "DOWN"

### Expected Behavior Summary
- **Clicking same cell twice**: Toggles between ACROSS and DOWN
- **Right/Left arrow keys**: Move cursor horizontally AND set direction to ACROSS
- **Up/Down arrow keys**: Move cursor vertically AND set direction to DOWN
- **Active clue**: Updates automatically when direction changes
- **Clue tab**: Switches to match the current direction (ACROSS/DOWN)

### Visual Indicators
- Selected cell: Purple background (#7B61FF)
- Active direction button: White background
- Active clue: Purple border (#7B61FF)
- Current word cells: Light purple background (#E8E3FF)

### Screenshot Locations
After successful verification, screenshots should be saved to:
- `frontend/tests/PUZZLE-03-direction-down.png`
- `frontend/tests/PUZZLE-03-direction-across-arrow.png`
- `frontend/tests/PUZZLE-03-direction-change.png`
