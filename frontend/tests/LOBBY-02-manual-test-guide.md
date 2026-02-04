# LOBBY-02: Toggle Ready Status - Manual Test Guide

## Story
As a player, I can toggle my ready status

## Prerequisites
- Backend server running on `http://localhost:8080`
- Frontend dev server running on `http://localhost:5173`
- Two browser windows or incognito/regular mode combination

## Test Steps

### Setup (Create and Join Room)

1. **User 1 - Create Room:**
   - Open browser window 1
   - Navigate to `http://localhost:5173`
   - Click "Sign Up" and create a new account
   - After registration, click "Multiplayer"
   - Click "Create Room"
   - Click "Create Room" with default settings
   - You should be redirected to the lobby
   - Note the room code displayed at the top

2. **User 2 - Join Room:**
   - Open browser window 2 (incognito or different browser)
   - Navigate to `http://localhost:5173`
   - Click "Sign Up" and create another account
   - After registration, click "Multiplayer"
   - Click "Join Room"
   - Enter the room code from User 1
   - You should join the lobby and see both players listed

### Acceptance Criteria Testing

**AC 1: Find the Ready button**
- [ ] On User 2's screen, locate the "Ready Up" button
- [ ] Button should be clearly visible above the "Start Game" or "Waiting for host" button

**AC 2: Click Ready button**
- [ ] Click the "Ready Up" button
- [ ] Button should change to show "Ready - Click to Unready" with a checkmark

**AC 3: Verify your status shows as ready**
- [ ] On User 2's screen, verify your player card shows a green "Ready" badge
- [ ] On User 1's screen, verify User 2's player card shows a green "Ready" badge
- [ ] The ready button should now have a green background

**AC 4: Click button again to unready**
- [ ] On User 2's screen, click the "Ready - Click to Unready" button
- [ ] Button should change back to "Ready Up"

**AC 5: Verify status changes back**
- [ ] On User 2's screen, verify your player card shows "Not Ready"
- [ ] On User 1's screen, verify User 2's player card shows "Not Ready"
- [ ] The ready button should return to purple background

**AC 6: Take snapshots of both states**
- [ ] Take a screenshot when ready
- [ ] Take a screenshot when not ready

### Additional Tests

**Test Multiple Players:**
- [ ] Have User 1 also toggle their ready status
- [ ] Verify both players can independently control their ready status
- [ ] Verify the status updates in real-time for both users

**Test Host Ready Status:**
- [ ] Verify the host (User 1) can also toggle ready status
- [ ] Verify this doesn't prevent them from starting the game

## Expected Results

✅ **Pass Criteria:**
- Ready button is clearly visible and accessible
- Clicking ready updates the button text and color
- Ready status shows correctly on player cards for both users
- Changes are reflected in real-time via WebSocket
- Can toggle between ready and not ready states smoothly
- No errors in browser console
- Smooth animations and transitions

❌ **Fail Criteria:**
- Ready button not visible
- Button click doesn't update status
- Status doesn't sync between users
- Errors in console
- Page crashes or freezes
- WebSocket connection issues

## Notes
- The ready status is purely informational and doesn't prevent game start
- Host can start the game regardless of ready status
- Ready status resets when leaving and rejoining a room
- Real-time updates are handled via WebSocket, so both players see changes immediately
