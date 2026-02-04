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
	MsgSetReady     MessageType = "set_ready"
	MsgReaction     MessageType = "reaction"
	MsgPassTurn     MessageType = "pass_turn" // Relay mode: pass turn to next player

	// Server to Client
	MsgRoomState        MessageType = "room_state"
	MsgPlayerJoined     MessageType = "player_joined"
	MsgPlayerLeft       MessageType = "player_left"
	MsgPlayerReady      MessageType = "player_ready"
	MsgCellUpdated      MessageType = "cell_updated"
	MsgCursorMoved      MessageType = "cursor_moved"
	MsgNewMessage       MessageType = "new_message"
	MsgGameStarted      MessageType = "game_started"
	MsgPuzzleCompleted  MessageType = "puzzle_completed"
	MsgError            MessageType = "error"
	MsgReactionAdded    MessageType = "reaction_added"
	MsgRaceProgress     MessageType = "race_progress"     // Race mode: leaderboard update
	MsgPlayerFinished   MessageType = "player_finished"   // Race mode: player completed puzzle
	MsgTurnChanged      MessageType = "turn_changed"      // Relay mode: turn passed
	MsgRoomDeleted      MessageType = "room_deleted"      // Room was deleted (e.g., host left)
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
	Reactions []models.Reaction `json:"reactions"`
}

type PlayerJoinedPayload struct {
	Player models.Player `json:"player"`
}

type PlayerLeftPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

type CellUpdatedPayload struct {
	X          int    `json:"x"`
	Y          int    `json:"y"`
	Value      string `json:"value"`
	PlayerID   string `json:"playerId"`
	Color      string `json:"color"`
	IsRevealed bool   `json:"isRevealed,omitempty"`
	IsCorrect  *bool  `json:"isCorrect,omitempty"`
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

// Race mode payloads
type RaceProgressPayload struct {
	Leaderboard []models.RaceProgress `json:"leaderboard"`
}

type PlayerFinishedPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	SolveTime   int    `json:"solveTime"`
	Rank        int    `json:"rank"`
}

// Relay mode payloads
type TurnChangedPayload struct {
	CurrentPlayerID   string `json:"currentPlayerId"`
	CurrentPlayerName string `json:"currentPlayerName"`
	TurnNumber        int    `json:"turnNumber"`
}

type RoomDeletedPayload struct {
	Reason string `json:"reason"`
}

// Hub manages all WebSocket connections and rooms
type Hub struct {
	db              *db.Database
	clients         map[string]*Client   // connectionID -> client
	userConnections map[string][]string  // userID -> []connectionID
	rooms           map[string]*Room     // roomID -> room
	register        chan *Client
	unregister      chan *Client
	mutex           sync.RWMutex
}

// Room represents a multiplayer room with connected clients
type Room struct {
	ID          string
	Code        string
	Mode        models.RoomMode
	Clients     map[string]*Client // connectionID -> client
	StartTime   *time.Time
	mutex       sync.RWMutex
	// Race mode tracking
	FinishOrder []string           // UserIDs in order of completion
	// Relay mode tracking
	TurnNumber  int
	// Contribution tracking (collaborative mode)
	ContributionMap map[string]int // userID -> correct cell count
}

func NewHub(database *db.Database) *Hub {
	return &Hub{
		db:              database,
		clients:         make(map[string]*Client),
		userConnections: make(map[string][]string),
		rooms:           make(map[string]*Room),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
	}
}

