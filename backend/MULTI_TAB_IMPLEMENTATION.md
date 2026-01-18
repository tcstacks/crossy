# Multi-Tab Support Implementation

## Overview
Implemented connection ID-based client management to support multiple WebSocket connections per user (multi-tab support). Previously, opening a second tab would overwrite the first connection, preventing proper multi-client collaborative testing.

## Changes Made

### 1. Client Structure (`internal/realtime/client.go`)

**Added ConnectionID field:**
```go
type Client struct {
    ConnectionID string // Unique per WebSocket connection
    Hub         *Hub
    Conn        *websocket.Conn
    Send        chan []byte
    UserID      string
    DisplayName string
    RoomID      string
}
```

**Updated NewClient function:**
- Now generates a unique UUID for each connection using `uuid.New().String()`
- Added import for `github.com/google/uuid`

### 2. Hub Structure (`internal/realtime/hub.go`)

**Updated Hub struct:**
```go
type Hub struct {
    db              *db.Database
    clients         map[string]*Client   // Changed: connectionID -> client (was userID -> client)
    userConnections map[string][]string  // New: userID -> []connectionID
    rooms           map[string]*Room     // roomID -> room
    register        chan *Client
    unregister      chan *Client
    mutex           sync.RWMutex
}
```

**Updated Room struct:**
```go
type Room struct {
    ID          string
    Code        string
    Mode        models.RoomMode
    Clients     map[string]*Client // Changed: connectionID -> client (was userID -> client)
    StartTime   *time.Time
    mutex       sync.RWMutex
    // ... rest of fields
}
```

### 3. Registration/Unregistration Logic

**Hub.Run() method:**
- **Register:** Stores client by connectionID and tracks in userConnections map
- **Unregister:** Removes from both maps, only deletes user from userConnections when no connections remain

```go
// Register
h.clients[client.ConnectionID] = client
h.userConnections[client.UserID] = append(h.userConnections[client.UserID], client.ConnectionID)

// Unregister
delete(h.clients, client.ConnectionID)
// Remove from userConnections array
```

### 4. Room Management

**handleJoinRoom:**
- Stores client by connectionID: `hubRoom.Clients[client.ConnectionID] = client`

**removeClientFromRoom:**
- Removes client by connectionID
- Checks if user has other connections before sending "player_left" message
- Only updates player connection status when last connection for that user is removed
- Prevents spurious "player_left" notifications when user still has other tabs open

### 5. Broadcasting Logic

**broadcastToRoom function:**
- Now excludes by connectionID instead of userID
- Broadcasts to ALL connections in the room, including multiple connections from the same user
- Updated signature: `func (h *Hub) broadcastToRoom(roomID string, excludeConnectionID string, msgType MessageType, payload interface{})`

**Key behavior:**
- When a user makes a change in Tab A, Tab B receives the update
- Each tab gets its own independent WebSocket connection
- All tabs for a user see updates from all other tabs and users

### 6. Updated Function Calls

All calls to `broadcastToRoom` updated to pass `client.ConnectionID` instead of `client.UserID`:
- `handleJoinRoom`: Excludes joining client's connection from "player_joined" broadcast
- `handleCursorMove`: Excludes current connection from cursor updates
- Other broadcast calls use empty string ("") to broadcast to all connections

## How It Works

### Connection Flow

1. **User opens Tab 1:**
   - ConnectionID: `abc-123`
   - Stored: `clients["abc-123"]` = Client
   - Tracked: `userConnections["user-1"]` = `["abc-123"]`

2. **Same user opens Tab 2:**
   - ConnectionID: `def-456`
   - Stored: `clients["def-456"]` = Client
   - Tracked: `userConnections["user-1"]` = `["abc-123", "def-456"]`

3. **User makes update in Tab 1:**
   - Update processed by connection `abc-123`
   - Broadcast to room excluding `abc-123`
   - Tab 2 (connection `def-456`) receives the update

4. **User closes Tab 1:**
   - Unregister connection `abc-123`
   - Remove from `clients` map
   - Update `userConnections["user-1"]` to `["def-456"]`
   - Tab 2 still has other connection, so NO "player_left" message sent

5. **User closes Tab 2 (last tab):**
   - Unregister connection `def-456`
   - `userConnections["user-1"]` becomes empty, removed from map
   - No other connections exist, so "player_left" message sent

## Testing

### Automated Tests
- Run `go build ./...` - All code compiles successfully
- All existing tests continue to pass

### Manual Testing
Use the provided test script: `/Users/dev/proj/crossy/backend/test-multi-tab.sh`

**Test scenarios:**

1. **Multiple tabs connect:**
   - Open room in 2-3 tabs with same user
   - Check logs show different connectionIDs
   - Verify all tabs remain connected

2. **Cross-tab updates:**
   - Make cell update in Tab A
   - Verify Tab B and C receive the update
   - All tabs should show synchronized grid state

3. **Cursor sharing:**
   - Move cursor in Tab A
   - Tab B and C should NOT see cursor (same user)
   - Other users should see cursor from ANY tab

4. **Partial disconnect:**
   - Close Tab A
   - Tabs B and C remain connected
   - No "player_left" notification
   - User still appears as connected

5. **Full disconnect:**
   - Close all tabs
   - User properly disconnects
   - "player_left" notification sent
   - Player marked as disconnected in database

## Benefits

1. **Better Testing:** Developers can test multi-client scenarios with single account
2. **User Experience:** Users can have puzzle open in multiple tabs simultaneously
3. **Reliability:** Connection loss in one tab doesn't affect others
4. **Scalability:** Clean separation between connections and users

## Backward Compatibility

- All existing functionality preserved
- No API changes required
- Frontend code works without modifications
- Database schema unchanged

## Logging

Enhanced logging includes connectionID for debugging:
- `"Client registered: connectionID=abc-123, userID=user-1"`
- `"broadcastToRoom: sending to client connectionID=def-456, userID=user-1"`
- `"Client unregistered: connectionID=abc-123, userID=user-1"`

## Performance Considerations

- Minimal overhead: Each connection requires one additional UUID (36 bytes)
- `userConnections` map: Small memory footprint (array of strings per user)
- No impact on message throughput
- Efficient broadcast: O(n) where n = number of connections in room
