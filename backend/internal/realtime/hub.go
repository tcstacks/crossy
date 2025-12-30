package realtime

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/crossplay/backend/internal/db"
	"github.com/crossplay/backend/internal/models"
	"github.com/google/uuid"
)

// MessageType defines the type of WebSocket message
type MessageType string

const (
	// Client to Server
	MsgJoinRoom     MessageType = "join_room"
	MsgLeaveRoom    MessageType = "leave_room"
	MsgCellUpdate   MessageType = "cell_update"
	MsgCursorMove   MessageType = "cursor_move"
	MsgSendMessage  MessageType = "send_message"
	MsgRequestHint  MessageType = "request_hint"
	MsgStartGame    MessageType = "start_game"
	MsgReaction     MessageType = "reaction"

	// Server to Client
	MsgRoomState        MessageType = "room_state"
	MsgPlayerJoined     MessageType = "player_joined"
	MsgPlayerLeft       MessageType = "player_left"
	MsgCellUpdated      MessageType = "cell_updated"
	MsgCursorMoved      MessageType = "cursor_moved"
	MsgNewMessage       MessageType = "new_message"
	MsgGameStarted      MessageType = "game_started"
	MsgPuzzleCompleted  MessageType = "puzzle_completed"
	MsgError            MessageType = "error"
	MsgReactionAdded    MessageType = "reaction_added"
)

// Message represents a WebSocket message
type Message struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// Payload types
type JoinRoomPayload struct {
	RoomCode    string `json:"roomCode"`
	DisplayName string `json:"displayName"`
	IsSpectator bool   `json:"isSpectator"`
}

type CellUpdatePayload struct {
	X     int     `json:"x"`
	Y     int     `json:"y"`
	Value *string `json:"value"`
}

type CursorMovePayload struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type SendMessagePayload struct {
	Text string `json:"text"`
}

type RequestHintPayload struct {
	Type string `json:"type"` // "letter", "word", "check"
	X    int    `json:"x"`
	Y    int    `json:"y"`
}

type ReactionPayload struct {
	ClueID string `json:"clueId"`
	Emoji  string `json:"emoji"`
}

// Response payloads
type RoomStatePayload struct {
	Room      *models.Room      `json:"room"`
	Players   []models.Player   `json:"players"`
	GridState *models.GridState `json:"gridState"`
	Puzzle    *models.Puzzle    `json:"puzzle"`
	Messages  []models.Message  `json:"messages"`
}

type PlayerJoinedPayload struct {
	Player models.Player `json:"player"`
}

type PlayerLeftPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

type CellUpdatedPayload struct {
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Value    string `json:"value"`
	PlayerID string `json:"playerId"`
	Color    string `json:"color"`
}

type CursorMovedPayload struct {
	PlayerID    string `json:"playerId"`
	DisplayName string `json:"displayName"`
	X           int    `json:"x"`
	Y           int    `json:"y"`
	Color       string `json:"color"`
}

type NewMessagePayload struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	DisplayName string    `json:"displayName"`
	Text        string    `json:"text"`
	CreatedAt   time.Time `json:"createdAt"`
}

type PuzzleCompletedPayload struct {
	SolveTime    int              `json:"solveTime"`
	Players      []PlayerResult   `json:"players"`
	CompletedAt  time.Time        `json:"completedAt"`
}

type PlayerResult struct {
	UserID       string  `json:"userId"`
	DisplayName  string  `json:"displayName"`
	Contribution float64 `json:"contribution"`
	Color        string  `json:"color"`
}

type ErrorPayload struct {
	Message string `json:"message"`
}

// Hub manages all WebSocket connections and rooms
type Hub struct {
	db        *db.Database
	clients   map[string]*Client // userID -> client
	rooms     map[string]*Room   // roomID -> room
	register  chan *Client
	unregister chan *Client
	mutex     sync.RWMutex
}

// Room represents a multiplayer room with connected clients
type Room struct {
	ID        string
	Code      string
	Clients   map[string]*Client // userID -> client
	StartTime *time.Time
	mutex     sync.RWMutex
}

