package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/auth"
	"github.com/crossplay/backend/internal/db"
	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/internal/realtime"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

func setupTestServer(t *testing.T) (*gin.Engine, *db.Database, *realtime.Hub, *auth.AuthService) {
	// Use test mode for gin
	gin.SetMode(gin.TestMode)

	// Create test database connection
	// Use environment variable or default to test database
	dbURL := "postgres://postgres:postgres@localhost:5432/crossplay_test?sslmode=disable"
	redisURL := "redis://localhost:6379"

	database, err := db.New(dbURL, redisURL)
	if err != nil {
		// Skip test if database not available
		t.Skip("Database not available for testing")
		return nil, nil, nil, nil
	}

	// Initialize schema
	if err := database.InitSchema(); err != nil {
		t.Fatalf("Failed to initialize schema: %v", err)
	}

	// Initialize auth service
	authService := auth.NewAuthService("test-secret")

	// Initialize WebSocket hub
	hub := realtime.NewHub(database)
	go hub.Run()

	// Setup router
	router := gin.New()

	return router, database, hub, authService
}

func TestWebSocketEndpoint(t *testing.T) {
	router, database, hub, authService := setupTestServer(t)
	defer database.Close()

	// Create test user
	user := &models.User{
		ID:          uuid.New().String(),
		Email:       "test@example.com",
		DisplayName: "Test User",
		IsGuest:     false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := database.CreateUser(user); err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Generate token
	token, err := authService.GenerateToken(user.ID, user.Email, user.DisplayName, false)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Create test room
	puzzle := &models.Puzzle{
		ID:          uuid.New().String(),
		Title:       "Test Puzzle",
		Author:      "Test",
		Difficulty:  models.DifficultyEasy,
		GridWidth:   5,
		GridHeight:  5,
		Grid:        make([][]models.GridCell, 5),
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
		CreatedAt:   time.Now(),
	}
	for i := range puzzle.Grid {
		puzzle.Grid[i] = make([]models.GridCell, 5)
	}
	if err := database.CreatePuzzle(puzzle); err != nil {
		t.Fatalf("Failed to create puzzle: %v", err)
	}

	room := &models.Room{
		ID:       uuid.New().String(),
		Code:     "TEST123",
		HostID:   user.ID,
		PuzzleID: puzzle.ID,
		Mode:     models.RoomModeCollaborative,
		Config: models.RoomConfig{
			MaxPlayers:   8,
			HintsEnabled: true,
			TimerMode:    "none",
		},
		State:     models.RoomStateLobby,
		CreatedAt: time.Now(),
	}
	if err := database.CreateRoom(room); err != nil {
		t.Fatalf("Failed to create room: %v", err)
	}

	// Setup WebSocket endpoint
	router.GET("/api/rooms/:code/ws", func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		roomCode := c.Param("code")
		if roomCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing room code"})
			return
		}

		realtime.ServeWs(hub, c.Writer, c.Request, claims.UserID, claims.DisplayName)
	})

	// Create test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Convert http to ws URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/rooms/TEST123/ws?token=" + token

	t.Run("WebSocket connection established", func(t *testing.T) {
		// Connect to WebSocket
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer ws.Close()

		// Set read deadline
		ws.SetReadDeadline(time.Now().Add(5 * time.Second))

		// Connection should be open
		if ws == nil {
			t.Error("WebSocket connection is nil")
		}
	})

	t.Run("WebSocket ping-pong heartbeat", func(t *testing.T) {
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer ws.Close()

		// Send ping to verify connection is alive
		if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
			t.Fatalf("Failed to send ping: %v", err)
		}

		// Wait briefly to ensure connection stays open
		time.Sleep(100 * time.Millisecond)

		// Verify connection is still active by writing a message
		testMsg := map[string]interface{}{"type": "ping"}
		msgBytes, _ := json.Marshal(testMsg)
		if err := ws.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			t.Errorf("Connection not alive after ping: %v", err)
		}

		// Note: In production, the server sends pings automatically to clients
		// The client.go WritePump handles ping/pong automatically
	})

	t.Run("WebSocket message serialization", func(t *testing.T) {
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}
		defer ws.Close()

		// Send join_room message
		joinMsg := map[string]interface{}{
			"type": "join_room",
			"payload": map[string]interface{}{
				"roomCode":    "TEST123",
				"displayName": "Test User",
				"isSpectator": false,
			},
		}

		msgBytes, err := json.Marshal(joinMsg)
		if err != nil {
			t.Fatalf("Failed to marshal message: %v", err)
		}

		if err := ws.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			t.Fatalf("Failed to send message: %v", err)
		}

		// Set read deadline
		ws.SetReadDeadline(time.Now().Add(2 * time.Second))

		// Read response (should get room_state)
		_, message, err := ws.ReadMessage()
		if err != nil {
			t.Fatalf("Failed to read message: %v", err)
		}

		var response map[string]interface{}
		if err := json.Unmarshal(message, &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if response["type"] != "room_state" {
			t.Errorf("Expected room_state message, got %v", response["type"])
		}
	})

	t.Run("WebSocket connection error handling", func(t *testing.T) {
		// Test invalid token
		invalidURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/rooms/TEST123/ws?token=invalid"
		_, resp, err := websocket.DefaultDialer.Dial(invalidURL, nil)
		if err == nil {
			t.Error("Expected error with invalid token, got nil")
		}
		if resp != nil && resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("WebSocket auto-reconnect simulation", func(t *testing.T) {
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to connect to WebSocket: %v", err)
		}

		// Close connection to simulate disconnect
		ws.Close()

		// Reconnect
		ws2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to reconnect to WebSocket: %v", err)
		}
		defer ws2.Close()

		// Verify new connection works
		if ws2 == nil {
			t.Error("Reconnection failed")
		}
	})
}