func (h *Hub) Run() {
	// Start relay turn timeout checker
	go h.checkRelayTurnTimeouts()

	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			// Store client by connectionID
			h.clients[client.ConnectionID] = client
			// Track user's connections
			h.userConnections[client.UserID] = append(h.userConnections[client.UserID], client.ConnectionID)
			h.mutex.Unlock()
			log.Printf("Client registered: connectionID=%s, userID=%s", client.ConnectionID, client.UserID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client.ConnectionID]; ok {
				delete(h.clients, client.ConnectionID)
				close(client.Send)

				// Remove connection from user's connection list
				if conns, exists := h.userConnections[client.UserID]; exists {
					newConns := make([]string, 0, len(conns))
					for _, connID := range conns {
						if connID != client.ConnectionID {
							newConns = append(newConns, connID)
						}
					}
					if len(newConns) > 0 {
						h.userConnections[client.UserID] = newConns
					} else {
						delete(h.userConnections, client.UserID)
					}
				}
			}
			h.mutex.Unlock()

			// Remove from room if in one
			if client.RoomID != "" {
				h.removeClientFromRoom(client)
			}
			log.Printf("Client unregistered: connectionID=%s, userID=%s", client.ConnectionID, client.UserID)
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
	log.Printf("HandleMessage: Received %s from user %s", msg.Type, client.UserID)
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
	case MsgSetReady:
		h.handleSetReady(client, msg.Payload)
	case MsgReaction:
		h.handleReaction(client, msg.Payload)
	case MsgPassTurn:
		h.handlePassTurn(client)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleJoinRoom(client *Client, payload json.RawMessage) {
	var p JoinRoomPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("handleJoinRoom: Failed to unmarshal payload: %v", err)
		h.sendError(client, "invalid payload")
		return
	}

	log.Printf("handleJoinRoom: User %s joining room %s", client.UserID, p.RoomCode)

	// Get room from database
	room, err := h.db.GetRoomByCode(p.RoomCode)
	if err != nil || room == nil {
		log.Printf("handleJoinRoom: Room not found - code: %s, err: %v", p.RoomCode, err)
		h.sendError(client, "room not found")
		return
	}

	log.Printf("handleJoinRoom: Found room %s (ID: %s)", room.Code, room.ID)

	// Get or create room in hub
	h.mutex.Lock()
	hubRoom, exists := h.rooms[room.ID]
	if !exists {
		hubRoom = &Room{
			ID:              room.ID,
			Code:            room.Code,
			Mode:            room.Mode,
			Clients:         make(map[string]*Client),
			FinishOrder:     []string{},
			ContributionMap: make(map[string]int),
		}
		h.rooms[room.ID] = hubRoom
	}
	h.mutex.Unlock()

	// Add client to room
	hubRoom.mutex.Lock()
	hubRoom.Clients[client.ConnectionID] = client
	hubRoom.mutex.Unlock()

	client.RoomID = room.ID

	// Update player connection status
	h.db.UpdatePlayerConnection(client.UserID, room.ID, true)

	// Get room state
	players, _ := h.db.GetRoomPlayers(room.ID)
	gridState, _ := h.db.GetGridState(room.ID)
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	messages, _ := h.db.GetRoomMessages(room.ID, 50)
	reactions, _ := h.db.GetRoomReactions(room.ID)

	// Send room state to joining client
	roomState := RoomStatePayload{
		Room:      room,
		Players:   players,
		GridState: gridState,
		Puzzle:    sanitizePuzzleForClient(puzzle),
		Messages:  messages,
		Reactions: reactions,
	}
	h.sendToClient(client, MsgRoomState, roomState)

	// Notify other clients
	player := findPlayer(players, client.UserID)
	if player != nil {
		h.broadcastToRoom(room.ID, client.ConnectionID, MsgPlayerJoined, PlayerJoinedPayload{
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
	log.Printf("handleCellUpdate: called for user %s", client.UserID)
	if client.RoomID == "" {
		log.Printf("handleCellUpdate: client has no roomID")
		return
	}

	var p CellUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("handleCellUpdate: failed to unmarshal payload: %v", err)
		h.sendError(client, "invalid payload")
		return
	}
	log.Printf("handleCellUpdate: x=%d, y=%d, value=%v", p.X, p.Y, p.Value)

	// Get room
	room, _ := h.db.GetRoomByID(client.RoomID)
	if room == nil || room.State != models.RoomStateActive {
		return
	}

	// Handle based on game mode
	switch room.Mode {
	case models.RoomModeRace:
		h.handleRaceCellUpdate(client, room, &p)
	case models.RoomModeRelay:
		h.handleRelayCellUpdate(client, room, &p)
	default: // Collaborative
		h.handleCollaborativeCellUpdate(client, room, &p)
	}
}

func (h *Hub) handleCollaborativeCellUpdate(client *Client, room *models.Room, p *CellUpdatePayload) {
	gridState, _ := h.db.GetGridState(client.RoomID)
	if gridState == nil {
		return
	}

	// Get puzzle to validate answer
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	if puzzle == nil {
		return
	}

	// Update cell
	if p.Y >= 0 && p.Y < len(gridState.Cells) && p.X >= 0 && p.X < len(gridState.Cells[p.Y]) {
		// Check if this cell was previously incorrect or empty, and is now correct
		isNewCorrectAnswer := false
		if p.Value != nil && puzzle.Grid[p.Y][p.X].Letter != nil {
			prevValue := gridState.Cells[p.Y][p.X].Value
			newValue := *p.Value
			expectedValue := *puzzle.Grid[p.Y][p.X].Letter

			// Only track contribution if this is a new correct answer
			if newValue == expectedValue && (prevValue == nil || *prevValue != expectedValue) {
				isNewCorrectAnswer = true
			}
		}

		gridState.Cells[p.Y][p.X].Value = p.Value
		gridState.Cells[p.Y][p.X].LastEditedBy = &client.UserID
		gridState.LastUpdated = time.Now()

		h.db.UpdateGridState(gridState)

		// Track contribution if this is a new correct answer
		if isNewCorrectAnswer {
			h.mutex.Lock()
			hubRoom := h.rooms[client.RoomID]
			if hubRoom != nil {
				if hubRoom.ContributionMap == nil {
					hubRoom.ContributionMap = make(map[string]int)
				}
				hubRoom.ContributionMap[client.UserID]++
			}
			h.mutex.Unlock()
		}

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
		h.checkCollaborativeCompletion(client.RoomID)
	}
}

func (h *Hub) handleRaceCellUpdate(client *Client, room *models.Room, p *CellUpdatePayload) {
	// In Race mode, each player has their own grid
	gridState, _ := h.db.GetPlayerGridState(client.RoomID, client.UserID)
	if gridState == nil {
		// Create player's grid if it doesn't exist
		puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
		if puzzle == nil {
			return
		}
		gridState = &models.GridState{
			RoomID:         client.RoomID,
			UserID:         client.UserID,
			Cells:          make([][]models.Cell, len(puzzle.Grid)),
			CompletedClues: []string{},
			LastUpdated:    time.Now(),
		}
		for y := range puzzle.Grid {
			gridState.Cells[y] = make([]models.Cell, len(puzzle.Grid[y]))
		}
		h.db.CreateGridState(gridState)
	}

	// Update cell
	if p.Y >= 0 && p.Y < len(gridState.Cells) && p.X >= 0 && p.X < len(gridState.Cells[p.Y]) {
		gridState.Cells[p.Y][p.X].Value = p.Value
		gridState.Cells[p.Y][p.X].LastEditedBy = &client.UserID
		gridState.LastUpdated = time.Now()

		h.db.UpdateGridState(gridState)

		// In Race mode, only send update back to the player (not broadcast)
		value := ""
		if p.Value != nil {
			value = *p.Value
		}
		h.sendToClient(client, MsgCellUpdated, CellUpdatedPayload{
			X:        p.X,
			Y:        p.Y,
			Value:    value,
			PlayerID: client.UserID,
			Color:    "#4ECDC4",
		})

		// Check if this player completed and broadcast progress
		h.checkRaceProgress(client.RoomID, client.UserID)
	}
}

func (h *Hub) handleRelayCellUpdate(client *Client, room *models.Room, p *CellUpdatePayload) {
	// Check if it's this player's turn
	relayState, _ := h.db.GetRelayState(client.RoomID)
	if relayState == nil || relayState.CurrentPlayerID != client.UserID {
		h.sendError(client, "not your turn")
		return
	}

	gridState, _ := h.db.GetGridState(client.RoomID)
	if gridState == nil {
		return
	}

	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	if puzzle == nil {
		return
	}

	// Get previously completed clues count
	prevCompletedCount := len(gridState.CompletedClues)

	// Update cell
	if p.Y >= 0 && p.Y < len(gridState.Cells) && p.X >= 0 && p.X < len(gridState.Cells[p.Y]) {
		gridState.Cells[p.Y][p.X].Value = p.Value
		gridState.Cells[p.Y][p.X].LastEditedBy = &client.UserID
		gridState.LastUpdated = time.Now()

		// Check for newly completed clues
		gridState.CompletedClues = h.getCompletedClues(puzzle, gridState)
		h.db.UpdateGridState(gridState)

		// Track newly completed words this turn
		newCompletedCount := len(gridState.CompletedClues)
		if newCompletedCount > prevCompletedCount {
			wordsCompleted := newCompletedCount - prevCompletedCount
			relayState.WordsThisTurn += wordsCompleted
			h.db.UpdateRelayState(relayState)
		}

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
		h.checkCollaborativeCompletion(client.RoomID)
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
	h.broadcastToRoom(client.RoomID, client.ConnectionID, MsgCursorMoved, CursorMovedPayload{
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
					X:          p.X,
					Y:          p.Y,
					Value:      *letter,
					PlayerID:   "system",
					Color:      "#888888",
					IsRevealed: true,
				})
			}
		}

	case "word":
		// Reveal entire word
		if p.Y >= 0 && p.Y < len(puzzle.Grid) && p.X >= 0 && p.X < len(puzzle.Grid[p.Y]) {
			// Find which clue this cell belongs to
			var targetClue *models.Clue
			var direction string

			// Check across clues
			for _, clue := range puzzle.CluesAcross {
				if clue.PositionY == p.Y && p.X >= clue.PositionX && p.X < clue.PositionX+clue.Length {
					targetClue = &clue
					direction = "across"
					break
				}
			}

			// Check down clues if not found
			if targetClue == nil {
				for _, clue := range puzzle.CluesDown {
					if clue.PositionX == p.X && p.Y >= clue.PositionY && p.Y < clue.PositionY+clue.Length {
						targetClue = &clue
						direction = "down"
						break
					}
				}
			}

			// Reveal all cells in the word
			if targetClue != nil {
				for i := 0; i < targetClue.Length; i++ {
					var cellX, cellY int
					if direction == "across" {
						cellX = targetClue.PositionX + i
						cellY = targetClue.PositionY
					} else {
						cellX = targetClue.PositionX
						cellY = targetClue.PositionY + i
					}

					letter := puzzle.Grid[cellY][cellX].Letter
					if letter != nil {
						gridState.Cells[cellY][cellX].Value = letter
						gridState.Cells[cellY][cellX].IsRevealed = true

						h.broadcastToRoom(client.RoomID, "", MsgCellUpdated, CellUpdatedPayload{
							X:          cellX,
							Y:          cellY,
							Value:      *letter,
							PlayerID:   "system",
							Color:      "#888888",
							IsRevealed: true,
						})
					}
				}
				gridState.LastUpdated = time.Now()
				h.db.UpdateGridState(gridState)
			}
		}

	case "check":
		// Check all cells and highlight incorrect ones
		for y := 0; y < len(puzzle.Grid); y++ {
			for x := 0; x < len(puzzle.Grid[y]); x++ {
				letter := puzzle.Grid[y][x].Letter
				currentValue := gridState.Cells[y][x].Value

				// Only check cells that have user input and aren't black squares
				if letter != nil && currentValue != nil && *currentValue != "" {
					isCorrect := *letter == *currentValue
					gridState.Cells[y][x].IsCorrect = &isCorrect

					// Broadcast the validation result
					h.broadcastToRoom(client.RoomID, "", MsgCellUpdated, CellUpdatedPayload{
						X:         x,
						Y:         y,
						Value:     *currentValue,
						PlayerID:  client.UserID,
						Color:     "#888888",
						IsCorrect: &isCorrect,
					})
				}
			}
		}
		gridState.LastUpdated = time.Now()
		h.db.UpdateGridState(gridState)
	}
}

