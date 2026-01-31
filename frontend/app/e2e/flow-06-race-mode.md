# Flow 6: Race Mode

## Test Setup
- **Requirement**: Two users
- **Mode**: Race (competitive completion)

## Test Steps

### 1. Create Room with Race Mode
- **Action**:
  - User 1 navigates to Create Room
  - Selects "Race" game mode
  - Creates room
- **Expected**:
  - Room creation with mode=race
  - Room code generated
  - Navigate to lobby

### 2. Join with Second User
- **Action**: User 2 joins room with code
- **Expected**:
  - Both users in lobby
  - Mode displayed as "Race"
  - Room settings show race mode

### 3. Start Game
- **Action**: Host starts the game
- **Expected**:
  - Both navigate to game page
  - Same puzzle loads for both
  - Race UI elements visible

### 4. Progress Bars Show for Each Player
- **Action**: Observe game interface
- **Expected**:
  - Progress bars for User 1 and User 2
  - Progress at 0% initially
  - User names/avatars labeled
  - Visual distinction between players

### 5. Complete Puzzle Faster on One User
- **Action**:
  - User 1 fills puzzle cells
  - User 2 also works but slower
  - User 1 completes puzzle first
- **Expected**:
  - Progress bars update in real-time
  - User 1's progress reaches 100%
  - User 2's progress shows partial completion
  - Completion detected immediately

### 6. Winner Modal Appears for Both
- **Action**: Wait for completion detection
- **Expected**:
  - Modal appears on User 1's screen
  - Modal appears on User 2's screen simultaneously
  - WebSocket broadcast of race completion
  - Modal shows race results

### 7. Correct Winner Announced
- **Action**: Read modal content
- **Expected**:
  - User 1 shown as winner
  - Completion time displayed
  - Winner celebration/animation
  - Leaderboard or final standings
  - Option to play again or return to lobby

## Validation Checklist
- [ ] Can create room with Race mode
- [ ] Race mode setting persists in room
- [ ] Second user can join race room
- [ ] Race mode visible in lobby
- [ ] Game starts with race UI
- [ ] Progress bars render for all players
- [ ] Progress bars show 0% initially
- [ ] User identifiers are clear
- [ ] Progress updates in real-time as cells filled
- [ ] Progress calculation is accurate
- [ ] User 1 can complete puzzle
- [ ] Completion triggers winner detection
- [ ] Winner modal appears on both screens
- [ ] Winner announcement is correct
- [ ] Completion times are accurate
- [ ] Winner receives appropriate feedback
- [ ] Loser sees results clearly
- [ ] Can exit or restart after race

## Technical Details
- **Progress Calculation**:
  - Total cells filled / Total cells required × 100%
  - Or: Correct words completed / Total words × 100%

- **WebSocket Events**:
  - `game:progress_update` - Broadcast progress
  - `game:race_complete` - Winner declared
  - `game:race_results` - Final standings

- **UI Components**:
  - Progress bars (Radix UI Progress component)
  - Winner modal (Dialog component)
  - Animations (GSAP)

## API Endpoints Used
- `POST /api/rooms` - Create race mode room
- `POST /api/rooms/:code/join` - Join room
- `WS /ws` - Real-time race updates
- `POST /api/games/:id/complete` - Record race completion
