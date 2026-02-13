# MP-01: Multiplayer Grid Interaction - Manual Test Guide

## Prerequisites
1. Start the backend server: `cd backend && npm run dev`
2. Start the frontend server: `cd frontend/app && npm run dev`
3. Open two browser windows (or use incognito mode for the second window)

## Test Steps

### Setup (Both Windows)

**Window 1 (Host):**
1. Navigate to `http://localhost:5173`
2. Click "Sign Up"
3. Create account with username `testuser1_mp01`
4. Login and navigate to home page

**Window 2 (Player):**
1. Navigate to `http://localhost:5173` (in incognito/different browser)
2. Click "Sign Up"
3. Create account with username `testuser2_mp01`
4. Login and navigate to home page

### ACCEPTANCE CRITERIA 1: Start a multiplayer game

**Window 1 (Host):**
1. Click "Multiplayer" button
2. On the "Create Room" page, click "Create Room"
3. Wait for redirect to lobby page
4. Note the room code displayed (e.g., "ABC123")
5. Click "Ready Up" button
6. ✅ **Verify:** Room code is visible
7. ✅ **Verify:** You see your username in the player list

**Window 2 (Player):**
1. Click "Multiplayer" button
2. Click "Join Room" link
3. Enter the room code from Window 1 (one character per input box)
4. Wait for redirect to lobby
5. Click "Ready Up" button
6. ✅ **Verify:** You see both usernames in the player list
7. ✅ **Verify:** Both players show "Ready" status

**Window 1 (Host):**
1. Click "Start Game" button
2. ✅ **Verify:** Both windows navigate to the game page (`/room/{code}/play`)
3. ✅ **Verify:** URL contains `/play` path

### ACCEPTANCE CRITERIA 2: Verify crossword grid is displayed

**Both Windows:**
1. ✅ **Verify:** Crossword grid is visible with multiple cells
2. ✅ **Verify:** Grid has white cells (playable) and dark purple cells (blocked)
3. ✅ **Verify:** Some cells have small numbers in the top-left corner
4. ✅ **Verify:** Grid is centered on the page with proper styling

### ACCEPTANCE CRITERIA 3: Click on cells and type letters

**Window 1 (Host):**
1. Click on any white (non-blocked) cell in the grid
2. ✅ **Verify:** Cell background changes to purple (#7B61FF)
3. ✅ **Verify:** Cell has a purple border
4. Type the letter 'A' on your keyboard
5. ✅ **Verify:** Letter 'A' appears in white text in the selected cell
6. Click on another white cell
7. Type the letter 'B'
8. ✅ **Verify:** Letter 'B' appears in the newly selected cell

**Window 2 (Player):**
1. Click on a different white cell in the grid
2. ✅ **Verify:** Cell background changes to purple
3. Type the letter 'C'
4. ✅ **Verify:** Letter 'C' appears in the selected cell
5. Click on another cell and type 'D'
6. ✅ **Verify:** Letter 'D' appears in the cell

### ACCEPTANCE CRITERIA 4: Verify letters appear in the grid

**Window 1 (Host):**
1. ✅ **Verify:** You can see the letters 'A' and 'B' that you typed
2. ✅ **Verify:** You can also see letters 'C' and 'D' from Window 2 (real-time sync)
3. ✅ **Verify:** Other player's cursor position is shown with a colored border and dot

**Window 2 (Player):**
1. ✅ **Verify:** You can see the letters 'C' and 'D' that you typed
2. ✅ **Verify:** You can also see letters 'A' and 'B' from Window 1 (real-time sync)
3. ✅ **Verify:** Other player's cursor position is shown with a colored border and dot

### Additional Verification

**Both Windows:**
1. Try typing multiple letters in sequence
2. ✅ **Verify:** Cursor auto-advances to the next cell after typing
3. Press Backspace to delete a letter
4. ✅ **Verify:** Letter is removed from the cell
5. ✅ **Verify:** Deleted letter disappears in both windows (real-time sync)
6. Use arrow keys to navigate between cells
7. ✅ **Verify:** Selected cell moves in the direction of arrow key pressed
8. Click on the same cell twice
9. ✅ **Verify:** Direction toggles between "ACROSS" and "DOWN" (shown in header)

### ACCEPTANCE CRITERIA 5: Take snapshot of multiplayer gameplay

**Window 1 (Host):**
1. With several letters typed in the grid by both players
2. Take a screenshot showing:
   - Grid with letters from both players
   - Player list showing both usernames
   - Timer showing elapsed time
   - Active clue display
   - Your cursor position (purple cell)
   - Other player's cursor indicator (colored border/dot)

**Window 2 (Player):**
1. Take a screenshot from the second player's perspective
2. Verify same information is visible

## Expected Results

All acceptance criteria should pass:
- ✅ Started a multiplayer game successfully
- ✅ Crossword grid is displayed correctly
- ✅ Can click on cells and type letters
- ✅ Letters appear in the grid in real-time for both players
- ✅ Real-time synchronization works (letters and cursor positions)
- ✅ Screenshots captured showing gameplay

## Test Execution

To run the automated Playwright test (requires servers to be running):

```bash
cd frontend
npx playwright test MP-01-multiplayer-grid-interaction.test.ts
```

## Notes

- The test creates temporary user accounts
- WebSocket connection enables real-time synchronization
- Each player has a unique color for their cursor
- Letters are synchronized via WebSocket events (`cell:update` and `cell:updated`)
- Cursor positions are synchronized via `cursor:move` and `cursor:moved` events
