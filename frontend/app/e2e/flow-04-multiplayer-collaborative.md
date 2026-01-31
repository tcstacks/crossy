# Flow 4: Multiplayer Collaborative

## Test Setup
- **Requirement**: Two browser windows/tabs
- **Users**: User 1 (host) and User 2 (guest)

## Test Steps

### 1. Open Two Browser Windows
- **Action**: Open `http://localhost:5173` in two windows
- **Expected**: Both windows load landing page

### 2. User 1 Creates Room
- **Action**:
  - Login as User 1
  - Navigate to "Create Room" or multiplayer section
  - Configure room settings
  - Click "Create Room"
- **Expected**:
  - Navigate to `/room/create`
  - Room creation form appears
  - Room is created successfully
  - Room code is generated
  - Redirect to `/room/:code` (lobby)

### 3. User 2 Joins with Code
- **Action**:
  - In window 2, login as User 2
  - Navigate to "Join Room"
  - Enter room code from User 1
  - Click "Join"
- **Expected**:
  - Navigate to `/room/join`
  - Join form appears
  - Valid room code accepted
  - Redirect to `/room/:code` (same lobby)

### 4. Both See Lobby
- **Action**: Observe both windows
- **Expected**:
  - Both users in same lobby (`/room/:code`)
  - Both users listed in participant list
  - Real-time updates via WebSocket
  - Host can start game

### 5. Start Game
- **Action**: User 1 (host) clicks "Start Game"
- **Expected**:
  - Both users redirect to `/room/:code/play`
  - Same puzzle loads for both
  - WebSocket connection established
  - Game state synchronized

### 6. User 1 Types in Cell
- **Action**: User 1 clicks cell and types letter
- **Expected**:
  - Letter appears in User 1's grid
  - Cell update sent via WebSocket
  - Focus/cursor indicator visible

### 7. User 2 Sees Update
- **Action**: Observe User 2's window
- **Expected**:
  - User 1's letter appears in User 2's grid
  - Real-time synchronization (< 200ms)
  - No lag or flicker
  - Cell attributed to User 1 (color/indicator)

### 8. User 2 Moves Cursor
- **Action**: User 2 clicks different cell
- **Expected**:
  - User 2's cursor position updates
  - Cursor event sent via WebSocket

### 9. User 1 Sees Colored Cursor
- **Action**: Observe User 1's window
- **Expected**:
  - User 2's cursor/selection appears
  - Colored indicator (different color per user)
  - Cursor position synchronized in real-time
  - Both users can work simultaneously

## Validation Checklist
- [ ] Two browser windows open successfully
- [ ] User 1 can create room
- [ ] Room code is generated
- [ ] User 2 can join with code
- [ ] Both users appear in lobby
- [ ] WebSocket connection established
- [ ] Game starts for both users
- [ ] Same puzzle loads for both
- [ ] User 1's input appears for User 2
- [ ] Real-time synchronization works
- [ ] User 2's cursor visible to User 1
- [ ] Colored cursor indicators work
- [ ] No conflicts in simultaneous editing

## Technical Details
- **WebSocket Events**:
  - `room:join` - User joins room
  - `room:user_joined` - Broadcast to all
  - `game:start` - Host starts game
  - `game:cell_update` - Cell value changed
  - `game:cursor_move` - Cursor position changed

## API Endpoints Used
- `POST /api/rooms` - Create room
- `POST /api/rooms/:code/join` - Join room
- `GET /api/rooms/:code` - Get room details
- `WS /ws` - WebSocket connection
