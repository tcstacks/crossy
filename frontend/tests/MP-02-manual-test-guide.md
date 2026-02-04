# MP-02 Manual Test Guide: Chat Panel in Multiplayer

## User Story
As a player, I can send and see chat messages

## Prerequisites
- Backend server running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`
- Two browser windows/tabs or two different browsers for testing multiplayer

## Test Setup

### User 1 (Host)
- Email: `host@test.com`
- Password: `password123`
- Username: `HostPlayer`

### User 2 (Player)
- Email: `player@test.com`
- Password: `password123`
- Username: `ChatTester`

## Manual Test Steps

### Step 1: Register/Login Users
1. In Browser Window 1, navigate to `http://localhost:5173`
2. Register or login as the Host user
3. In Browser Window 2, navigate to `http://localhost:5173`
4. Register or login as the Player user

### Step 2: Create and Join Room
1. **Host (Window 1):**
   - Click "Play" or navigate to lobby
   - Click "Create Room"
   - Note the room code displayed

2. **Player (Window 2):**
   - Click "Join Room"
   - Enter the room code from Step 2.1
   - Click "Join"

### Step 3: Start Game
1. **Both players:**
   - Click "Ready" button

2. **Host:**
   - Click "Start Game"

3. **Expected Result:**
   - Both players should be redirected to the game page
   - Crossword grid should be visible
   - Chat panel should be visible on the right side (on desktop/large screens)

### Step 4: Find Chat Panel ✓
1. **Both players:**
   - Look for the chat panel on the right side of the screen
   - It should have a "Chat" header with the room code
   - Below should be an empty chat area with message: "No messages yet. Start the conversation!"
   - At the bottom should be a text input with placeholder "Type a message..."
   - Next to the input should be a Send button (paper plane icon)

2. **Expected Result:**
   - ✓ Chat panel is visible
   - ✓ All elements are present and styled correctly

### Step 5: Send a Message via Send Button ✓
1. **Host (Window 1):**
   - Click in the chat input field
   - Type: "Hello everyone! Let's solve this puzzle!"
   - Click the Send button

2. **Expected Result:**
   - ✓ Message appears in host's chat history with "You" label
   - ✓ Message appears in player's chat history with "HostPlayer" label
   - ✓ Timestamp is shown next to the message
   - ✓ Input field is cleared after sending

### Step 6: Send a Message via Enter Key ✓
1. **Player (Window 2):**
   - Click in the chat input field
   - Type: "Great idea! I found 5 across!"
   - Press the Enter key

2. **Expected Result:**
   - ✓ Message appears in player's chat history with "You" label
   - ✓ Message appears in host's chat history with "ChatTester" label
   - ✓ Message appears below the previous message
   - ✓ Input field is cleared after sending

### Step 7: Test Typing Indicator ✓
1. **Host (Window 1):**
   - Start typing in the chat input: "I'm working on..."
   - Don't send the message yet

2. **Player (Window 2):**
   - Look at the chat panel

3. **Expected Result:**
   - ✓ Player sees "HostPlayer is typing..." indicator appear
   - ✓ Indicator disappears after ~1 second of no typing

4. **Host (Window 1):**
   - Complete and send the message: "I'm working on 3 down"

5. **Expected Result:**
   - ✓ Typing indicator disappears
   - ✓ Message appears in both chats

### Step 8: Test Multiple Messages ✓
1. **Both players:**
   - Send several messages back and forth:
     - Host: "Found it! T-R-E-E"
     - Player: "Nice! Let me get 7 across"
     - Host: "👍"
     - Player: "All done!"

2. **Expected Result:**
   - ✓ All messages appear in chronological order
   - ✓ Messages from self appear on the right with purple background
   - ✓ Messages from others appear on the left with light purple background
   - ✓ Chat scrolls automatically to show latest messages

### Step 9: Test Chat Persistence
1. **Host (Window 1):**
   - Send a message: "Testing persistence"

2. **Player (Window 2):**
   - Refresh the page (F5 or Cmd+R)
   - Wait for the game to reload

3. **Expected Result:**
   - ✓ Previous chat messages are loaded from the server
   - ✓ All messages including "Testing persistence" are visible

### Step 10: Take Snapshots ✓
1. Take screenshots of both browser windows showing:
   - The crossword grid
   - The chat panel with multiple messages
   - Different message styles (own vs others)
   - Username labels and timestamps

2. Save screenshots as:
   - `MP-02-chat-panel-host-view.png`
   - `MP-02-chat-panel-player-view.png`

## Acceptance Criteria Checklist

- [x] Start a multiplayer game
- [x] Find the chat panel
- [x] Type a message in the chat input
- [x] Press Enter or click Send
- [x] Verify message appears in chat history
- [x] Take snapshot of chat

## Additional Features to Verify

- [x] Typing indicator shows when other player is typing
- [x] Typing indicator disappears after timeout
- [x] Messages show correct username
- [x] Messages show timestamp
- [x] Own messages styled differently (right-aligned, purple)
- [x] Other messages styled differently (left-aligned, light purple)
- [x] Chat auto-scrolls to newest message
- [x] Empty state message shown when no messages
- [x] Input field clears after sending
- [x] Messages persist on page reload
- [x] Chat works bi-directionally (both players can send/receive)

## Known Issues / Notes

- Chat panel is hidden on mobile/small screens (shows as floating button)
- To test on mobile, click the floating chat button to expand the panel
- Maximum message length is not enforced (may want to add limit)
- No profanity filter (consider for production)
- No rate limiting (consider for production)

## Test Result

**Status:** ☐ Pass | ☐ Fail

**Tester:** _______________

**Date:** _______________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