func (h *Hub) handleSetReady(client *Client, payload json.RawMessage) {
	var p struct {
		Ready bool `json:"ready"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("handleSetReady: Failed to unmarshal payload: %v", err)
		h.sendError(client, "invalid payload")
		return
	}

	if client.RoomID == "" {
		log.Printf("handleSetReady: client has no roomID")
		return
	}

	log.Printf("handleSetReady: User %s setting ready to %v in room %s", client.UserID, p.Ready, client.RoomID)

	// Update ready status in database
	if err := h.db.UpdatePlayerReady(client.UserID, client.RoomID, p.Ready); err != nil {
		log.Printf("handleSetReady: error updating ready status: %v", err)
		h.sendError(client, "failed to update ready status")
		return
	}

	// Broadcast ready status to all clients in the room
	h.broadcastToRoom(client.RoomID, "", MsgPlayerReady, map[string]interface{}{
		"userId": client.UserID,
		"ready":  p.Ready,
	})
}

func (h *Hub) handleStartGame(client *Client) {
	log.Printf("handleStartGame: called for user %s", client.UserID)
	if client.RoomID == "" {
		log.Printf("handleStartGame: client has no roomID")
		return
	}

	room, err := h.db.GetRoomByID(client.RoomID)
	if err != nil {
		log.Printf("handleStartGame: error getting room: %v", err)
		return
	}
	if room == nil {
		log.Printf("handleStartGame: room not found")
		return
	}

	log.Printf("handleStartGame: room %s, host %s, requester %s, state %s", room.ID, room.HostID, client.UserID, room.State)

	if room.HostID != client.UserID {
		log.Printf("handleStartGame: user is not host")
		h.sendError(client, "only host can start the game")
		return
	}

	if room.State != models.RoomStateLobby {
		log.Printf("handleStartGame: room not in lobby state, current state: %s", room.State)
		h.sendError(client, "game already started")
		return
	}

	log.Printf("handleStartGame: updating room state to active")
	// Update room state
	h.db.UpdateRoomState(room.ID, models.RoomStateActive)

	// Set start time and initialize contribution tracking for collaborative mode
	h.mutex.Lock()
	if hubRoom, exists := h.rooms[room.ID]; exists {
		now := time.Now()
		hubRoom.StartTime = &now
		// Initialize contribution map for collaborative mode
		if room.Mode == models.RoomModeCollaborative {
			if hubRoom.ContributionMap == nil {
				hubRoom.ContributionMap = make(map[string]int)
			}
		}
	}
	h.mutex.Unlock()

	// Initialize mode-specific state
	players, _ := h.db.GetRoomPlayers(room.ID)
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)

	switch room.Mode {
	case models.RoomModeRace:
		// Create individual grid state for each player
		for _, player := range players {
			if !player.IsSpectator {
				gridState := &models.GridState{
					RoomID:         room.ID,
					UserID:         player.UserID,
					Cells:          make([][]models.Cell, len(puzzle.Grid)),
					CompletedClues: []string{},
					LastUpdated:    time.Now(),
				}
				for y := range puzzle.Grid {
					gridState.Cells[y] = make([]models.Cell, len(puzzle.Grid[y]))
				}
				h.db.CreateGridState(gridState)
			}
		}

	case models.RoomModeRelay:
		// Set up turn order
		var turnOrder []string
		for _, player := range players {
			if !player.IsSpectator {
				turnOrder = append(turnOrder, player.UserID)
			}
		}
		if len(turnOrder) > 0 {
			relayState := &models.RelayState{
				RoomID:          room.ID,
				CurrentPlayerID: turnOrder[0],
				TurnOrder:       turnOrder,
				TurnStartedAt:   time.Now(),
				TurnTimeLimit:   60, // 60 seconds per turn
				WordsThisTurn:   0,
			}
			h.db.CreateRelayState(relayState)

			// Get first player name
			firstPlayer := findPlayer(players, turnOrder[0])
			playerName := "Unknown"
			if firstPlayer != nil {
				playerName = firstPlayer.DisplayName
			}

			// Broadcast turn info
			h.broadcastToRoom(client.RoomID, "", MsgTurnChanged, TurnChangedPayload{
				CurrentPlayerID:   turnOrder[0],
				CurrentPlayerName: playerName,
				TurnNumber:        1,
			})
		}
	}

	// Broadcast game started
	log.Printf("handleStartGame: broadcasting game_started to room %s", client.RoomID)
	h.broadcastToRoom(client.RoomID, "", MsgGameStarted, nil)
	log.Printf("handleStartGame: completed successfully")
}

func (h *Hub) handleReaction(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	var p ReactionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	// Validate emoji is one of the allowed reactions
	allowedEmojis := []string{"👍", "❤️", "😂", "🤔", "💡"}
	isValidEmoji := false
	for _, allowed := range allowedEmojis {
		if p.Emoji == allowed {
			isValidEmoji = true
			break
		}
	}

	// If emoji is empty, remove the user's reaction for this clue
	if p.Emoji == "" {
		if err := h.db.RemoveReaction(client.RoomID, client.UserID, p.ClueID); err != nil {
			log.Printf("Failed to remove reaction: %v", err)
			return
		}

		// Broadcast reaction removal
		h.broadcastToRoom(client.RoomID, "", MsgReactionAdded, map[string]interface{}{
			"userId":  client.UserID,
			"clueId":  p.ClueID,
			"emoji":   "",
			"action":  "removed",
		})
		return
	}

	if !isValidEmoji {
		log.Printf("Invalid emoji received: %s", p.Emoji)
		return
	}

	// Check if user already has a reaction for this clue
	existingReaction, err := h.db.GetUserReactionForClue(client.RoomID, client.UserID, p.ClueID)
	if err != nil {
		log.Printf("Failed to check existing reaction: %v", err)
		return
	}

	// If user is changing to a different emoji, remove the old one first
	if existingReaction != nil && existingReaction.Emoji != p.Emoji {
		if err := h.db.RemoveReaction(client.RoomID, client.UserID, p.ClueID); err != nil {
			log.Printf("Failed to remove old reaction: %v", err)
			return
		}
	}

	// Add or update the reaction
	reaction := &models.Reaction{
		ID:        uuid.New().String(),
		RoomID:    client.RoomID,
		UserID:    client.UserID,
		ClueID:    p.ClueID,
		Emoji:     p.Emoji,
		CreatedAt: time.Now(),
	}

	if err := h.db.AddOrUpdateReaction(reaction); err != nil {
		log.Printf("Failed to save reaction: %v", err)
		return
	}

	// Broadcast reaction to room
	h.broadcastToRoom(client.RoomID, "", MsgReactionAdded, map[string]interface{}{
		"userId":  client.UserID,
		"clueId":  p.ClueID,
		"emoji":   p.Emoji,
		"action":  "added",
	})
}

func (h *Hub) checkCollaborativeCompletion(roomID string) {
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

		// Calculate total cells in puzzle
		totalCells := 0
		for y := range puzzle.Grid {
			for x := range puzzle.Grid[y] {
				if puzzle.Grid[y][x].Letter != nil {
					totalCells++
				}
			}
		}

		// Calculate contribution percentages
		h.mutex.Lock()
		contributionMap := make(map[string]float64)
		if hubRoom != nil && hubRoom.ContributionMap != nil && totalCells > 0 {
			for userID, cellCount := range hubRoom.ContributionMap {
				contribution := float64(cellCount) / float64(totalCells) * 100.0
				contributionMap[userID] = contribution

				// Update player contribution in database
				h.db.UpdatePlayerContribution(userID, roomID, contribution)
			}
		}
		h.mutex.Unlock()

		// Get player results with updated contributions
		players, _ := h.db.GetRoomPlayers(roomID)
		var results []PlayerResult
		for _, p := range players {
			if !p.IsSpectator {
				contribution := contributionMap[p.UserID]
				results = append(results, PlayerResult{
					UserID:       p.UserID,
					DisplayName:  p.DisplayName,
					Contribution: contribution,
					Color:        p.Color,
				})

				// Update user stats and create puzzle history
				// For collaborative mode, everyone "wins" (rank 0 = no rank for collaborative)
				h.updateUserStatsAfterCompletion(p.UserID, room.PuzzleID, &roomID, solveTime, 0)
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

func (h *Hub) checkRaceProgress(roomID string, userID string) {
	room, _ := h.db.GetRoomByID(roomID)
	if room == nil {
		return
	}

	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	if puzzle == nil {
		return
	}

	// Get the hub room for tracking finish order
	h.mutex.RLock()
	hubRoom := h.rooms[roomID]
	h.mutex.RUnlock()

	if hubRoom == nil {
		return
	}

	// Count total cells in puzzle
	totalCells := 0
	for y := range puzzle.Grid {
		for x := range puzzle.Grid[y] {
			if puzzle.Grid[y][x].Letter != nil {
				totalCells++
			}
		}
	}

	// Build leaderboard from all players
	players, _ := h.db.GetRoomPlayers(roomID)
	var leaderboard []models.RaceProgress

	allFinished := true
	activePlayers := 0

	for _, player := range players {
		if player.IsSpectator {
			continue
		}
		activePlayers++

		gridState, _ := h.db.GetPlayerGridState(roomID, player.UserID)
		if gridState == nil {
			leaderboard = append(leaderboard, models.RaceProgress{
				UserID:      player.UserID,
				DisplayName: player.DisplayName,
				Progress:    0,
			})
			allFinished = false
			continue
		}

		// Calculate progress
		correctCells := 0
		complete := true
		for y := range puzzle.Grid {
			for x := range puzzle.Grid[y] {
				expectedLetter := puzzle.Grid[y][x].Letter
				if expectedLetter == nil {
					continue
				}
				if y < len(gridState.Cells) && x < len(gridState.Cells[y]) {
					currentValue := gridState.Cells[y][x].Value
					if currentValue != nil && *currentValue == *expectedLetter {
						correctCells++
					} else {
						complete = false
					}
				} else {
					complete = false
				}
			}
		}

		progress := float64(correctCells) / float64(totalCells) * 100

		rp := models.RaceProgress{
			UserID:      player.UserID,
			DisplayName: player.DisplayName,
			Progress:    progress,
		}

		// Check if player just finished
		if complete {
			hubRoom.mutex.Lock()
			alreadyFinished := false
			for _, uid := range hubRoom.FinishOrder {
				if uid == player.UserID {
					alreadyFinished = true
					break
				}
			}
			if !alreadyFinished {
				hubRoom.FinishOrder = append(hubRoom.FinishOrder, player.UserID)
				now := time.Now()
				rp.FinishedAt = &now
				solveTime := 0
				if hubRoom.StartTime != nil {
					solveTime = int(time.Since(*hubRoom.StartTime).Seconds())
				}
				rp.SolveTime = &solveTime
				rp.Rank = len(hubRoom.FinishOrder)

				// Broadcast that player finished
				h.broadcastToRoom(roomID, "", MsgPlayerFinished, PlayerFinishedPayload{
					UserID:      player.UserID,
					DisplayName: player.DisplayName,
					SolveTime:   solveTime,
					Rank:        rp.Rank,
				})

				// Update user stats and create puzzle history
				// For race mode, track multiplayer wins (rank 1 = winner)
				h.updateUserStatsAfterCompletion(player.UserID, room.PuzzleID, &roomID, solveTime, rp.Rank)
			}
			hubRoom.mutex.Unlock()
		} else {
			allFinished = false
		}

		leaderboard = append(leaderboard, rp)
	}

	// Broadcast progress update
	h.broadcastToRoom(roomID, "", MsgRaceProgress, RaceProgressPayload{
		Leaderboard: leaderboard,
	})

	// Check if race is complete
	if allFinished && activePlayers > 0 {
		h.db.UpdateRoomState(roomID, models.RoomStateCompleted)

		// Build final results
		var results []PlayerResult
		for i, uid := range hubRoom.FinishOrder {
			player := findPlayer(players, uid)
			if player != nil {
				results = append(results, PlayerResult{
					UserID:       uid,
					DisplayName:  player.DisplayName,
					Contribution: float64(len(hubRoom.FinishOrder) - i), // Higher rank = more contribution
					Color:        player.Color,
				})
			}
		}

		h.broadcastToRoom(roomID, "", MsgPuzzleCompleted, PuzzleCompletedPayload{
			SolveTime:   0, // Race mode doesn't have a single solve time
			Players:     results,
			CompletedAt: time.Now(),
		})
	}
}

func (h *Hub) handlePassTurn(client *Client) {
	if client.RoomID == "" {
		return
	}

	room, _ := h.db.GetRoomByID(client.RoomID)
	if room == nil || room.Mode != models.RoomModeRelay {
		return
	}

	relayState, _ := h.db.GetRelayState(client.RoomID)
	if relayState == nil || relayState.CurrentPlayerID != client.UserID {
		h.sendError(client, "not your turn")
		return
	}

	// Find next player
	currentIndex := -1
	for i, uid := range relayState.TurnOrder {
		if uid == client.UserID {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 {
		return
	}

	nextIndex := (currentIndex + 1) % len(relayState.TurnOrder)
	nextPlayerID := relayState.TurnOrder[nextIndex]

	// Update relay state
	relayState.CurrentPlayerID = nextPlayerID
	relayState.TurnStartedAt = time.Now()
	relayState.WordsThisTurn = 0
	h.db.UpdateRelayState(relayState)

	// Increment turn number
	h.mutex.Lock()
	hubRoom := h.rooms[client.RoomID]
	if hubRoom != nil {
		hubRoom.TurnNumber++
	}
	turnNum := 1
	if hubRoom != nil {
		turnNum = hubRoom.TurnNumber
	}
	h.mutex.Unlock()

	// Get next player name
	players, _ := h.db.GetRoomPlayers(client.RoomID)
	nextPlayer := findPlayer(players, nextPlayerID)
	playerName := "Unknown"
	if nextPlayer != nil {
		playerName = nextPlayer.DisplayName
	}

	// Broadcast turn change
	h.broadcastToRoom(client.RoomID, "", MsgTurnChanged, TurnChangedPayload{
		CurrentPlayerID:   nextPlayerID,
		CurrentPlayerName: playerName,
		TurnNumber:        turnNum,
	})
}

func (h *Hub) checkRelayTurnTimeouts() {
	ticker := time.NewTicker(5 * time.Second) // Check every 5 seconds
	defer ticker.Stop()

	for range ticker.C {
		// Get all active relay rooms
		h.mutex.RLock()
		roomIDs := make([]string, 0, len(h.rooms))
		for roomID, room := range h.rooms {
			if room.Mode == models.RoomModeRelay {
				roomIDs = append(roomIDs, roomID)
			}
		}
		h.mutex.RUnlock()

		// Check each relay room for turn timeout
		for _, roomID := range roomIDs {
			relayState, err := h.db.GetRelayState(roomID)
			if err != nil || relayState == nil {
				continue
			}

			// Skip if no time limit
			if relayState.TurnTimeLimit == 0 {
				continue
			}

			// Check if turn has timed out
			elapsed := time.Since(relayState.TurnStartedAt)
			if elapsed.Seconds() >= float64(relayState.TurnTimeLimit) {
				// Auto-advance to next turn
				h.advanceTurn(roomID, relayState)
			}
		}
	}
}

func (h *Hub) advanceTurn(roomID string, relayState *models.RelayState) {
	// Find next player
	currentIndex := -1
	for i, uid := range relayState.TurnOrder {
		if uid == relayState.CurrentPlayerID {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 {
		return
	}

	nextIndex := (currentIndex + 1) % len(relayState.TurnOrder)
	nextPlayerID := relayState.TurnOrder[nextIndex]

	// Update relay state
	relayState.CurrentPlayerID = nextPlayerID
	relayState.TurnStartedAt = time.Now()
	relayState.WordsThisTurn = 0
	h.db.UpdateRelayState(relayState)

	// Increment turn number
	h.mutex.Lock()
	hubRoom := h.rooms[roomID]
	if hubRoom != nil {
		hubRoom.TurnNumber++
	}
	turnNum := 1
	if hubRoom != nil {
		turnNum = hubRoom.TurnNumber
	}
	h.mutex.Unlock()

	// Get next player name
	players, _ := h.db.GetRoomPlayers(roomID)
	nextPlayer := findPlayer(players, nextPlayerID)
	playerName := "Unknown"
	if nextPlayer != nil {
		playerName = nextPlayer.DisplayName
	}

	// Broadcast turn change
	h.broadcastToRoom(roomID, "", MsgTurnChanged, TurnChangedPayload{
		CurrentPlayerID:   nextPlayerID,
		CurrentPlayerName: playerName,
		TurnNumber:        turnNum,
	})

	log.Printf("Relay turn timeout: room %s advanced to player %s (turn %d)", roomID, nextPlayerID, turnNum)
}

func (h *Hub) removeClientFromRoom(client *Client) {
	h.mutex.Lock()
	hubRoom, exists := h.rooms[client.RoomID]
	h.mutex.Unlock()

	if !exists {
		return
	}

	roomID := client.RoomID

	// Get room from database to check if user is host
	room, err := h.db.GetRoomByID(roomID)
	if err != nil {
		log.Printf("removeClientFromRoom: error getting room: %v", err)
		return
	}

	hubRoom.mutex.Lock()
	delete(hubRoom.Clients, client.ConnectionID)
	isEmpty := len(hubRoom.Clients) == 0
	hubRoom.mutex.Unlock()

	// Check if user has any other connections in this room
	hasOtherConnections := false
	hubRoom.mutex.RLock()
	for _, c := range hubRoom.Clients {
		if c.UserID == client.UserID {
			hasOtherConnections = true
			break
		}
	}
	hubRoom.mutex.RUnlock()

	// Only update connection status if no other tabs are connected
	if !hasOtherConnections {
		h.db.UpdatePlayerConnection(client.UserID, roomID, false)

		// Get player for notification
		players, _ := h.db.GetRoomPlayers(roomID)
		player := findPlayer(players, client.UserID)
		displayName := "Unknown"
		if player != nil {
			displayName = player.DisplayName
		}

		// Check if the leaving user is the host
		isHost := room != nil && room.HostID == client.UserID

		if isHost {
			// Host is leaving - delete the room and notify all players
			log.Printf("removeClientFromRoom: host is leaving, deleting room %s", roomID)

			// Broadcast room_deleted to all remaining clients
			h.broadcastToRoom(roomID, "", MsgRoomDeleted, RoomDeletedPayload{
				Reason: "host_left",
			})

			// Delete room from database
			if err := h.db.DeleteRoom(roomID); err != nil {
				log.Printf("removeClientFromRoom: failed to delete room: %v", err)
			}

			// Clean up hub room
			h.mutex.Lock()
			delete(h.rooms, roomID)
			h.mutex.Unlock()

			// Close all client connections in this room
			hubRoom.mutex.RLock()
			for _, c := range hubRoom.Clients {
				if c.ConnectionID != client.ConnectionID {
					c.RoomID = ""
				}
			}
			hubRoom.mutex.RUnlock()
		} else {
			// Regular player leaving - just notify others
			h.broadcastToRoom(roomID, client.ConnectionID, MsgPlayerLeft, PlayerLeftPayload{
				UserID:      client.UserID,
				DisplayName: displayName,
			})

			// Clean up empty room
			if isEmpty {
				h.mutex.Lock()
				delete(h.rooms, roomID)
				h.mutex.Unlock()
			}
		}
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

func (h *Hub) broadcastToRoom(roomID string, excludeConnectionID string, msgType MessageType, payload interface{}) {
	log.Printf("broadcastToRoom: type=%s, roomID=%s, excludeConnectionID=%s", msgType, roomID, excludeConnectionID)
	h.mutex.RLock()
	hubRoom, exists := h.rooms[roomID]
	h.mutex.RUnlock()

	if !exists {
		log.Printf("broadcastToRoom: room %s does not exist", roomID)
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
	clientCount := len(hubRoom.Clients)
	log.Printf("broadcastToRoom: sending to %d clients in room", clientCount)
	for connectionID, client := range hubRoom.Clients {
		if connectionID != excludeConnectionID {
			log.Printf("broadcastToRoom: sending to client connectionID=%s, userID=%s", connectionID, client.UserID)
			select {
			case client.Send <- msgData:
				log.Printf("broadcastToRoom: sent to client connectionID=%s", connectionID)
			default:
				log.Printf("broadcastToRoom: channel full for client connectionID=%s", connectionID)
			}
		} else {
			log.Printf("broadcastToRoom: skipping excluded client connectionID=%s", connectionID)
		}
	}
	hubRoom.mutex.RUnlock()
	log.Printf("broadcastToRoom: complete")
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

func (h *Hub) getCompletedClues(puzzle *models.Puzzle, gridState *models.GridState) []string {
	completed := []string{}

	// Check across clues
	for _, clue := range puzzle.CluesAcross {
		if h.isClueComplete(clue, gridState) {
			clueID := "across-" + string(rune(clue.Number))
			completed = append(completed, clueID)
		}
	}

	// Check down clues
	for _, clue := range puzzle.CluesDown {
		if h.isClueComplete(clue, gridState) {
			clueID := "down-" + string(rune(clue.Number))
			completed = append(completed, clueID)
		}
	}

	return completed
}

func (h *Hub) isClueComplete(clue models.Clue, gridState *models.GridState) bool {
	for i := 0; i < clue.Length; i++ {
		var x, y int
		if clue.Direction == "across" {
			x = clue.PositionX + i
			y = clue.PositionY
		} else {
			x = clue.PositionX
			y = clue.PositionY + i
		}

		// Check bounds
		if y < 0 || y >= len(gridState.Cells) || x < 0 || x >= len(gridState.Cells[y]) {
			return false
		}

		cell := gridState.Cells[y][x]
		if cell.Value == nil {
			return false
		}

		// Compare with expected answer (case insensitive)
		if i < len(clue.Answer) {
			expected := string(clue.Answer[i])
			actual := *cell.Value
			if len(actual) > 0 && len(expected) > 0 {
				if actual[0] != expected[0] && actual[0] != expected[0]+32 && actual[0] != expected[0]-32 {
					return false
				}
			}
		}
	}
	return true
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

// updateUserStatsAfterCompletion updates user stats and creates puzzle history after completing a puzzle
// rank: 0 = collaborative/relay (no ranking), 1 = first place (winner), 2+ = other ranks
func (h *Hub) updateUserStatsAfterCompletion(userID string, puzzleID string, roomID *string, solveTime int, rank int) {
	// Get current user stats
	stats, err := h.db.GetUserStats(userID)
	if err != nil {
		log.Printf("Error getting user stats for %s: %v", userID, err)
		return
	}

	// If stats don't exist, create a new one
	if stats == nil {
		stats = &models.UserStats{
			UserID:        userID,
			PuzzlesSolved: 0,
			AvgSolveTime:  0,
			StreakCurrent: 0,
			StreakBest:    0,
		}
	}

	// Get puzzle to check if it's a daily puzzle
	puzzle, _ := h.db.GetPuzzleByID(puzzleID)
	today := time.Now().Format("2006-01-02")

	// Update streak logic (only for daily puzzles with dates)
	if puzzle != nil && puzzle.Date != nil && *puzzle.Date != "" {
		if stats.LastPlayedAt != nil {
			lastPlayed := stats.LastPlayedAt.Format("2006-01-02")
			yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

			// Continue streak if played yesterday or today (same day)
			if lastPlayed == yesterday {
				stats.StreakCurrent++
			} else if lastPlayed == today {
				// Same day, don't change streak
			} else {
				// Streak broken, start new streak
				stats.StreakCurrent = 1
			}
		} else {
			// First puzzle ever
			stats.StreakCurrent = 1
		}

		// Update best streak
		if stats.StreakCurrent > stats.StreakBest {
			stats.StreakBest = stats.StreakCurrent
		}
	}

	// Update other stats
	stats.PuzzlesSolved++
	totalTime := stats.AvgSolveTime * float64(stats.PuzzlesSolved-1)
	stats.AvgSolveTime = (totalTime + float64(solveTime)) / float64(stats.PuzzlesSolved)
	stats.TotalPlayTime += solveTime

	// Track multiplayer wins (rank 1 = first place winner)
	if rank == 1 {
		stats.MultiplayerWins++
	}

	now := time.Now()
	stats.LastPlayedAt = &now

	// Save updated stats
	if err := h.db.UpdateUserStats(stats); err != nil {
		log.Printf("Error updating user stats for %s: %v", userID, err)
	}

	// Create puzzle history record
	history := &models.PuzzleHistory{
		ID:          uuid.New().String(),
		UserID:      userID,
		PuzzleID:    puzzleID,
		RoomID:      roomID,
		SolveTime:   solveTime,
		Completed:   true,
		Accuracy:    100.0,
		HintsUsed:   0,
		CompletedAt: &now,
		CreatedAt:   now,
	}

	if err := h.db.CreatePuzzleHistory(history); err != nil {
		log.Printf("Error creating puzzle history for %s: %v", userID, err)
	}
}
