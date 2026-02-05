# WS-05: Race Mode Progress Updates - Manual Test Guide

## Feature Description
In race mode, players see live progress updates for all participants via a race leaderboard that shows:
- Current progress percentage for each player
- Rankings for finished players
- Trophy badges for completed puzzles
- Real-time WebSocket updates

## Acceptance Criteria
- [ ] Create a room with 'Race' mode
- [ ] Start the game
- [ ] Fill in some cells
- [ ] Verify race_progress message received via WebSocket
- [ ] Verify leaderboard shows all players' progress percentages
- [ ] Take screenshot showing race leaderboard

## Manual Test Steps

### Prerequisites
1. Backend server running on http://localhost:8080
2. Frontend server running on http://localhost:5173
3. Two browser windows/tabs (or use incognito mode for second player)

### Test Procedure

#### Player 1 (Host)
1. Open browser to http://localhost:5173
2. Click "Play with Friends" or navigate to create room
3. Select "Race" mode
4. Configure room settings:
   - Max Players: 4
   - Public: No
   - Timer: Stopwatch
   - Hints: Disabled (or as preferred)
5. Click "Create Room"
6. Copy the room code (e.g., "ABC123")
7. Wait for Player 2 to join
8. Click "Start Game" when ready

#### Player 2
1. Open a new browser window/tab (incognito recommended)
2. Navigate to http://localhost:5173
3. Click "Join Room"
4. Enter the room code from Player 1
5. Click "Join"
6. Click "Ready" when in the lobby

#### Gameplay and Verification
1. Both players should now see the game board
2. **Verify**: Both players see "Race Leaderboard" instead of "Players (N)"
3. **Verify**: Trophy icon is shown next to "Race Leaderboard"
4. **Verify**: Both players are listed with 0% complete initially

5. **Player 1**: Fill in some cells in the crossword
   - Click on a cell
   - Type a letter
   - Move to next cell and type another letter
   - Continue for 5-10 cells

6. **Verify on both browsers**:
   - Player 1's progress percentage increases (e.g., "15% complete")
   - The progress bar fills proportionally
   - Player 2 sees Player 1's updated progress in real-time
   - Progress updates happen smoothly without page refresh

7. **Player 2**: Fill in some cells
8. **Verify on both browsers**:
   - Player 2's progress percentage increases
   - Both players' progress is visible
   - Leaderboard may show ranking positions

9. **Complete the puzzle** (optional):
   - When a player finishes, they should see a Trophy icon
   - Completed player shows "Finished in Xs" instead of percentage
   - Rank badge (1, 2, 3, etc.) appears for finished players
   - Gold badge for rank 1, regular badges for others

10. **Browser DevTools Verification**:
    - Open Developer Console (F12)
    - Go to Network tab → WS (WebSocket)
    - Look for `race_progress` messages
    - **Verify**: Messages contain leaderboard array with:
      ```json
      {
        "type": "race_progress",
        "payload": {
          "leaderboard": [
            {
              "userId": "...",
              "displayName": "Player1",
              "progress": 15.5,
              "finishedAt": null,
              "solveTime": null,
              "rank": 0
            },
            ...
          ]
        }
      }
      ```

### Screenshots to Capture
1. **Initial state**: Race leaderboard with both players at 0%
2. **Mid-game**: Leaderboard showing different progress percentages
3. **Completion**: At least one player finished with rank badge
4. **WebSocket messages**: DevTools showing race_progress messages

## Expected Results

### Visual Elements
- ✅ "Race Leaderboard" header with Trophy icon
- ✅ Player list showing:
  - Rank badges (numbered circles) for each player
  - Player avatars with colored backgrounds
  - Player names with "(You)" indicator for current player
  - Progress text: "X% complete" or "Finished in Xs"
  - Progress bars (hidden for finished players)
- ✅ Trophy icon for finished players
- ✅ Different styling for finished vs. in-progress players
- ✅ Leaderboard sorted by: finished first, then by rank, then by progress

### WebSocket Behavior
- ✅ `race_progress` messages received after each cell update
- ✅ Messages contain complete leaderboard data
- ✅ Progress updates reflect in UI within 1-2 seconds
- ✅ No full page reloads required

### Edge Cases to Test
1. **Solo race**: Create race room, start alone - leaderboard should work
2. **Rapid updates**: Fill many cells quickly - updates should batch/throttle properly
3. **Browser refresh**: Refresh page mid-game - progress should persist
4. **Late join**: Join room after game started - should see current state

## Implementation Files
- Backend: `/backend/internal/realtime/hub.go` (lines 1197-1350)
  - `checkRaceProgress()` function broadcasts race_progress
  - `handleRaceCellUpdate()` triggers progress checks
- Frontend: `/frontend/app/src/pages/MultiplayerGamePage.tsx`
  - Race progress state and WebSocket handler
  - Conditional leaderboard rendering for race mode
- Types: `/frontend/app/src/types/websocket.ts`
  - `RaceProgress` and `RaceProgressPayload` interfaces

## Troubleshooting

### Leaderboard not showing
- Check browser console for errors
- Verify WebSocket connection (green "Live" indicator)
- Confirm room mode is "race" (not collaborative/relay)

### Progress not updating
- Check Network tab for WebSocket connection
- Verify `race_progress` messages are being sent
- Try refreshing both browser windows
- Check backend logs for errors

### Players not appearing
- Ensure both players joined before game started
- Check that game status is "active"
- Verify players are in the correct room

## Success Criteria
All acceptance criteria must be met:
- ✅ Room created with Race mode
- ✅ Game started successfully
- ✅ Cells filled and progress updated
- ✅ WebSocket race_progress messages confirmed
- ✅ Leaderboard displays all players with percentages
- ✅ Screenshots captured showing functionality

---

**Test Date**: _________
**Tester**: _________
**Result**: ☐ Pass ☐ Fail
**Notes**: _________________________________________
