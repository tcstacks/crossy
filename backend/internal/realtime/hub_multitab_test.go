package realtime

import (
	"testing"
	"time"
)

// TestMultiTabSupport verifies that multiple connections from the same user work correctly
func TestMultiTabSupport(t *testing.T) {
	// Create a test hub with nil database (not needed for this test)
	hub := NewHub(nil)

	// Simulate two clients from the same user
	userID := "test-user-1"
	client1 := &Client{
		ConnectionID: "conn-1",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
	}
	client2 := &Client{
		ConnectionID: "conn-2",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
	}

	// Register both clients in goroutine (since Register is blocking)
	go hub.Run()

	hub.Register(client1)
	hub.Register(client2)

	// Give some time for registration (the hub.Run() goroutine processes the register channel)
	// Wait by checking if clients are registered
	for i := 0; i < 100; i++ {
		hub.mutex.RLock()
		c1Exists := false
		c2Exists := false
		if _, exists := hub.clients[client1.ConnectionID]; exists {
			c1Exists = true
		}
		if _, exists := hub.clients[client2.ConnectionID]; exists {
			c2Exists = true
		}
		hub.mutex.RUnlock()
		if c1Exists && c2Exists {
			break
		}
	}

	// Verify both clients are stored
	hub.mutex.RLock()
	if _, exists := hub.clients[client1.ConnectionID]; !exists {
		t.Errorf("Client 1 not found in clients map")
	}
	if _, exists := hub.clients[client2.ConnectionID]; !exists {
		t.Errorf("Client 2 not found in clients map")
	}
	hub.mutex.RUnlock()

	// Verify user connections tracking
	hub.mutex.RLock()
	userConns := hub.userConnections[userID]
	if len(userConns) != 2 {
		t.Errorf("Expected 2 connections for user, got %d", len(userConns))
	}
	hub.mutex.RUnlock()

	// Verify both connections are tracked
	hasConn1 := false
	hasConn2 := false
	for _, connID := range userConns {
		if connID == client1.ConnectionID {
			hasConn1 = true
		}
		if connID == client2.ConnectionID {
			hasConn2 = true
		}
	}
	if !hasConn1 {
		t.Errorf("Connection 1 not found in userConnections")
	}
	if !hasConn2 {
		t.Errorf("Connection 2 not found in userConnections")
	}

	// Unregister first client
	hub.Unregister(client1)

	// Wait for unregistration to complete
	time.Sleep(10 * time.Millisecond)
	for i := 0; i < 100; i++ {
		hub.mutex.RLock()
		_, exists := hub.clients[client1.ConnectionID]
		hub.mutex.RUnlock()
		if !exists {
			break
		}
		time.Sleep(1 * time.Millisecond)
	}

	// Verify first client is removed but second remains
	hub.mutex.RLock()
	if _, exists := hub.clients[client1.ConnectionID]; exists {
		t.Errorf("Client 1 should be removed from clients map")
	}
	if _, exists := hub.clients[client2.ConnectionID]; !exists {
		t.Errorf("Client 2 should still be in clients map")
	}

	// Verify user still has one connection
	userConns = hub.userConnections[userID]
	if len(userConns) != 1 {
		t.Errorf("Expected 1 connection for user after removing one, got %d", len(userConns))
	}
	if len(userConns) > 0 && userConns[0] != client2.ConnectionID {
		t.Errorf("Expected remaining connection to be client2, got %s", userConns[0])
	}
	hub.mutex.RUnlock()

	// Unregister second client
	hub.Unregister(client2)

	// Wait for unregistration to complete
	time.Sleep(10 * time.Millisecond)
	for i := 0; i < 100; i++ {
		hub.mutex.RLock()
		_, exists := hub.clients[client2.ConnectionID]
		hub.mutex.RUnlock()
		if !exists {
			break
		}
		time.Sleep(1 * time.Millisecond)
	}

	// Verify all connections are removed
	hub.mutex.RLock()
	if _, exists := hub.clients[client2.ConnectionID]; exists {
		t.Errorf("Client 2 should be removed from clients map")
	}
	if _, exists := hub.userConnections[userID]; exists {
		t.Errorf("User should be removed from userConnections map when no connections remain")
	}
	hub.mutex.RUnlock()
}

// TestSingleUserBroadcast verifies that broadcasts reach all tabs of the same user
func TestSingleUserBroadcast(t *testing.T) {
		hub := NewHub(nil)

	// Create a room
	roomID := "test-room-1"
	hub.mutex.Lock()
	hub.rooms[roomID] = &Room{
		ID:      roomID,
		Code:    "TEST01",
		Clients: make(map[string]*Client),
	}
	hub.mutex.Unlock()

	// Create two connections for the same user
	userID := "test-user-1"
	client1 := &Client{
		ConnectionID: "conn-1",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
		RoomID:       roomID,
	}
	client2 := &Client{
		ConnectionID: "conn-2",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
		RoomID:       roomID,
	}

	// Add both clients to the room
	hub.mutex.RLock()
	room := hub.rooms[roomID]
	hub.mutex.RUnlock()

	room.mutex.Lock()
	room.Clients[client1.ConnectionID] = client1
	room.Clients[client2.ConnectionID] = client2
	room.mutex.Unlock()

	// Broadcast a message (excluding no one)
	testPayload := map[string]string{"test": "data"}
	hub.broadcastToRoom(roomID, "", MsgCellUpdated, testPayload)

	// Verify both clients received the message
	select {
	case msg1 := <-client1.Send:
		if len(msg1) == 0 {
			t.Errorf("Client 1 received empty message")
		}
	default:
		t.Errorf("Client 1 did not receive broadcast")
	}

	select {
	case msg2 := <-client2.Send:
		if len(msg2) == 0 {
			t.Errorf("Client 2 received empty message")
		}
	default:
		t.Errorf("Client 2 did not receive broadcast")
	}
}

// TestExcludeConnectionFromBroadcast verifies that the excluded connection doesn't receive broadcast
func TestExcludeConnectionFromBroadcast(t *testing.T) {
		hub := NewHub(nil)

	// Create a room
	roomID := "test-room-2"
	hub.mutex.Lock()
	hub.rooms[roomID] = &Room{
		ID:      roomID,
		Code:    "TEST02",
		Clients: make(map[string]*Client),
	}
	hub.mutex.Unlock()

	// Create two connections for the same user
	userID := "test-user-2"
	client1 := &Client{
		ConnectionID: "conn-3",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
		RoomID:       roomID,
	}
	client2 := &Client{
		ConnectionID: "conn-4",
		UserID:       userID,
		DisplayName:  "Test User",
		Send:         make(chan []byte, 256),
		RoomID:       roomID,
	}

	// Add both clients to the room
	hub.mutex.RLock()
	room := hub.rooms[roomID]
	hub.mutex.RUnlock()

	room.mutex.Lock()
	room.Clients[client1.ConnectionID] = client1
	room.Clients[client2.ConnectionID] = client2
	room.mutex.Unlock()

	// Broadcast a message, excluding client1
	testPayload := map[string]string{"test": "data"}
	hub.broadcastToRoom(roomID, client1.ConnectionID, MsgCellUpdated, testPayload)

	// Verify client1 did NOT receive the message
	select {
	case <-client1.Send:
		t.Errorf("Client 1 should not have received broadcast (was excluded)")
	default:
		// Expected - client1 was excluded
	}

	// Verify client2 DID receive the message
	select {
	case msg2 := <-client2.Send:
		if len(msg2) == 0 {
			t.Errorf("Client 2 received empty message")
		}
	default:
		t.Errorf("Client 2 should have received broadcast")
	}
}
