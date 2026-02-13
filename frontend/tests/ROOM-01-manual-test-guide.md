# ROOM-01: Create Multiplayer Room - Manual Test Guide

## Prerequisites
1. Backend server running on `http://localhost:8080`
2. Frontend server running on `http://localhost:5173`
3. PostgreSQL database running with schema initialized

## Test Execution Steps

### Test 1: Complete Room Creation Flow

**Acceptance Criteria:**
- [x] Login as a user
- [x] Navigate to /room/create
- [x] Verify room creation form is displayed
- [x] Select game mode, max players, puzzle options
- [x] Click Create Room button
- [x] Verify room code is displayed
- [x] Take snapshot of created room/lobby

**Steps:**

1. **Login as a user**
   - Navigate to `http://localhost:5173`
   - Click "Get Started" button
   - Switch to "Sign Up" tab
   - Fill in:
     - Email: `test_room01@example.com`
     - Display Name: `RoomTester`
     - Password: `TestPass123!`
   - Click "Sign Up"
   - Verify successful login (display name appears in header)

2. **Navigate to /room/create**
   - Click on user menu or navigation
   - Select "Create Room" or navigate directly to `http://localhost:5173/room/create`
   - ✅ **Verify:** Page loads successfully

3. **Verify room creation form is displayed**
   - ✅ **Verify:** Page title shows "Create a Room"
   - ✅ **Verify:** Form sections visible:
     - Room Name (optional text input)
     - Game Mode (Collaborative, Race, Relay options)
     - Max Players (slider with range 2-8)
     - Choose Puzzle (Today's, Random, Archive options)
     - Create Room button

4. **Select game mode, max players, puzzle options**
   - Click on "Race" game mode
   - ✅ **Verify:** Race button becomes highlighted (purple background)
   - Drag "Max Players" slider to 6
   - ✅ **Verify:** Number "6" displays in the counter box
   - Click on "Random Puzzle"
   - ✅ **Verify:** Random Puzzle button becomes highlighted

5. **Click Create Room button**
   - Click the "Create Room" button at bottom of form
   - ✅ **Verify:** Button shows loading state ("Creating Room...")
   - ✅ **Verify:** Page navigates to `/room/[CODE]` where CODE is a 6-character alphanumeric code

6. **Verify room code is displayed**
   - ✅ **Verify:** Page title shows "Room Lobby"
   - ✅ **Verify:** "Room Code" card displays the 6-character code (e.g., "ABC123")
   - ✅ **Verify:** Copy button (clipboard icon) appears next to code
   - Click copy button
   - ✅ **Verify:** "Code copied!" message appears
   - ✅ **Verify:** Players section shows "Players (1/6)"
   - ✅ **Verify:** Your display name appears in players list with crown icon (host indicator)
   - ✅ **Verify:** Connection Status shows "Connected" with green indicator
   - ✅ **Verify:** Game Settings section displays room configuration
   - ✅ **Verify:** "Start Game" button is visible (disabled if < 2 players)
   - ✅ **Verify:** "Leave Room" button is visible

7. **Take snapshot of created room/lobby**
   - Take screenshot of the complete lobby page
   - Save as: `ROOM-01-room-lobby.png`
   - Document the following:
     - Room Code: _______________
     - URL: _______________
     - Game Mode: Race
     - Max Players: 6
     - Current Players: 1
     - Host: RoomTester

---

### Test 2: Different Game Modes

**Purpose:** Verify all game modes can create rooms successfully

**Steps:**

1. Login (reuse account or create new one)

2. **Test Collaborative Mode:**
   - Navigate to `/room/create`
   - Select "Collaborative" mode
   - ✅ **Verify:** "Work together to solve the puzzle" description visible
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully
   - ✅ **Verify:** Room code displayed
   - Note room code: _______________
   - Click "Leave Room"

3. **Test Race Mode:**
   - Navigate to `/room/create`
   - Select "Race" mode
   - ✅ **Verify:** "First to finish wins" description visible
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully
   - ✅ **Verify:** Room code different from Collaborative room
   - Note room code: _______________
   - Click "Leave Room"

4. **Test Relay Mode:**
   - Navigate to `/room/create`
   - Select "Relay" mode
   - ✅ **Verify:** "Take turns solving" description visible
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully
   - ✅ **Verify:** Room code different from previous rooms
   - Note room code: _______________

---

### Test 3: Max Players Configuration

**Purpose:** Verify max players slider works correctly

**Steps:**

1. Navigate to `/room/create`

2. **Test minimum players (2):**
   - Drag slider to leftmost position
   - ✅ **Verify:** Display shows "2"
   - ✅ **Verify:** Slider is at minimum

3. **Test maximum players (8):**
   - Drag slider to rightmost position
   - ✅ **Verify:** Display shows "8"
   - ✅ **Verify:** Slider is at maximum

4. **Test mid-range (5):**
   - Drag slider to middle-ish position
   - ✅ **Verify:** Display shows "5"

5. **Create room with custom player count:**
   - Set max players to 4
   - Click "Create Room"
   - ✅ **Verify:** Lobby shows "Players (1/4)"

---

### Test 4: Puzzle Selection Options

**Purpose:** Verify all puzzle selection options work

**Steps:**

1. Navigate to `/room/create`

2. **Test Today's Puzzle:**
   - ✅ **Verify:** "Today's Puzzle" is selected by default
   - ✅ **Verify:** Shows difficulty and grid size (e.g., "Medium • 15×15")
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully

3. **Test Random Puzzle:**
   - Navigate to `/room/create`
   - Select "Random Puzzle"
   - ✅ **Verify:** Option becomes highlighted
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully

4. **Test Archive Puzzle:**
   - Navigate to `/room/create`
   - Select "Choose from Archive"
   - ✅ **Verify:** Option becomes highlighted
   - ✅ **Verify:** Description shows "Pick any past puzzle"
   - Click "Create Room"
   - ✅ **Verify:** Room created successfully (currently uses random puzzle)

---

### Test 5: Room Code Uniqueness

**Purpose:** Verify each room gets a unique code

**Steps:**

1. Create 3 rooms in succession
2. Note each room code:
   - Room 1: _______________
   - Room 2: _______________
   - Room 3: _______________
3. ✅ **Verify:** All codes are different
4. ✅ **Verify:** All codes are 6 characters
5. ✅ **Verify:** All codes use only letters and numbers (no special characters)

---

### Test 6: Authentication Protection

**Purpose:** Verify unauthenticated users cannot create rooms

**Steps:**

1. Logout (if logged in)
2. Navigate directly to `http://localhost:5173/room/create`
3. ✅ **Verify:** Redirected to landing page
4. ✅ **Verify:** Auth modal appears or login required message shown

---

## Expected Results Summary

After completing all tests, verify:

- ✅ All game modes (Collaborative, Race, Relay) can create rooms
- ✅ Max players configuration works (2-8 range)
- ✅ All puzzle selection options work
- ✅ Room codes are unique, 6 characters, alphanumeric
- ✅ Lobby displays all required information
- ✅ Host controls (Start Game, Leave Room) are visible
- ✅ Connection status shows properly
- ✅ Players list updates correctly
- ✅ Unauthenticated users cannot access room creation

---

## Automated Test Execution

To run the automated Playwright test (requires servers running):

```bash
cd frontend
npx playwright test ROOM-01-create-multiplayer-room.test.ts
```

For headed mode (visible browser):
```bash
npx playwright test ROOM-01-create-multiplayer-room.test.ts --headed
```

For debug mode:
```bash
npx playwright test ROOM-01-create-multiplayer-room.test.ts --debug
```

---

## Test Artifacts

Screenshots and snapshots will be saved to:
- `frontend/tests/ROOM-01-create-form.png` - Room creation form
- `frontend/tests/ROOM-01-room-lobby.png` - Room lobby view
- `frontend/tests/ROOM-01-snapshot.txt` - Test run summary

---

## Known Issues / Notes

- Archive puzzle selection currently falls back to random puzzle (full archive modal not yet implemented)
- WebSocket connection may show "Connecting..." briefly before "Connected"
- Room name field is optional and currently not used in backend

---

## Test Sign-off

- [ ] Test 1: Complete Room Creation Flow
- [ ] Test 2: Different Game Modes
- [ ] Test 3: Max Players Configuration
- [ ] Test 4: Puzzle Selection Options
- [ ] Test 5: Room Code Uniqueness
- [ ] Test 6: Authentication Protection

**Tested by:** ________________
**Date:** ________________
**Environment:** ________________
**Status:** ☐ PASS ☐ FAIL
**Notes:** ________________________________________________
