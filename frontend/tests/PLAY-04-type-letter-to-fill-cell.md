# PLAY-04 - Type Letter to Fill Cell Test

**Story:** As a player, I can type a letter to fill the selected cell

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
- [ ] Verify puzzle loads with correct dimensions

#### AC 2: Click on a cell to select it
- [ ] Identify a non-blocked (white) cell in the grid
- [ ] Click on the cell
- [ ] Verify cell has purple background (#7B61FF) indicating selection

#### AC 3: Press a letter key (e.g., 'A')
- [ ] Ensure the grid has focus (click on grid if needed)
- [ ] Press a letter key (e.g., 'A', 'B', 'C')
- [ ] Key press should register

#### AC 4: Verify letter appears in the selected cell
- [ ] After pressing the key, verify:
  - The letter appears in the selected cell
  - Letter is displayed in uppercase
  - Letter is clearly visible with white text color
  - Letter is centered in the cell

#### AC 5: Take snapshot showing filled cell
- [ ] Take screenshot showing the filled cell
- [ ] Screenshot should clearly show:
  - Selected cell with purple background
  - Letter visible in white text
  - Cell maintains selection state after input
- [ ] Save as `play-04-letter-filled.png`

## Expected Behavior

### Letter Input Rules
1. **Valid Input:** Only A-Z letters are accepted
2. **Case Handling:** All letters are automatically converted to uppercase
3. **Single Letter:** Only one letter per cell (new input replaces existing)
4. **Special Keys:** Other keys like numbers, symbols are ignored
5. **Backspace:** Clears the cell content (tested in PLAY-07)

### Visual Feedback
- Letter appears immediately after key press
- Letter color: White (#FFFFFF)
- Background remains purple (#7B61FF) while selected
- Font should be clear and readable

### Focus Requirements
- Grid container must have focus for keyboard input to work
- Grid has `tabIndex={0}` to make it focusable
- Clicking on a cell should ensure grid is focused

## Test Results

**Date:** _____________
**Tester:** _____________
**Result:** ☐ Pass ☐ Fail

**Notes:**