func NewHub(database *db.Database) *Hub {
	return &Hub{
		db:        database,
		clients:   make(map[string]*Client),
		rooms:     make(map[string]*Room),
		register:  make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client.UserID] = client
			h.mutex.Unlock()
			log.Printf("Client registered: %s", client.UserID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mutex.Unlock()

			// Remove from room if in one
			if client.RoomID != "" {
				h.removeClientFromRoom(client)
			}
			log.Printf("Client unregistered: %s", client.UserID)
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) HandleMessage(client *Client, msg *Message) {
	switch msg.Type {
	case MsgJoinRoom:
		h.handleJoinRoom(client, msg.Payload)
	case MsgLeaveRoom:
		h.handleLeaveRoom(client)
	case MsgCellUpdate:
		h.handleCellUpdate(client, msg.Payload)
	case MsgCursorMove:
		h.handleCursorMove(client, msg.Payload)
	case MsgSendMessage:
		h.handleSendMessage(client, msg.Payload)
	case MsgRequestHint:
		h.handleRequestHint(client, msg.Payload)
	case MsgStartGame:
		h.handleStartGame(client)
	case MsgReaction:
		h.handleReaction(client, msg.Payload)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleJoinRoom(client *Client, payload json.RawMessage) {
	var p JoinRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "invalid payload")
		return
	}

	// Get room from database
	room, err := h.db.GetRoomByCode(p.RoomCode)
	if err != nil || room == nil {
		h.sendError(client, "room not found")
		return
	}

	// Get or create room in hub
	h.mutex.Lock()
	hubRoom, exists := h.rooms[room.ID]
	if !exists {
		hubRoom = &Room{
			ID:      room.ID,
			Code:    room.Code,
			Clients: make(map[string]*Client),
		}
		h.rooms[room.ID] = hubRoom
	}
	h.mutex.Unlock()

	// Add client to room
	hubRoom.mutex.Lock()
	hubRoom.Clients[client.UserID] = client
	hubRoom.mutex.Unlock()

	client.RoomID = room.ID

	// Update player connection status
	h.db.UpdatePlayerConnection(client.UserID, room.ID, true)

	// Get room state
	players, _ := h.db.GetRoomPlayers(room.ID)
	gridState, _ := h.db.GetGridState(room.ID)
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	messages, _ := h.db.GetRoomMessages(room.ID, 50)

	// Send room state to joining client
	roomState := RoomStatePayload{
		Room:      room,
		Players:   players,
		GridState: gridState,
		Puzzle:    sanitizePuzzleForClient(puzzle),
		Messages:  messages,
	}
	h.sendToClient(client, MsgRoomState, roomState)

	// Notify other clients
	player := findPlayer(players, client.UserID)
	if player != nil {
		h.broadcastToRoom(room.ID, client.UserID, MsgPlayerJoined, PlayerJoinedPayload{
			Player: *player,
		})
	}
}

func (h *Hub) handleLeaveRoom(client *Client) {
	if client.RoomID == "" {
		return
	}
	h.removeClientFromRoom(client)
}

func (h *Hub) handleCellUpdate(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p CellUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "invalid payload")
		return
	}

	// Get room and grid state
	room, _ := h.db.GetRoomByID(client.RoomID)
	if room == nil || room.State != models.RoomStateActive {
		return
	}

	gridState, _ := h.db.GetGridState(client.RoomID)
	if gridState == nil {
		return
	}

	// Update cell
	if p.Y >= 0 && p.Y < len(gridState.Cells) && p.X >= 0 && p.X < len(gridState.Cells[p.Y]) {
		gridState.Cells[p.Y][p.X].Value = p.Value
		gridState.Cells[p.Y][p.X].LastEditedBy = &client.UserID
		gridState.LastUpdated = time.Now()

		h.db.UpdateGridState(gridState)

		// Get player for color
		players, _ := h.db.GetRoomPlayers(client.RoomID)
		player := findPlayer(players, client.UserID)
		color := "#888888"
		if player != nil {
			color = player.Color
		}

		value := ""
		if p.Value != nil {
			value = *p.Value
		}

		// Broadcast to room
		h.broadcastToRoom(client.RoomID, "", MsgCellUpdated, CellUpdatedPayload{
			X:        p.X,
			Y:        p.Y,
			Value:    value,
			PlayerID: client.UserID,
			Color:    color,
		})

		// Check for puzzle completion
		h.checkPuzzleCompletion(client.RoomID)
	}
}

func (h *Hub) handleCursorMove(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p CursorMovePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	// Update cursor in database
	h.db.UpdatePlayerCursor(client.UserID, client.RoomID, p.X, p.Y)

	// Get player for color and name
	players, _ := h.db.GetRoomPlayers(client.RoomID)
	player := findPlayer(players, client.UserID)
	if player == nil {
		return
	}

	// Broadcast to other players
	h.broadcastToRoom(client.RoomID, client.UserID, MsgCursorMoved, CursorMovedPayload{
		PlayerID:    client.UserID,
		DisplayName: player.DisplayName,
		X:           p.X,
		Y:           p.Y,
		Color:       player.Color,
	})
}

