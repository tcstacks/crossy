# LOBBY-01: View Player List in Lobby - Manual Test Guide

## Overview
This guide provides step-by-step instructions for manually testing the lobby player list functionality.

## Test Environment
- Frontend: http://localhost:3000
- Backend: http://localhost:3000/api (assumed running)

## Prerequisites
- Both frontend and backend servers must be running
- Two different browsers or browser profiles for testing multiplayer functionality

## Test Case 1: Single Player in Lobby

### Steps:
1. **Register/Login**
   - Navigate to http://localhost:3000
   - Click "Play Now" or "Play with Friends" button
   - If not authenticated, auth modal will appear
   - Register a new account or login with existing credentials

2. **Create a Room**
   - Navigate to http://localhost:3000/room/create
   - Fill in room creation form:
     - Room Name (optional): e.g., "Test Lobby"
     - Game Mode: Select "Collaborative"
     - Max Players: Keep default (4) or adjust
     - Puzzle: Select "Today's Puzzle"
   - Click "Create Room"

3. **Verify Lobby Display**
   - ✅ You should be redirected to `/room/{ROOM_CODE}` (e.g., `/room/ABC123`)
   - ✅ Room code should be prominently displayed in a card
   - ✅ Room code should be 6 characters long
   - ✅ Copy button should be visible next to room code
   - ✅ Click copy button and verify "Code copied!" message appears

4. **Verify Player List**
   - ✅ "Players (1/X)" heading should be visible (where X is max players)
   - ✅ Your username should appear in the player list
   - ✅ Your player card should show:
     - Avatar circle with first letter of your username
     - Your username
     - "You" label
     - Crown icon (indicating you're the host)
     - Colored status indicator

5. **Take Screenshot**
   - Take a screenshot of the lobby page showing:
     - Room code card
     - Player list with your name
     - Connection status
     - Save as `LOBBY-01-single-player.png`

## Test Case 2: Multiple Players in Lobby

### Setup:
Use two different browsers or browser profiles (Browser A and Browser B)

### Steps:

**Browser A (Host):**
1. Follow "Test Case 1" steps 1-4 to create a room
2. Note the room code (e.g., "ABC123")
3. Keep this browser window open

**Browser B (Guest):**
1. Register/Login with a different account
2. Navigate to http://localhost:3000/room/join
3. Enter the room code from Browser A (one character per input field)
4. Click "Join Room" (or it may auto-submit)
5. You should be redirected to the lobby

**Verification in Browser B (Guest):**
- ✅ Room code should match the one from Browser A
- ✅ Player list should show 2 players:
  - Host's username (with crown icon)
  - Your username (with "You" label)
- ✅ Player count should show "(2/X)"
- ✅ Both players should have different colored avatars
- ✅ "Waiting for host to start..." message should appear (since you're not the host)

**Verification in Browser A (Host):**
- ✅ Player list should automatically update to show 2 players
- ✅ Guest's username should appear in the list
- ✅ "Start Game" button should be enabled (requires 2+ players)
- ✅ Your player should still show the crown icon

**Take Screenshots:**
- Browser A: `LOBBY-01-host-view.png`
- Browser B: `LOBBY-01-guest-view.png`

## Test Case 3: Real-time Updates

### Steps:
1. With both browsers still in the lobby (from Test Case 2)
2. **In Browser B (Guest):** Click "Leave Room"
3. **In Browser A (Host):**
   - ✅ Player list should update automatically
   - ✅ Guest's name should disappear from the list
   - ✅ Player count should show "(1/X)"
   - ✅ "Start Game" button should be disabled (requires 2+ players)

## Test Case 4: Connection Status

### Steps:
1. Create a room and enter the lobby
2. **Verify Connection Status Card:**
   - ✅ "Connection Status" heading is visible
   - ✅ Status indicator dot should be green (connected)
   - ✅ Text should say "Connected"

3. **Simulate Disconnect (Optional):**
   - Open browser DevTools → Network tab
   - Throttle connection to "Offline"
   - ✅ Status indicator should change to red
   - ✅ Text should say "Disconnected"

## Expected Results

All checkboxes (✅) in the verification steps should pass. The lobby should:
- Display the room code prominently with copy functionality
- Show all players in a visually distinct list with colored avatars
- Update in real-time when players join or leave
- Identify the current user with a "You" label
- Identify the host with a crown icon
- Show accurate player count
- Display connection status

## Success Criteria

- [ ] Room code is displayed prominently
- [ ] Player list shows all players
- [ ] Current user's name appears with "You" label
- [ ] Host has crown icon
- [ ] Real-time updates work (players joining/leaving)
- [ ] Screenshots taken for documentation

## Notes

- WebSocket connection is required for real-time updates
- Minimum 2 players required to start a game
- Maximum players is configurable (2-8) when creating room
- Each player gets a unique color from a palette of 8 colors
