# Flow 5: Multiplayer Chat and Reactions

## Test Setup
- **Requirement**: Two users in active multiplayer game
- **Prerequisite**: Complete Flow 4 setup (two users in room)

## Test Steps

### 1. Two Users in Game
- **Action**: Complete Flow 4 through "Start Game"
- **Expected**:
  - Both users in `/room/:code/play`
  - Chat interface visible
  - Reactions button/panel visible

### 2. User 1 Sends Chat Message
- **Action**:
  - User 1 clicks chat input
  - Types message "Hello!"
  - Presses Enter or clicks Send
- **Expected**:
  - Message appears in User 1's chat panel
  - WebSocket event sent
  - Message timestamped

### 3. User 2 Receives Immediately
- **Action**: Observe User 2's chat panel
- **Expected**:
  - "Hello!" message appears
  - Attributed to User 1
  - Timestamp displayed
  - Real-time delivery (< 100ms)
  - Scroll to bottom if needed

### 4. User 2 Replies
- **Action**:
  - User 2 types "Hi there!"
  - Sends message
- **Expected**:
  - Message appears in User 2's chat
  - WebSocket event sent
  - Proper message ordering

### 5. User 1 Receives Reply
- **Action**: Observe User 1's chat panel
- **Expected**:
  - "Hi there!" message appears
  - Attributed to User 2
  - Messages in chronological order
  - Chat history preserved

### 6. User 1 Sends Reaction
- **Action**:
  - User 1 clicks reaction button/emoji
  - Selects emoji (e.g., 👍, 🎉, ❤️)
- **Expected**:
  - Reaction button clicked
  - Emoji selected
  - WebSocket event sent

### 7. Animated Emoji Appears on Both Screens
- **Action**: Observe both windows after reaction sent
- **Expected**:
  - Emoji animation starts on User 1's screen
  - Emoji animation starts on User 2's screen simultaneously
  - Animated element visible (GSAP animation)

### 8. Emoji Floats and Fades
- **Action**: Watch emoji animation
- **Expected**:
  - Emoji floats upward (translateY animation)
  - Opacity fades from 1 to 0
  - Animation duration ~2-3 seconds
  - Emoji element removed after animation
  - Smooth animation performance

## Validation Checklist
- [ ] Chat interface is visible in game
- [ ] User 1 can send messages
- [ ] Messages appear in sender's chat immediately
- [ ] User 2 receives messages in real-time
- [ ] Messages properly attributed to senders
- [ ] Timestamps are accurate
- [ ] User 2 can reply
- [ ] User 1 receives replies in real-time
- [ ] Message ordering is correct
- [ ] Chat history persists during session
- [ ] Reactions button/panel is accessible
- [ ] User can select emoji reaction
- [ ] Reaction sent via WebSocket
- [ ] Animated emoji appears on both screens
- [ ] Animation is synchronized
- [ ] Emoji floats upward smoothly
- [ ] Emoji fades out properly
- [ ] Animation completes and cleans up

## Technical Details
- **WebSocket Events**:
  - `chat:message` - Send chat message
  - `chat:message_received` - Broadcast to all users
  - `reaction:send` - Send reaction emoji
  - `reaction:received` - Broadcast to all users

- **Animation Library**: GSAP (@gsap/react)
- **Animation Properties**:
  - `y`: -100 to -200 (upward movement)
  - `opacity`: 1 to 0 (fade out)
  - `duration`: 2-3 seconds
  - `ease`: "power2.out" or similar

## API Endpoints Used
- `WS /ws` - WebSocket connection for real-time communication
