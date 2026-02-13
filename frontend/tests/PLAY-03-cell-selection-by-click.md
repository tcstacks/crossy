# PLAY-03 - Cell Selection by Click Test

**Story:** As a player, I can click on a cell to select it

## Test Steps

### Setup
1. Start the development server: `cd frontend/app && npm run dev`
2. Open Chrome browser to `http://localhost:5173`
3. Login as a test user (or use guest login)

### Test Execution

#### AC 1: Navigate to /play and wait for puzzle to load
- [ ] Navigate to `/play` route
- [ ] Wait for puzzle grid to render
- [ ] Verify grid cells are visible
- [ ] Verify puzzle loads with correct dimensions (7x7 or similar)

#### AC 2: Click on a cell in the grid
- [ ] Identify a non-blocked (white) cell in the grid
- [ ] Click on the cell
- [ ] Cell should respond to click event

#### AC 3: Verify cell has visual selection highlight
- [ ] After clicking, verify the cell has:
  - Background color: `#7B61FF` (bright purple)
  - Border color: `#7B61FF`
  - Text color: white
  - Shadow: `shadow-inner` effect
- [ ] Selected cell should be visually distinct from unselected cells

#### AC 4: Click on a different cell
- [ ] Click on another non-blocked cell (different row/column)
- [ ] New cell should respond to click event

#### AC 5: Verify new cell is selected and previous is deselected
- [ ] New cell should have selection highlight (purple background)
- [ ] Previous cell should return to default state:
  - Background color: white
  - Border color: `#7B61FF`
  - Text color: `#2A1E5C`
- [ ] Only ONE cell should be selected at a time

#### AC 6: Take snapshot showing selected cell
- [ ] Take screenshot showing clearly selected cell
- [ ] Screenshot should show the purple highlight on selected cell
- [ ] Save as `play-03-cell-selection.png`

## Expected Behavior

### Cell States
1. **Unselected cell:** White background, purple border, dark purple text
2. **Selected cell:** Purple background (#7B61FF), purple border, white text, inner shadow
3. **Blocked cell:** Dark purple background (#2A1E5C), not clickable
4. **Hover state:** Light purple background (#F3F1FF) on unselected cells

### Selection Rules
- Clicking blocked (black) cells does nothing
- Only one cell can be selected at a time
- Clicking the same cell toggles direction (across/down) but keeps it selected
- Selection state persists until another cell is clicked

## Test Results

**Date:** _____________
**Tester:** _____________
**Result:** ☐ Pass ☐ Fail

**Notes:**