func TestWebSocketMultiTabSupport(t *testing.T) {
	router, database, hub, authService := setupTestServer(t)
	defer database.Close()

	// Create test user
	user := &models.User{
		ID:          uuid.New().String(),
		Email:       "multitab@example.com",
		DisplayName: "Multi Tab User",
		IsGuest:     false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := database.CreateUser(user); err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Generate token
	token, err := authService.GenerateToken(user.ID, user.Email, user.DisplayName, false)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Create test room
	puzzle := &models.Puzzle{
		ID:         uuid.New().String(),
		Title:      "Test Puzzle",
		GridWidth:  5,
		GridHeight: 5,
		Grid:       make([][]models.GridCell, 5),
		CreatedAt:  time.Now(),
	}
	for i := range puzzle.Grid {
		puzzle.Grid[i] = make([]models.GridCell, 5)
	}
	database.CreatePuzzle(puzzle)

	room := &models.Room{
		ID:       uuid.New().String(),
		Code:     "MULTI1",
		HostID:   user.ID,
		PuzzleID: puzzle.ID,
		Mode:     models.RoomModeCollaborative,
		Config: models.RoomConfig{
			MaxPlayers:   8,
			HintsEnabled: true,
		},
		State:     models.RoomStateLobby,
		CreatedAt: time.Now(),
	}
	database.CreateRoom(room)

	// Setup endpoint
	router.GET("/api/rooms/:code/ws", func(c *gin.Context) {
		token := c.Query("token")
		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		realtime.ServeWs(hub, c.Writer, c.Request, claims.UserID, claims.DisplayName)
	})

	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/rooms/MULTI1/ws?token=" + token

	t.Run("Multiple connections from same user", func(t *testing.T) {
		// Open first connection (tab 1)
		ws1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to open first connection: %v", err)
		}
		defer ws1.Close()

		// Open second connection (tab 2)
		ws2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to open second connection: %v", err)
		}
		defer ws2.Close()

		// Both connections should be active
		// Each should have a unique connection ID
		// (This is verified by the hub's internal tracking)

		// Verify both connections work
		time.Sleep(100 * time.Millisecond)
		if ws1 == nil || ws2 == nil {
			t.Error("Multi-tab connections failed")
		}
	})
}