func (h *Hub) handleSendMessage(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p SendMessagePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "invalid payload")
		return
	}

	if p.Text == "" {
		return
	}

	// Get player
	players, _ := h.db.GetRoomPlayers(client.RoomID)
	player := findPlayer(players, client.UserID)
	if player == nil {
		return
	}

	// Create message
	msg := &models.Message{
		ID:          uuid.New().String(),
		RoomID:      client.RoomID,
		UserID:      client.UserID,
		DisplayName: player.DisplayName,
		Text:        p.Text,
		CreatedAt:   time.Now(),
	}

	h.db.CreateMessage(msg)

	// Broadcast to room
	h.broadcastToRoom(client.RoomID, "", MsgNewMessage, NewMessagePayload{
		ID:          msg.ID,
		UserID:      msg.UserID,
		DisplayName: msg.DisplayName,
		Text:        msg.Text,
		CreatedAt:   msg.CreatedAt,
	})
}

func (h *Hub) handleRequestHint(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p RequestHintPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "invalid payload")
		return
	}

	room, _ := h.db.GetRoomByID(client.RoomID)
	if room == nil || !room.Config.HintsEnabled {
		h.sendError(client, "hints are disabled")
		return
	}

	// Get puzzle and grid state
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	gridState, _ := h.db.GetGridState(client.RoomID)
	if puzzle == nil || gridState == nil {
		return
	}

	switch p.Type {
	case "letter":
		// Reveal single letter
		if p.Y >= 0 && p.Y < len(puzzle.Grid) && p.X >= 0 && p.X < len(puzzle.Grid[p.Y]) {
			letter := puzzle.Grid[p.Y][p.X].Letter
			if letter != nil {
				gridState.Cells[p.Y][p.X].Value = letter
				gridState.Cells[p.Y][p.X].IsRevealed = true
				gridState.LastUpdated = time.Now()
				h.db.UpdateGridState(gridState)

				h.broadcastToRoom(client.RoomID, "", MsgCellUpdated, CellUpdatedPayload{
					X:        p.X,
					Y:        p.Y,
					Value:    *letter,
					PlayerID: "system",
					Color:    "#888888",
				})
			}
		}
	case "check":
		// Check if current answer is correct
		if p.Y >= 0 && p.Y < len(puzzle.Grid) && p.X >= 0 && p.X < len(puzzle.Grid[p.Y]) {
			letter := puzzle.Grid[p.Y][p.X].Letter
			currentValue := gridState.Cells[p.Y][p.X].Value
			isCorrect := letter != nil && currentValue != nil && *letter == *currentValue
			gridState.Cells[p.Y][p.X].IsCorrect = &isCorrect
			h.db.UpdateGridState(gridState)
		}
	}
}

func (h *Hub) handleStartGame(client *Client) {
	if client.RoomID == "" {
		return
	}

	room, _ := h.db.GetRoomByID(client.RoomID)
	if room == nil {
		return
	}

	if room.HostID != client.UserID {
		h.sendError(client, "only host can start the game")
		return
	}

	if room.State != models.RoomStateLobby {
		h.sendError(client, "game already started")
		return
	}

	// Update room state
	h.db.UpdateRoomState(room.ID, models.RoomStateActive)

	// Set start time
	h.mutex.Lock()
	if hubRoom, exists := h.rooms[room.ID]; exists {
		now := time.Now()
		hubRoom.StartTime = &now
	}
	h.mutex.Unlock()

	// Broadcast game started
	h.broadcastToRoom(client.RoomID, "", MsgGameStarted, nil)
}

func (h *Hub) handleReaction(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p ReactionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	// Broadcast reaction to room
	h.broadcastToRoom(client.RoomID, "", MsgReactionAdded, map[string]interface{}{
		"userId":  client.UserID,
		"clueId":  p.ClueID,
		"emoji":   p.Emoji,
	})
}

