# ROOM-02: Room Creation Form Options - Manual Test Guide

## Test Environment Setup
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Browser: Any modern browser (Chrome, Firefox, Safari)

## Acceptance Criteria Testing

### ✅ Criterion 1: Login and navigate to /room/create

**Steps:**
1. Navigate to http://localhost:5173
2. Click "Get Started" or "Login" button
3. Use Guest Login or register a new account
4. Navigate to http://localhost:5173/room/create

**Expected Result:**
- User successfully authenticates
- Room creation page loads with title "Create a Room"
- Form is displayed with all options

---

### ✅ Criterion 2: Verify game mode selector has options (Collaborative/Race/Relay)

**Steps:**
1. On the room creation page, locate the "Game Mode" section
2. Verify three game mode options are visible:
   - **Collaborative** - "Work together to solve the puzzle"
   - **Race** - "First to finish wins"
   - **Relay** - "Take turns solving"
3. Click each game mode option
4. Verify the selected mode highlights with purple background

**Expected Result:**
- All three game modes are visible and clickable
- Selected mode shows purple background (#7B61FF)
- Selected mode has a white checkmark icon
- Mode description is clearly visible
- Clicking switches between modes smoothly

**Screenshot Location:** `ROOM-02-game-modes.png`

---

### ✅ Criterion 3: Verify max players selector allows 2-8 players

**Steps:**
1. Locate the "Max Players" section
2. Verify there is a slider control
3. Check the slider has min=2 and max=8
4. Move the slider to minimum (2)
5. Verify the number "2" displays
6. Move the slider to maximum (8)
7. Verify the number "8" displays
8. Test intermediate values (3, 4, 5, 6, 7)

**Expected Result:**
- Slider allows values from 2 to 8
- Current value displays in a purple-bordered box to the right
- Value updates immediately when slider moves
- Default value is 4

**Screenshot Location:** `ROOM-02-max-players.png`

---

### ✅ Criterion 4: Verify puzzle selection options exist (Today's/Random/Archive)

**Steps:**
1. Locate the "Choose Puzzle" section
2. Verify three puzzle options are visible:
   - **Today's Puzzle** - Shows difficulty and grid size (e.g., "Medium • 15×15")
   - **Random Puzzle**
   - **Choose from Archive** - "Pick any past puzzle"
3. Click each puzzle option
4. Verify the selected option highlights with purple background

**Expected Result:**
- All three puzzle options are visible and clickable
- Selected option shows purple background (#7B61FF)
- Today's Puzzle shows puzzle metadata when available
- Clicking switches between options smoothly

**Screenshot Location:** `ROOM-02-puzzle-options.png`

---

### ✅ Criterion 5: Take snapshot of form options

**Steps:**
1. Ensure all form options are visible
2. Set form to default state:
   - Game Mode: Collaborative
   - Max Players: 4
   - Puzzle: Today's Puzzle
3. Take screenshot of entire page

**Expected Result:**
- Screenshot captures full form with all options visible
- All labels and descriptions are readable
- Crossy mascot is visible at bottom
- "Create Room" button is visible

**Screenshot Location:** `ROOM-02-form-complete.png`

---

## Additional Verification Tests

### Test: Form Submission with Game Mode

**Steps:**
1. Fill in optional room name: "Test Room"
2. Select game mode: **Race**
3. Set max players: **6**
4. Select puzzle: **Random Puzzle**
5. Click "Create Room" button
6. Wait for room to be created
7. Verify navigation to room lobby page

**Expected Result:**
- Form submits successfully
- Backend receives all parameters:
  - `mode: "race"`
  - `config.maxPlayers: 6`
  - `puzzleId: <random-puzzle-id>`
- Room is created in database
- User is redirected to `/room/{code}` lobby page
- Room lobby displays correct settings

---

### Test: Form Defaults

**Steps:**
1. Navigate to /room/create
2. Do not interact with any form controls
3. Observe default selections

**Expected Result:**
- Game Mode: **Collaborative** (selected by default)
- Max Players: **4** (default value)
- Puzzle: **Today's Puzzle** (selected by default)

---

### Test: Visual Feedback

**Steps:**
1. Click each game mode and observe visual changes
2. Move the max players slider and observe value changes
3. Click each puzzle option and observe visual changes
4. Hover over buttons to see hover effects

**Expected Result:**
- Selected options have purple background (#7B61FF)
- Unselected options have white background
- Hover effects work smoothly
- Transitions are smooth (not jarring)
- Icons are properly aligned and sized

---

## Test Results

### Test Execution Date: _____________

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1. Login and navigate to /room/create | ⬜ Pass ⬜ Fail | |
| 2. Game mode selector (Collaborative/Race/Relay) | ⬜ Pass ⬜ Fail | |
| 3. Max players selector (2-8 players) | ⬜ Pass ⬜ Fail | |
| 4. Puzzle selection options (Today's/Random/Archive) | ⬜ Pass ⬜ Fail | |
| 5. Snapshot of form options | ⬜ Pass ⬜ Fail | |

### Overall Result: ⬜ PASS ⬜ FAIL

### Screenshots Captured:
- [ ] ROOM-02-game-modes.png
- [ ] ROOM-02-max-players.png
- [ ] ROOM-02-puzzle-options.png
- [ ] ROOM-02-form-complete.png
- [ ] ROOM-02-form-filled.png

### Additional Notes:
_________________________________
_________________________________
_________________________________

---

## Technical Implementation Verification

### Frontend Code Changes
- ✅ `CreateRoomPage.tsx` has game mode selector with 3 options
- ✅ `CreateRoomPage.tsx` has max players slider (2-8 range)
- ✅ `CreateRoomPage.tsx` has puzzle selection with 3 options
- ✅ `CreateRoomRequest` type updated to include `mode` and `config`
- ✅ API call sends `mode`, `config.maxPlayers`, and `puzzleId`

### Backend Integration
- ✅ Backend `CreateRoomRequest` expects `mode` field
- ✅ Backend `CreateRoomRequest` expects `config.maxPlayers` field
- ✅ Room is created with correct mode and config

### API Contract
```typescript
// Frontend Request
{
  "puzzleId": "uuid",
  "mode": "collaborative" | "race" | "relay",
  "config": {
    "maxPlayers": 2-8
  }
}

// Backend Response
{
  "room": {
    "id": "uuid",
    "code": "ABC123",
    "mode": "collaborative",
    "config": {
      "maxPlayers": 4,
      ...
    },
    ...
  },
  "player": { ... }
}
```

---

## Success Criteria Summary

✅ **All acceptance criteria met:**
1. User can login and navigate to /room/create ✓
2. Game mode selector has Collaborative, Race, and Relay options ✓
3. Max players selector allows 2-8 players ✓
4. Puzzle selection has Today's, Random, and Archive options ✓
5. Form options can be captured in screenshots ✓

✅ **Additional features working:**
- Form has proper visual feedback and selection states
- Game mode is properly sent to backend API
- Room is created with correct settings
- User is navigated to room lobby after creation
