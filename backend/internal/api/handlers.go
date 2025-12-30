package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/crossplay/backend/internal/auth"
	"github.com/crossplay/backend/internal/db"
	"github.com/crossplay/backend/internal/middleware"
	"github.com/crossplay/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handlers struct {
	db          *db.Database
	authService *auth.AuthService
}

func NewHandlers(database *db.Database, authService *auth.AuthService) *Handlers {
	return &Handlers{
		db:          database,
		authService: authService,
	}
}

// Auth Handlers

type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	DisplayName string `json:"displayName" binding:"required,min=2,max=50"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type GuestRequest struct {
	DisplayName string `json:"displayName" binding:"required,min=2,max=50"`
}

type AuthResponse struct {
	User  models.User `json:"user"`
	Token string      `json:"token"`
}

func (h *Handlers) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	existingUser, err := h.db.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := h.authService.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Create user
	user := &models.User{
		ID:          uuid.New().String(),
		Email:       req.Email,
		DisplayName: req.DisplayName,
		Password:    hashedPassword,
		IsGuest:     false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.db.CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Generate token
	token, err := h.authService.GenerateToken(user.ID, user.Email, user.DisplayName, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{User: *user, Token: token})
}

func (h *Handlers) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	user, err := h.db.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Check password
	if !h.authService.CheckPassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate token
	token, err := h.authService.GenerateToken(user.ID, user.Email, user.DisplayName, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{User: *user, Token: token})
}

func (h *Handlers) Guest(c *gin.Context) {
	var req GuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create guest user
	guestID := uuid.New().String()
	user := &models.User{
		ID:          guestID,
		Email:       "guest_" + guestID[:8] + "@crossplay.local",
		DisplayName: req.DisplayName,
		IsGuest:     true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.db.CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create guest user"})
		return
	}

	// Generate token
	token, err := h.authService.GenerateToken(user.ID, user.Email, user.DisplayName, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{User: *user, Token: token})
}

// User Handlers

func (h *Handlers) GetMe(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	user, err := h.db.GetUserByID(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handlers) GetMyStats(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	stats, err := h.db.GetUserStats(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if stats == nil {
		stats = &models.UserStats{UserID: claims.UserID}
	}

	c.JSON(http.StatusOK, stats)
}

func (h *Handlers) GetMyHistory(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	history, err := h.db.GetUserPuzzleHistory(claims.UserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, history)
}

// Puzzle Handlers

func (h *Handlers) GetTodayPuzzle(c *gin.Context) {
	puzzle, err := h.db.GetTodayPuzzle()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if puzzle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no puzzle available for today"})
		return
	}

	// Remove answers for client
	sanitizedPuzzle := sanitizePuzzleForClient(puzzle)
	c.JSON(http.StatusOK, sanitizedPuzzle)
}

func (h *Handlers) GetPuzzleByDate(c *gin.Context) {
	date := c.Param("date")
	puzzle, err := h.db.GetPuzzleByDate(date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if puzzle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "puzzle not found"})
		return
	}

	sanitizedPuzzle := sanitizePuzzleForClient(puzzle)
	c.JSON(http.StatusOK, sanitizedPuzzle)
}

func (h *Handlers) GetPuzzleArchive(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Public archive only shows published puzzles
	puzzles, err := h.db.GetPuzzleArchive("published", limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Remove answers for archive listing
	var sanitizedPuzzles []*models.Puzzle
	for _, p := range puzzles {
		sanitizedPuzzles = append(sanitizedPuzzles, sanitizePuzzleForClient(p))
	}

	c.JSON(http.StatusOK, sanitizedPuzzles)
}

func (h *Handlers) GetRandomPuzzle(c *gin.Context) {
	difficulty := c.Query("difficulty")
	puzzle, err := h.db.GetRandomPuzzle(difficulty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if puzzle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no puzzles available"})
		return
	}

	sanitizedPuzzle := sanitizePuzzleForClient(puzzle)
	c.JSON(http.StatusOK, sanitizedPuzzle)
}

// sanitizePuzzleForClient removes answers from clues
func sanitizePuzzleForClient(puzzle *models.Puzzle) *models.Puzzle {
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

// Room Handlers

type CreateRoomRequest struct {
	PuzzleID string            `json:"puzzleId" binding:"required"`
	Mode     models.RoomMode   `json:"mode" binding:"required"`
	Config   models.RoomConfig `json:"config"`
}

type JoinRoomRequest struct {
	DisplayName string `json:"displayName"`
	IsSpectator bool   `json:"isSpectator"`
}

func (h *Handlers) CreateRoom(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate puzzle exists
	puzzle, err := h.db.GetPuzzleByID(req.PuzzleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if puzzle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "puzzle not found"})
		return
	}

	// Set default config values
	if req.Config.MaxPlayers == 0 {
		req.Config.MaxPlayers = 8
	}
	if req.Config.TimerMode == "" {
		req.Config.TimerMode = "none"
	}

	// Generate room code
	roomCode := generateRoomCode()

	room := &models.Room{
		ID:        uuid.New().String(),
		Code:      roomCode,
		HostID:    claims.UserID,
		PuzzleID:  req.PuzzleID,
		Mode:      req.Mode,
		Config:    req.Config,
		State:     models.RoomStateLobby,
		CreatedAt: time.Now(),
	}

	if err := h.db.CreateRoom(room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create room"})
		return
	}

	// Add host as first player
	player := &models.Player{
		UserID:      claims.UserID,
		RoomID:      room.ID,
		DisplayName: claims.DisplayName,
		IsSpectator: false,
		IsConnected: true,
		Color:       getPlayerColor(0),
		JoinedAt:    time.Now(),
	}
	if err := h.db.AddPlayer(player); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add host to room"})
		return
	}

	// Initialize grid state
	gridState := initializeGridState(room.ID, puzzle)
	if err := h.db.CreateGridState(gridState); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to initialize grid state"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"room":   room,
		"player": player,
	})
}

func (h *Handlers) GetRoomByCode(c *gin.Context) {
	code := c.Param("code")
	room, err := h.db.GetRoomByCode(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	players, err := h.db.GetRoomPlayers(room.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"room":    room,
		"players": players,
	})
}

func (h *Handlers) JoinRoom(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	roomID := c.Param("id")
	var req JoinRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body for default join
		req.DisplayName = claims.DisplayName
	}

	room, err := h.db.GetRoomByID(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	if room.State == models.RoomStateCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room has ended"})
		return
	}

	players, err := h.db.GetRoomPlayers(room.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Check max players
	activePlayers := 0
	for _, p := range players {
		if !p.IsSpectator {
			activePlayers++
		}
	}

	if !req.IsSpectator && activePlayers >= room.Config.MaxPlayers {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room is full"})
		return
	}

	displayName := req.DisplayName
	if displayName == "" {
		displayName = claims.DisplayName
	}

	player := &models.Player{
		UserID:      claims.UserID,
		RoomID:      room.ID,
		DisplayName: displayName,
		IsSpectator: req.IsSpectator,
		IsConnected: true,
		Color:       getPlayerColor(len(players)),
		JoinedAt:    time.Now(),
	}

	if err := h.db.AddPlayer(player); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join room"})
		return
	}

	// Get puzzle for response
	puzzle, _ := h.db.GetPuzzleByID(room.PuzzleID)
	sanitizedPuzzle := sanitizePuzzleForClient(puzzle)

	// Get grid state
	gridState, _ := h.db.GetGridState(room.ID)

	c.JSON(http.StatusOK, gin.H{
		"room":      room,
		"player":    player,
		"puzzle":    sanitizedPuzzle,
		"gridState": gridState,
	})
}

func (h *Handlers) StartRoom(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	roomID := c.Param("id")
	room, err := h.db.GetRoomByID(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	if room.HostID != claims.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only host can start the room"})
		return
	}

	if room.State != models.RoomStateLobby {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room already started"})
		return
	}

	if err := h.db.UpdateRoomState(room.ID, models.RoomStateActive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "room started"})
}

func (h *Handlers) CloseRoom(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	roomID := c.Param("id")
	room, err := h.db.GetRoomByID(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	if room.HostID != claims.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only host can close the room"})
		return
	}

	if err := h.db.DeleteRoom(room.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "room closed"})
}

// Helper functions

func generateRoomCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	id := uuid.New()
	for i := 0; i < 6; i++ {
		code[i] = chars[int(id[i])%len(chars)]
	}
	return string(code)
}

var playerColors = []string{
	"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
	"#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
}

func getPlayerColor(index int) string {
	return playerColors[index%len(playerColors)]
}

func initializeGridState(roomID string, puzzle *models.Puzzle) *models.GridState {
	cells := make([][]models.Cell, puzzle.GridHeight)
	for y := 0; y < puzzle.GridHeight; y++ {
		cells[y] = make([]models.Cell, puzzle.GridWidth)
		for x := 0; x < puzzle.GridWidth; x++ {
			cells[y][x] = models.Cell{
				Value:      nil,
				IsRevealed: false,
			}
		}
	}

	return &models.GridState{
		RoomID:        roomID,
		Cells:         cells,
		CompletedClues: []string{},
		LastUpdated:   time.Now(),
	}
}
