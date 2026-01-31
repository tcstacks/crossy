# Flow 7: Relay Mode

## Test Setup
- **Requirement**: Two users
- **Mode**: Relay (turn-based)

## Test Steps

### 1. Create Room with Relay Mode
- **Action**:
  - User 1 navigates to Create Room
  - Selects "Relay" game mode
  - Creates room
- **Expected**:
  - Room creation with mode=relay
  - Room code generated
  - Navigate to lobby

### 2. Join with Second User
- **Action**: User 2 joins with room code
- **Expected**:
  - Both users in lobby
  - Mode displayed as "Relay"
  - Turn order may be displayed

### 3. Start Game
- **Action**: Host starts the game
- **Expected**:
  - Both navigate to game page
  - Same puzzle loads
  - Turn-based UI visible
  - First player assigned

### 4. Turn Indicator Shows Whose Turn
- **Action**: Observe game UI
- **Expected**:
  - Clear turn indicator (e.g., "User 1's Turn")
  - Highlight or badge on active player
  - Visual distinction from inactive player
  - Turn timer may be visible

### 5. Only Current Player Can Edit
- **Action**:
  - User 1 (active turn) tries to type
  - User 2 (inactive) tries to type
- **Expected**:
  - User 1's input works normally
  - User 1 can fill cells
  - User 2's input is blocked/disabled
  - User 2 sees read-only grid
  - Cursor shows disabled state for User 2

### 6. Complete Word
- **Action**: User 1 fills a complete word
- **Expected**:
  - Word validation occurs
  - Correct word turns green
  - Word completion tracked
  - "Pass Turn" button becomes available

### 7. Pass Turn
- **Action**: User 1 clicks "Pass Turn" button
- **Expected**:
  - Turn switch event sent via WebSocket
  - User 1's controls disable
  - "Pass Turn" button disappears for User 1

### 8. Turn Switches to Other Player
- **Action**: Observe both screens after turn pass
- **Expected**:
  - Turn indicator updates to "User 2's Turn"
  - User 2's controls enable
  - User 2 can now type and edit
  - User 1's controls are disabled
  - "Pass Turn" button appears for User 2
  - State synchronized on both screens
  - Turn history may be displayed

## Validation Checklist
- [ ] Can create room with Relay mode
- [ ] Relay mode setting persists
- [ ] Second user can join relay room
- [ ] Relay mode visible in lobby
- [ ] Game starts with turn-based UI
- [ ] Turn indicator is visible and clear
- [ ] First player is assigned correctly
- [ ] Active player can edit cells
- [ ] Inactive player cannot edit
- [ ] Input controls disable properly for inactive player
- [ ] Visual feedback for active/inactive states
- [ ] Word completion detection works
- [ ] "Pass Turn" button appears when appropriate
- [ ] Turn can be passed successfully
- [ ] Turn indicator updates on both screens
- [ ] Control states switch correctly
- [ ] Previous player is disabled after passing
- [ ] New active player can edit
- [ ] WebSocket synchronization works
- [ ] Turn switches continue working for multiple rounds

## Technical Details
- **Turn State Management**:
  - Server-side turn tracking
  - Client-side optimistic updates
  - Turn order queue

- **WebSocket Events**:
  - `game:turn_start` - Turn begins for player
  - `game:turn_pass` - Player passes turn
  - `game:turn_change` - Broadcast turn change
  - `game:word_complete` - Word completed notification

- **UI States**:
  - Active player: enabled inputs, visible controls
  - Inactive player: disabled inputs, read-only view
  - Turn indicator: highlight, badge, or banner

## API Endpoints Used
- `POST /api/rooms` - Create relay mode room
- `POST /api/rooms/:code/join` - Join room
- `WS /ws` - Real-time turn management
- `POST /api/games/:id/turn` - Pass turn
