package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
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
	hub         HubInterface
}

// HubInterface defines the methods needed from the Hub
type HubInterface interface {
	BroadcastToRoom(roomID, senderID string, messageType interface{}, payload interface{})
}

func NewHandlers(database *db.Database, authService *auth.AuthService) *Handlers {
	return &Handlers{
		db:          database,
		authService: authService,
		hub:         nil, // Will be set via SetHub
	}
}

// SetHub sets the WebSocket hub for the handlers
func (h *Handlers) SetHub(hub HubInterface) {
	h.hub = hub
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
	DisplayName string `json:"displayName" binding:"omitempty,max=50"`
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

	// Generate default display name if not provided
	displayName := req.DisplayName
	if displayName == "" {
		displayName = "Guest_" + guestID[:8]
	}

	user := &models.User{
		ID:          guestID,
		Email:       "guest_" + guestID[:8] + "@crossplay.local",
		DisplayName: displayName,
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

func (h *Handlers) SavePuzzleHistory(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	var req struct {
		PuzzleID  string `json:"puzzleId" binding:"required"`
		SolveTime int    `json:"solveTime" binding:"required"`
		Completed bool   `json:"completed"`
		Accuracy  float64 `json:"accuracy" binding:"required,min=0,max=100"`
		HintsUsed int    `json:"hintsUsed" binding:"min=0"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Verify puzzle exists
	puzzle, err := h.db.GetPuzzleByID(req.PuzzleID)
	if err != nil || puzzle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "puzzle not found"})
		return
	}

	now := time.Now()
	history := &models.PuzzleHistory{
		ID:          uuid.New().String(),
		UserID:      claims.UserID,
		PuzzleID:    req.PuzzleID,
		RoomID:      nil, // Solo play
		SolveTime:   req.SolveTime,
		Completed:   req.Completed,
		Accuracy:    req.Accuracy,
		HintsUsed:   req.HintsUsed,
		CompletedAt: &now,
		CreatedAt:   now,
	}

	if err := h.db.CreatePuzzleHistory(history); err != nil {
		log.Printf("Failed to save puzzle history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save history"})
		return
	}

	// Update user stats after saving history (only if completed)
	if req.Completed {
		h.updateUserStatsAfterSoloPuzzle(claims.UserID, req.PuzzleID, req.SolveTime, req.Accuracy, req.HintsUsed)
	}

	c.JSON(http.StatusCreated, history)
}

// Puzzle Handlers

func (h *Handlers) GetTodayPuzzle(c *gin.Context) {
	ctx := context.Background()
	cacheKey := "puzzle:today:" + time.Now().Format("2006-01-02")

	// Try to get from cache first
	if h.db.Redis != nil {
		cached, err := h.db.Redis.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var puzzle models.Puzzle
			if json.Unmarshal([]byte(cached), &puzzle) == nil {
				c.JSON(http.StatusOK, &puzzle)
				return
			}
		}
	}

	// Cache miss - fetch from database
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

	// Cache for 1 hour
	if h.db.Redis != nil {
		if data, err := json.Marshal(sanitizedPuzzle); err == nil {
			h.db.Redis.Set(ctx, cacheKey, data, time.Hour)
		}
	}

	c.JSON(http.StatusOK, sanitizedPuzzle)
}

func (h *Handlers) GetPuzzleByDate(c *gin.Context) {
	date := c.Param("date")
	ctx := context.Background()
	cacheKey := "puzzle:date:" + date

	// Try to get from cache first
	if h.db.Redis != nil {
		cached, err := h.db.Redis.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var puzzle models.Puzzle
			if json.Unmarshal([]byte(cached), &puzzle) == nil {
				c.JSON(http.StatusOK, &puzzle)
				return
			}
		}
	}

	// Cache miss - fetch from database
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

	// Cache for 24 hours (puzzles don't change)
	if h.db.Redis != nil {
		if data, err := json.Marshal(sanitizedPuzzle); err == nil {
			h.db.Redis.Set(ctx, cacheKey, data, 24*time.Hour)
		}
	}

	c.JSON(http.StatusOK, sanitizedPuzzle)
}

// PuzzleArchiveResponse is the paginated response for the archive endpoint
type PuzzleArchiveResponse struct {
	Puzzles []models.PuzzleMetadata `json:"puzzles"`
	Total   int                     `json:"total"`
	Page    int                     `json:"page"`
	Limit   int                     `json:"limit"`
}

func (h *Handlers) GetPuzzleArchive(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	difficulty := c.Query("difficulty") // Optional difficulty filter

	// Support both 'page' (1-indexed) and 'offset' parameters
	// Frontend sends 'page', calculate offset from it
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	// Also support direct offset for backwards compatibility
	if offsetParam := c.Query("offset"); offsetParam != "" {
		offset, _ = strconv.Atoi(offsetParam)
		page = (offset / limit) + 1
	}

	// Get total count for pagination
	total, err := h.db.GetPuzzleArchiveCount(difficulty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Get puzzles with difficulty filter and sorted by date
	puzzles, err := h.db.GetPuzzleArchiveEnhanced(difficulty, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Get user ID if authenticated (optional)
	var userID string
	claims := middleware.GetAuthUser(c)
	if claims != nil {
		userID = claims.UserID
	}

	// Convert to metadata-only response
	metadata := make([]models.PuzzleMetadata, 0, len(puzzles))
	for _, p := range puzzles {
		meta := models.PuzzleMetadata{
			ID:           p.ID,
			Date:         p.Date,
			Title:        p.Title,
			Author:       p.Author,
			Difficulty:   p.Difficulty,
			GridWidth:    p.GridWidth,
			GridHeight:   p.GridHeight,
			Theme:        p.Theme,
			AvgSolveTime: p.AvgSolveTime,
			CreatedAt:    p.CreatedAt,
			PublishedAt:  p.PublishedAt,
		}

		// Add completion status for logged-in users
		if userID != "" {
			completed, err := h.db.GetUserPuzzleCompletion(userID, p.ID)
			if err == nil {
				meta.IsCompleted = &completed
			}
		}

		metadata = append(metadata, meta)
	}

	c.JSON(http.StatusOK, PuzzleArchiveResponse{
		Puzzles: metadata,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

func (h *Handlers) GetRandomPuzzle(c *gin.Context) {
	difficulty := c.Query("difficulty")

	// Get user ID if authenticated (optional)
	var userID string
	claims := middleware.GetAuthUser(c)
	if claims != nil {
		userID = claims.UserID
	}

	// Use user-aware random puzzle selection
	puzzle, err := h.db.GetRandomPuzzleForUser(userID, difficulty)
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
		log.Printf("CreateRoom: Failed to get puzzle %s: %v", req.PuzzleID, err)
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
		log.Printf("CreateRoom: Failed to create room: %v", err)
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

type JoinRoomByCodeRequest struct {
	Code        string `json:"code" binding:"required,len=6"`
	DisplayName string `json:"displayName"`
	IsSpectator bool   `json:"isSpectator"`
}

func (h *Handlers) JoinRoomByCode(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	var req JoinRoomByCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: code must be exactly 6 characters"})
		return
	}

	// Normalize code to uppercase for case-insensitive matching
	code := strings.ToUpper(req.Code)

	// Get room by code
	room, err := h.db.GetRoomByCode(code)
	if err != nil {
		log.Printf("JoinRoomByCode: Database error getting room: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	// Validate room is joinable
	if room.State == models.RoomStateCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot join completed game"})
		return
	}

	// Get current players
	players, err := h.db.GetRoomPlayers(room.ID)
	if err != nil {
		log.Printf("JoinRoomByCode: Database error getting players: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Check if room is full (only for non-spectators)
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

	// Set display name
	displayName := req.DisplayName
	if displayName == "" {
		displayName = claims.DisplayName
	}

	// Add player to room
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
		log.Printf("JoinRoomByCode: Failed to add player: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join room"})
		return
	}

	// Get puzzle for response
	puzzle, err := h.db.GetPuzzleByID(room.PuzzleID)
	if err != nil || puzzle == nil {
		log.Printf("JoinRoomByCode: Failed to get puzzle: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load puzzle"})
		return
	}
	sanitizedPuzzle := sanitizePuzzleForClient(puzzle)

	// Get grid state
	gridState, err := h.db.GetGridState(room.ID)
	if err != nil {
		log.Printf("JoinRoomByCode: Failed to get grid state: %v", err)
	}

	// Get all current players for response
	allPlayers, err := h.db.GetRoomPlayers(room.ID)
	if err != nil {
		log.Printf("JoinRoomByCode: Failed to get all players: %v", err)
		allPlayers = []models.Player{*player}
	}

	c.JSON(http.StatusOK, gin.H{
		"room":      room,
		"player":    player,
		"players":   allPlayers,
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

	// Broadcast game started event via WebSocket
	if h.hub != nil {
		h.hub.BroadcastToRoom(room.ID, "", "game_started", nil)
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

func (h *Handlers) SetPlayerReady(c *gin.Context) {
	claims := middleware.GetAuthUser(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	roomID := c.Param("id")

	var req struct {
		Ready bool `json:"ready"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Verify player is in the room
	players, err := h.db.GetRoomPlayers(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	playerInRoom := false
	for _, p := range players {
		if p.UserID == claims.UserID {
			playerInRoom = true
			break
		}
	}

	if !playerInRoom {
		c.JSON(http.StatusForbidden, gin.H{"error": "not in room"})
		return
	}

	if err := h.db.UpdatePlayerReady(claims.UserID, roomID, req.Ready); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update ready status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ready": req.Ready})
}

// Helper functions

// updateUserStatsAfterSoloPuzzle updates user stats after completing a solo puzzle
func (h *Handlers) updateUserStatsAfterSoloPuzzle(userID, puzzleID string, solveTime int, accuracy float64, hintsUsed int) {
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
	now := time.Now()
	stats.LastPlayedAt = &now

	// Save updated stats
	if err := h.db.UpdateUserStats(stats); err != nil {
		log.Printf("Error updating user stats for %s: %v", userID, err)
	}
}

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
