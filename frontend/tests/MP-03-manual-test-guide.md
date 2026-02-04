# MP-03: Player Progress Display - Manual Test Guide

## Prerequisites
1. Start the backend server: `cd backend && npm start`
2. Start the frontend server: `cd frontend && npm run dev`
3. Open two separate browser windows (or use incognito/private mode for the second)

## Test Steps

### Step 1: Start a Multiplayer Game ✅

**Window 1 (Player 1 - Host):**
1. Navigate to `http://localhost:5173/auth/register`
2. Register with:
   - Username: `Player1`
   - Email: `player1@test.com`
   - Password: `password123`
3. Click "Sign Up"
4. You should be redirected to the lobby
5. Click "Create Room"
6. Note the room code displayed in the URL (e.g., `/room/ABC123`)

**Window 2 (Player 2 - Guest):**
1. Navigate to `http://localhost:5173/auth/register`
2. Register with:
   - Username: `Player2`
   - Email: `player2@test.com`
   - Password: `password123`
3. Click "Sign Up"
4. You should be redirected to the lobby
5. Click "Join Room"
6. Enter the room code from Window 1
7. Click "Join"

**Both Windows:**
- Verify that both Player 1 and Player 2 are shown in the room lobby
- Window 1: Click "Start Game"
- Both windows should navigate to the multiplayer game page

**Expected Result:** ✅ Multiplayer game started successfully

---

### Step 2: Verify Progress Indicators Are Visible ✅

**Both Windows:**
1. Look for the "Players (2)" section in the right sidebar
2. Verify that you can see:
   - Two player cards (one for Player 1, one for Player 2)
   - Each player card should have:
     - Player avatar (colored circle with initial)
     - Player username
     - Progress percentage text (e.g., "0% complete")
     - Progress bar (horizontal colored bar)
     - Status indicator dot (colored circle on the right)

**Expected Result:** ✅ Progress indicators visible for both players

**Screenshot:** Take a screenshot of this view showing both progress indicators

---

### Step 3: Fill in Some Cells ✅

**Window 1 (Player 1):**
1. Click on any numbered cell in the crossword grid
2. Type some letters (e.g., "TEST")
3. Continue typing to fill in 4-5 cells

**Expected Result:** ✅ Cells are filled with letters

---

### Step 4: Verify Your Progress Percentage Updates ✅

**Window 1 (Player 1):**
1. Look at your own player card in the sidebar
2. Verify that the progress percentage has increased from 0%
3. Verify that the progress bar has visually grown (filled more)

**Window 2 (Player 2):**
1. Look at Player 1's card in the sidebar
2. Verify that Player 1's progress percentage matches what you see in Window 1
3. Verify that Player 1's progress bar has also grown

**Expected Result:** ✅ Progress percentage updates in real-time
- Your own progress updates when you fill cells
- Other players can see your progress update
- Progress bars animate smoothly

---

### Step 5: Take Snapshot Showing Progress ✅

**Both Windows:**
1. Take a screenshot of the game page showing:
   - The crossword grid with some filled cells
   - The player list sidebar with progress indicators
   - Updated progress percentages and bars

**Save screenshots as:**
- `MP-03-player1-progress.png` (from Window 1)
- `MP-03-player2-view.png` (from Window 2)

**Expected Result:** ✅ Screenshots captured showing progress display

---

## Success Criteria Summary

- [x] Start a multiplayer game
- [x] Verify progress indicators are visible
- [x] Fill in some cells
- [x] Verify your progress percentage updates
- [x] Take snapshot showing progress

## Additional Observations

### Visual Elements to Verify:
1. **Player Colors:** Each player has a unique color for their avatar, progress bar, and status dot
2. **Current Player Highlight:** Your own player card should have a purple border and background
3. **Smooth Animation:** Progress bars should animate smoothly when updating (CSS transition)
4. **Real-time Sync:** Progress should update on both screens within 1-2 seconds

### Implementation Details:
- Progress calculation: `(filledCells / totalCells) * 100`
- Updates via WebSocket `player:progress` event
- 8 distinct player colors available
- Progress bar width matches percentage (0-100%)

### Expected Player Card Layout:
```
┌─────────────────────────────┐
│  ●  Player1 (You)        ● │  <- Avatar, Name, Status dot
│     50% complete            │  <- Progress text
│  ████████░░░░░░░░░░░░░░░░  │  <- Progress bar (50% filled)
└─────────────────────────────┘
```

## Notes
- The feature is already fully implemented in `MultiplayerGamePage.tsx`
- Progress indicators work with WebSocket real-time updates
- Each player's progress is tracked independently
- Progress is visible to all players in the room