func (h *Hub) checkPuzzleCompletion(roomID string) {
	room, _ := h.db.GetRoomByID(roomID)
	if room == nil {
		return
	}

	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	gridState, _ := h.db.GetGridState(roomID)
	if puzzle == nil || gridState == nil {
		return
	}

	// Check if all cells are filled correctly
	complete := true
	for y := 0; y < len(puzzle.Grid); y++ {
		for x := 0; x < len(puzzle.Grid[y]); x++ {
			expectedLetter := puzzle.Grid[y][x].Letter
			if expectedLetter == nil {
				continue // black square
			}
			currentValue := gridState.Cells[y][x].Value
			if currentValue == nil || *currentValue != *expectedLetter {
				complete = false
				break
			}
		}
		if !complete {
			break
		}
	}

	if complete {
		// Calculate solve time
		h.mutex.RLock()
		hubRoom := h.rooms[roomID]
		h.mutex.RUnlock()

		solveTime := 0
		if hubRoom != nil && hubRoom.StartTime != nil {
			solveTime = int(time.Since(*hubRoom.StartTime).Seconds())
		}

		// Get player results
		players, _ := h.db.GetRoomPlayers(roomID)
		var results []PlayerResult
		for _, p := range players {
			if !p.IsSpectator {
				results = append(results, PlayerResult{
					UserID:       p.UserID,
					DisplayName:  p.DisplayName,
					Contribution: p.Contribution,
					Color:        p.Color,
				})
			}
		}

		// Update room state
		h.db.UpdateRoomState(roomID, models.RoomStateCompleted)

		// Broadcast completion
		h.broadcastToRoom(roomID, "", MsgPuzzleCompleted, PuzzleCompletedPayload{
			SolveTime:   solveTime,
			Players:     results,
			CompletedAt: time.Now(),
		})
	}
}

func (h *Hub) removeClientFromRoom(client *Client) {
	h.mutex.Lock()
	hubRoom, exists := h.rooms[client.RoomID]
	h.mutex.Unlock()

	if !exists {
		return
	}

	hubRoom.mutex.Lock()
	delete(hubRoom.Clients, client.UserID)
	isEmpty := len(hubRoom.Clients) == 0
	hubRoom.mutex.Unlock()

	// Update player connection status
	h.db.UpdatePlayerConnection(client.UserID, client.RoomID, false)

	// Get player for notification
	players, _ := h.db.GetRoomPlayers(client.RoomID)
	player := findPlayer(players, client.UserID)
	displayName := "Unknown"
	if player != nil {
		displayName = player.DisplayName
	}

	// Notify other clients
	h.broadcastToRoom(client.RoomID, client.UserID, MsgPlayerLeft, PlayerLeftPayload{
		UserID:      client.UserID,
		DisplayName: displayName,
	})

	// Clean up empty room
	if isEmpty {
		h.mutex.Lock()
		delete(h.rooms, client.RoomID)
		h.mutex.Unlock()
	}

	client.RoomID = ""
}

func (h *Hub) sendToClient(client *Client, msgType MessageType, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	msg := Message{
		Type:    msgType,
		Payload: data,
	}

	msgData, err := json.Marshal(msg)
	if err != nil {
		return
	}

	select {
	case client.Send <- msgData:
	default:
		// Channel full, skip message
	}
}

func (h *Hub) broadcastToRoom(roomID string, excludeUserID string, msgType MessageType, payload interface{}) {
	h.mutex.RLock()
	hubRoom, exists := h.rooms[roomID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	msg := Message{
		Type:    msgType,
		Payload: data,
	}

	msgData, err := json.Marshal(msg)
	if err != nil {
		return
	}

	hubRoom.mutex.RLock()
	for userID, client := range hubRoom.Clients {
		if userID != excludeUserID {
			select {
			case client.Send <- msgData:
			default:
				// Channel full, skip message
			}
		}
	}
	hubRoom.mutex.RUnlock()
}

func (h *Hub) sendError(client *Client, message string) {
	h.sendToClient(client, MsgError, ErrorPayload{Message: message})
}

func findPlayer(players []models.Player, userID string) *models.Player {
	for _, p := range players {
		if p.UserID == userID {
			return &p
		}
	}
	return nil
}

func sanitizePuzzleForClient(puzzle *models.Puzzle) *models.Puzzle {
	if puzzle == nil {
		return nil
	}

	sanitized := *puzzle
	sanitized.CluesAcross = make([]models.Clue, len(puzzle.CluesAcross))
	sanitized.CluesDown = make([]models.Clue, len(puzzle.CluesDown))

	for i, clue := range puzzle.CluesAcross {
		sanitized.CluesAcross[i] = models.Clue{
			Number:    clue.Number,
			Text:      clue.Text,
			PositionX: clue.PositionX,
			PositionY: clue.PositionY,
			Length:    clue.Length,
			Direction: clue.Direction,
		}
	}

	for i, clue := range puzzle.CluesDown {
		sanitized.CluesDown[i] = models.Clue{
			Number:    clue.Number,
			Text:      clue.Text,
			PositionX: clue.PositionX,
			PositionY: clue.PositionY,
			Length:    clue.Length,
			Direction: clue.Direction,
		}
	}

	return &sanitized
}
