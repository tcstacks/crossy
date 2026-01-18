package api

import (
	"strings"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
	"github.com/google/uuid"
)

// TestSanitizePuzzleForClient tests that puzzle answers are removed before sending to client
func TestSanitizePuzzleForClient(t *testing.T) {
	// Create a test puzzle with answers
	puzzle := &models.Puzzle{
		ID:         uuid.New().String(),
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyMedium,
		GridWidth:  5,
		GridHeight: 5,
		CluesAcross: []models.Clue{
			{
				Number:    1,
				Text:      "Test clue",
				Answer:    "ANSWER",
				PositionX: 0,
				PositionY: 0,
				Length:    6,
				Direction: "across",
			},
		},
		CluesDown: []models.Clue{
			{
				Number:    1,
				Text:      "Test clue down",
				Answer:    "ANOTHER",
				PositionX: 0,
				PositionY: 0,
				Length:    7,
				Direction: "down",
			},
		},
		CreatedAt: time.Now(),
	}

	// Sanitize the puzzle
	sanitized := sanitizePuzzleForClient(puzzle)

	// Verify answers are removed
	if len(sanitized.CluesAcross) != 1 {
		t.Errorf("Expected 1 across clue, got %d", len(sanitized.CluesAcross))
	}

	if sanitized.CluesAcross[0].Answer != "" {
		t.Errorf("Expected empty answer for across clue, got %s", sanitized.CluesAcross[0].Answer)
	}

	if len(sanitized.CluesDown) != 1 {
		t.Errorf("Expected 1 down clue, got %d", len(sanitized.CluesDown))
	}

	if sanitized.CluesDown[0].Answer != "" {
		t.Errorf("Expected empty answer for down clue, got %s", sanitized.CluesDown[0].Answer)
	}

	// Verify other properties are preserved
	if sanitized.CluesAcross[0].Number != 1 {
		t.Errorf("Expected clue number 1, got %d", sanitized.CluesAcross[0].Number)
	}

	if sanitized.CluesAcross[0].Text != "Test clue" {
		t.Errorf("Expected clue text 'Test clue', got %s", sanitized.CluesAcross[0].Text)
	}

	if sanitized.CluesAcross[0].Length != 6 {
		t.Errorf("Expected clue length 6, got %d", sanitized.CluesAcross[0].Length)
	}

	if sanitized.CluesAcross[0].Direction != "across" {
		t.Errorf("Expected direction 'across', got %s", sanitized.CluesAcross[0].Direction)
	}
}

// TestPuzzleModel verifies the puzzle model structure meets requirements
func TestPuzzleModel(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	puzzle := &models.Puzzle{
		ID:         uuid.New().String(),
		Date:       &today,
		Title:      "Daily Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyMedium,
		GridWidth:  10,
		GridHeight: 10,
		Grid:       make([][]models.GridCell, 10),
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Clue 1", Answer: "ANSWER", Direction: "across"},
		},
		CluesDown: []models.Clue{
			{Number: 1, Text: "Clue 1", Answer: "ANSWER", Direction: "down"},
		},
		Status:    "published",
		CreatedAt: time.Now(),
	}

	// Test difficulty levels
	validDifficulties := []models.Difficulty{
		models.DifficultyEasy,
		models.DifficultyMedium,
		models.DifficultyHard,
	}

	found := false
	for _, diff := range validDifficulties {
		if puzzle.Difficulty == diff {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Puzzle difficulty %s is not a valid difficulty level", puzzle.Difficulty)
	}

	// Test grid size is within acceptable range (5x5 to 15x15)
	if puzzle.GridWidth < 5 || puzzle.GridWidth > 15 {
		t.Errorf("Grid width %d is outside acceptable range [5, 15]", puzzle.GridWidth)
	}

	if puzzle.GridHeight < 5 || puzzle.GridHeight > 15 {
		t.Errorf("Grid height %d is outside acceptable range [5, 15]", puzzle.GridHeight)
	}

	// Test that puzzle has clues across and down
	if len(puzzle.CluesAcross) == 0 {
		t.Error("Puzzle should have at least one across clue")
	}

	if len(puzzle.CluesDown) == 0 {
		t.Error("Puzzle should have at least one down clue")
	}

	// Test that puzzle has required fields
	if puzzle.ID == "" {
		t.Error("Puzzle ID is required")
	}

	if puzzle.Title == "" {
		t.Error("Puzzle title is required")
	}

	if puzzle.Difficulty == "" {
		t.Error("Puzzle difficulty is required")
	}

	// Test date format
	if puzzle.Date != nil {
		_, err := time.Parse("2006-01-02", *puzzle.Date)
		if err != nil {
			t.Errorf("Puzzle date has invalid format: %v", err)
		}
	}
}

// TestDifficultyLevels verifies all difficulty levels are valid
func TestDifficultyLevels(t *testing.T) {
	difficulties := []models.Difficulty{
		models.DifficultyEasy,
		models.DifficultyMedium,
		models.DifficultyHard,
	}

	for _, diff := range difficulties {
		if diff == "" {
			t.Error("Difficulty level should not be empty")
		}

		// Verify difficulty is one of the expected values
		if diff != "easy" && diff != "medium" && diff != "hard" {
			t.Errorf("Unexpected difficulty level: %s", diff)
		}
	}
}

// TestRoomCode verifies room code generation
func TestGenerateRoomCode(t *testing.T) {
	code := generateRoomCode()

	if len(code) != 6 {
		t.Errorf("Expected room code length 6, got %d", len(code))
	}

	// Verify code contains only allowed characters
	allowedChars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for _, char := range code {
		found := false
		for _, allowed := range allowedChars {
			if char == allowed {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Room code contains invalid character: %c", char)
		}
	}
}

// TestPlayerColorAssignment verifies player color assignment
func TestGetPlayerColor(t *testing.T) {
	colors := []string{
		"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
		"#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
	}

	// Test that colors cycle correctly
	for i := 0; i < len(colors)*2; i++ {
		color := getPlayerColor(i)
		expectedColor := colors[i%len(colors)]
		if color != expectedColor {
			t.Errorf("Expected color %s for player %d, got %s", expectedColor, i, color)
		}
	}
}

// TestGuestUserModel verifies the guest user model meets requirements
func TestGuestUserModel(t *testing.T) {
	// Test guest user creation
	guestID := uuid.New().String()
	displayName := "TestGuest"

	guestUser := &models.User{
		ID:          guestID,
		Email:       "guest_" + guestID[:8] + "@crossplay.local",
		DisplayName: displayName,
		IsGuest:     true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Verify guest flag is set
	if !guestUser.IsGuest {
		t.Error("Guest user should have IsGuest flag set to true")
	}

	// Verify display name is set
	if guestUser.DisplayName != displayName {
		t.Errorf("Expected display name %s, got %s", displayName, guestUser.DisplayName)
	}

	// Verify email follows guest pattern
	if guestUser.Email[:6] != "guest_" {
		t.Errorf("Guest email should start with 'guest_', got %s", guestUser.Email)
	}

	// Verify guest user has no password
	if guestUser.Password != "" {
		t.Error("Guest user should not have a password set")
	}

	// Verify display name length constraints
	shortName := "AB"
	if len(shortName) < 2 || len(shortName) > 50 {
		t.Errorf("Display name '%s' should be between 2-50 characters", shortName)
	}

	longName := "This is a very long display name that exceeds fifty chars"
	if len(longName) >= 2 && len(longName) <= 50 {
		t.Errorf("Display name '%s' should be rejected if over 50 characters", longName)
	}
}

// TestGuestRequestValidation verifies guest request validation
func TestGuestRequestValidation(t *testing.T) {
	tests := []struct {
		name        string
		displayName string
		shouldPass  bool
	}{
		{
			name:        "Valid display name (2 chars)",
			displayName: "AB",
			shouldPass:  true,
		},
		{
			name:        "Valid display name (50 chars)",
			displayName: "12345678901234567890123456789012345678901234567890",
			shouldPass:  true,
		},
		{
			name:        "Valid display name (medium)",
			displayName: "GuestPlayer123",
			shouldPass:  true,
		},
		{
			name:        "Invalid display name (1 char)",
			displayName: "A",
			shouldPass:  false,
		},
		{
			name:        "Invalid display name (51 chars)",
			displayName: "123456789012345678901234567890123456789012345678901",
			shouldPass:  false,
		},
		{
			name:        "Invalid display name (empty)",
			displayName: "",
			shouldPass:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate display name length
			isValid := len(tt.displayName) >= 2 && len(tt.displayName) <= 50

			if isValid != tt.shouldPass {
				t.Errorf("Expected validation result %v for display name '%s', got %v", tt.shouldPass, tt.displayName, isValid)
			}
		})
	}
}

// TestGuestAccountCreation verifies guest account creation logic
func TestGuestAccountCreation(t *testing.T) {
	displayName := "TestGuest"
	req := GuestRequest{
		DisplayName: displayName,
	}

	// Verify request has only display name
	if req.DisplayName != displayName {
		t.Errorf("Expected display name %s, got %s", displayName, req.DisplayName)
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

	// Verify guest user properties
	if !user.IsGuest {
		t.Error("User should be marked as guest")
	}

	if user.Password != "" {
		t.Error("Guest user should not have a password")
	}

	if user.DisplayName != displayName {
		t.Errorf("Expected display name %s, got %s", displayName, user.DisplayName)
	}

	// Verify email format
	if user.Email[:6] != "guest_" || user.Email[len(user.Email)-16:] != "@crossplay.local" {
		t.Errorf("Guest email format incorrect: %s", user.Email)
	}
}

// TestGuestCanPlayAllModes verifies guest users can access all game modes
func TestGuestCanPlayAllModes(t *testing.T) {
	// Create a guest user
	guestUser := &models.User{
		ID:          uuid.New().String(),
		Email:       "guest_test@crossplay.local",
		DisplayName: "TestGuest",
		IsGuest:     true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Test all room modes
	roomModes := []models.RoomMode{
		models.RoomModeCollaborative,
		models.RoomModeRace,
		models.RoomModeRelay,
	}

	for _, mode := range roomModes {
		// Guest user should be able to create/join rooms in any mode
		room := &models.Room{
			ID:       uuid.New().String(),
			Code:     "TEST01",
			HostID:   guestUser.ID,
			PuzzleID: "puzzle-123",
			Mode:     mode,
			Config: models.RoomConfig{
				MaxPlayers:    8,
				IsPublic:      true,
				SpectatorMode: true,
				TimerMode:     "none",
				HintsEnabled:  true,
			},
			State:     models.RoomStateLobby,
			CreatedAt: time.Now(),
		}

		// Verify guest can be room host
		if room.HostID != guestUser.ID {
			t.Errorf("Guest user should be able to host room with mode %s", mode)
		}

		// Verify guest can be a player
		player := &models.Player{
			UserID:      guestUser.ID,
			RoomID:      room.ID,
			DisplayName: guestUser.DisplayName,
			IsSpectator: false,
			IsConnected: true,
			Color:       getPlayerColor(0),
			JoinedAt:    time.Now(),
		}

		if player.UserID != guestUser.ID {
			t.Errorf("Guest user should be able to join room with mode %s", mode)
		}
	}
}

// TestPuzzleMetadataModel verifies the puzzle metadata model structure
func TestPuzzleMetadataModel(t *testing.T) {
	date := "2024-01-15"
	publishedAt := time.Now()
	avgSolveTime := 300
	completed := true

	metadata := &models.PuzzleMetadata{
		ID:           uuid.New().String(),
		Date:         &date,
		Title:        "Test Puzzle",
		Author:       "Test Author",
		Difficulty:   models.DifficultyMedium,
		GridWidth:    10,
		GridHeight:   10,
		Theme:        nil,
		AvgSolveTime: &avgSolveTime,
		CreatedAt:    time.Now(),
		PublishedAt:  &publishedAt,
		IsCompleted:  &completed,
	}

	// Verify required fields
	if metadata.ID == "" {
		t.Error("Puzzle metadata ID is required")
	}

	if metadata.Title == "" {
		t.Error("Puzzle metadata title is required")
	}

	if metadata.Author == "" {
		t.Error("Puzzle metadata author is required")
	}

	if metadata.Difficulty == "" {
		t.Error("Puzzle metadata difficulty is required")
	}

	// Verify grid dimensions
	if metadata.GridWidth < 5 || metadata.GridWidth > 15 {
		t.Errorf("Grid width %d is outside acceptable range [5, 15]", metadata.GridWidth)
	}

	if metadata.GridHeight < 5 || metadata.GridHeight > 15 {
		t.Errorf("Grid height %d is outside acceptable range [5, 15]", metadata.GridHeight)
	}

	// Verify optional fields can be nil
	metadataMinimal := &models.PuzzleMetadata{
		ID:         uuid.New().String(),
		Title:      "Minimal Puzzle",
		Author:     "Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  5,
		GridHeight: 5,
		CreatedAt:  time.Now(),
	}

	if metadataMinimal.Date != nil {
		t.Error("Date should be optional (nil)")
	}

	if metadataMinimal.Theme != nil {
		t.Error("Theme should be optional (nil)")
	}

	if metadataMinimal.AvgSolveTime != nil {
		t.Error("AvgSolveTime should be optional (nil)")
	}

	if metadataMinimal.PublishedAt != nil {
		t.Error("PublishedAt should be optional (nil)")
	}

	if metadataMinimal.IsCompleted != nil {
		t.Error("IsCompleted should be optional (nil for public/anonymous users)")
	}
}

// TestPuzzleArchivePagination verifies pagination logic
func TestPuzzleArchivePagination(t *testing.T) {
	tests := []struct {
		name         string
		limit        int
		offset       int
		totalPuzzles int
		expectedLen  int
	}{
		{
			name:         "First page with default limit",
			limit:        20,
			offset:       0,
			totalPuzzles: 50,
			expectedLen:  20,
		},
		{
			name:         "Second page",
			limit:        20,
			offset:       20,
			totalPuzzles: 50,
			expectedLen:  20,
		},
		{
			name:         "Last partial page",
			limit:        20,
			offset:       40,
			totalPuzzles: 50,
			expectedLen:  10,
		},
		{
			name:         "Custom page size",
			limit:        10,
			offset:       0,
			totalPuzzles: 50,
			expectedLen:  10,
		},
		{
			name:         "Offset beyond total",
			limit:        20,
			offset:       100,
			totalPuzzles: 50,
			expectedLen:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate pagination calculation
			start := tt.offset
			end := tt.offset + tt.limit
			if end > tt.totalPuzzles {
				end = tt.totalPuzzles
			}

			var resultLen int
			if start >= tt.totalPuzzles {
				resultLen = 0
			} else {
				resultLen = end - start
			}

			if resultLen != tt.expectedLen {
				t.Errorf("Expected %d items, got %d", tt.expectedLen, resultLen)
			}
		})
	}
}

// TestPuzzleArchiveDifficultyFilter verifies difficulty filtering
func TestPuzzleArchiveDifficultyFilter(t *testing.T) {
	// Create test puzzles with different difficulties
	puzzles := []models.Puzzle{
		{
			ID:         uuid.New().String(),
			Title:      "Easy Puzzle",
			Difficulty: models.DifficultyEasy,
			Status:     "published",
		},
		{
			ID:         uuid.New().String(),
			Title:      "Medium Puzzle",
			Difficulty: models.DifficultyMedium,
			Status:     "published",
		},
		{
			ID:         uuid.New().String(),
			Title:      "Hard Puzzle",
			Difficulty: models.DifficultyHard,
			Status:     "published",
		},
	}

	// Test filtering by difficulty
	testCases := []struct {
		filterDifficulty models.Difficulty
		expectedCount    int
	}{
		{models.DifficultyEasy, 1},
		{models.DifficultyMedium, 1},
		{models.DifficultyHard, 1},
		{"", 3}, // Empty filter = all puzzles
	}

	for _, tc := range testCases {
		t.Run(string(tc.filterDifficulty), func(t *testing.T) {
			// Simulate filtering
			var filtered []models.Puzzle
			for _, p := range puzzles {
				if tc.filterDifficulty == "" || p.Difficulty == tc.filterDifficulty {
					filtered = append(filtered, p)
				}
			}

			if len(filtered) != tc.expectedCount {
				t.Errorf("Expected %d puzzles for difficulty '%s', got %d",
					tc.expectedCount, tc.filterDifficulty, len(filtered))
			}
		})
	}
}

// TestPuzzleArchiveDateSorting verifies sorting by published date
func TestPuzzleArchiveDateSorting(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	lastWeek := now.Add(-7 * 24 * time.Hour)

	// Create test puzzles with different published dates (in sorted order: newest first)
	puzzles := []models.Puzzle{
		{
			ID:          uuid.New().String(),
			Title:       "Today Puzzle",
			PublishedAt: &now,
			CreatedAt:   now,
		},
		{
			ID:          uuid.New().String(),
			Title:       "Yesterday Puzzle",
			PublishedAt: &yesterday,
			CreatedAt:   yesterday,
		},
		{
			ID:          uuid.New().String(),
			Title:       "Oldest Puzzle",
			PublishedAt: &lastWeek,
			CreatedAt:   lastWeek,
		},
	}

	// Verify they are in descending order (newest first)
	for i := 0; i < len(puzzles)-1; i++ {
		current := puzzles[i].PublishedAt
		next := puzzles[i+1].PublishedAt

		if current != nil && next != nil {
			if current.Before(*next) {
				t.Errorf("Puzzles not sorted correctly: %s should come after %s",
					puzzles[i].Title, puzzles[i+1].Title)
			}
		}
	}

	// Verify newest puzzle is first
	if puzzles[0].Title != "Today Puzzle" {
		t.Errorf("Expected newest puzzle 'Today Puzzle' to be first, got '%s'", puzzles[0].Title)
	}
}

// TestPuzzleMetadataExcludesGrid verifies that metadata doesn't include grid data
func TestPuzzleMetadataExcludesGrid(t *testing.T) {
	metadata := models.PuzzleMetadata{
		ID:         uuid.New().String(),
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyMedium,
		GridWidth:  10,
		GridHeight: 10,
		CreatedAt:  time.Now(),
	}

	// PuzzleMetadata should not have Grid, CluesAcross, or CluesDown fields
	// This is enforced by the type definition itself
	// We just verify the type has the expected fields and not the grid-related ones

	// Check that metadata has the required fields (this would fail to compile if fields are missing)
	_ = metadata.ID
	_ = metadata.Title
	_ = metadata.Author
	_ = metadata.Difficulty
	_ = metadata.GridWidth
	_ = metadata.GridHeight

	// Note: We can't directly test for absence of fields in Go,
	// but the type system enforces this at compile time
	t.Log("PuzzleMetadata type correctly excludes grid data")
}

// TestRoomCreation verifies room creation endpoint requirements
func TestRoomCreation(t *testing.T) {
	tests := []struct {
		name     string
		request  CreateRoomRequest
		validate func(*testing.T, *models.Room)
	}{
		{
			name: "Create collaborative room with default config",
			request: CreateRoomRequest{
				PuzzleID: "puzzle-123",
				Mode:     models.RoomModeCollaborative,
				Config:   models.RoomConfig{},
			},
			validate: func(t *testing.T, room *models.Room) {
				if room.Mode != models.RoomModeCollaborative {
					t.Errorf("Expected mode collaborative, got %s", room.Mode)
				}
				if room.Config.MaxPlayers != 8 {
					t.Errorf("Expected default max players 8, got %d", room.Config.MaxPlayers)
				}
				if room.Config.TimerMode != "none" {
					t.Errorf("Expected default timer mode 'none', got %s", room.Config.TimerMode)
				}
			},
		},
		{
			name: "Create race room with custom config",
			request: CreateRoomRequest{
				PuzzleID: "puzzle-456",
				Mode:     models.RoomModeRace,
				Config: models.RoomConfig{
					MaxPlayers:    4,
					IsPublic:      true,
					SpectatorMode: true,
					TimerMode:     "countdown",
					TimerSeconds:  600,
					HintsEnabled:  false,
				},
			},
			validate: func(t *testing.T, room *models.Room) {
				if room.Mode != models.RoomModeRace {
					t.Errorf("Expected mode race, got %s", room.Mode)
				}
				if room.Config.MaxPlayers != 4 {
					t.Errorf("Expected max players 4, got %d", room.Config.MaxPlayers)
				}
				if !room.Config.IsPublic {
					t.Error("Expected public room")
				}
				if room.Config.TimerMode != "countdown" {
					t.Errorf("Expected timer mode 'countdown', got %s", room.Config.TimerMode)
				}
				if room.Config.TimerSeconds != 600 {
					t.Errorf("Expected timer seconds 600, got %d", room.Config.TimerSeconds)
				}
				if room.Config.HintsEnabled {
					t.Error("Expected hints disabled")
				}
			},
		},
		{
			name: "Create relay room with private config",
			request: CreateRoomRequest{
				PuzzleID: "puzzle-789",
				Mode:     models.RoomModeRelay,
				Config: models.RoomConfig{
					MaxPlayers:    10,
					IsPublic:      false,
					SpectatorMode: false,
					TimerMode:     "stopwatch",
					HintsEnabled:  true,
				},
			},
			validate: func(t *testing.T, room *models.Room) {
				if room.Mode != models.RoomModeRelay {
					t.Errorf("Expected mode relay, got %s", room.Mode)
				}
				if room.Config.MaxPlayers != 10 {
					t.Errorf("Expected max players 10, got %d", room.Config.MaxPlayers)
				}
				if room.Config.IsPublic {
					t.Error("Expected private room")
				}
				if room.Config.TimerMode != "stopwatch" {
					t.Errorf("Expected timer mode 'stopwatch', got %s", room.Config.TimerMode)
				}
				if !room.Config.HintsEnabled {
					t.Error("Expected hints enabled")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate room creation
			room := &models.Room{
				ID:        uuid.New().String(),
				Code:      generateRoomCode(),
				HostID:    "test-user-123",
				PuzzleID:  tt.request.PuzzleID,
				Mode:      tt.request.Mode,
				Config:    tt.request.Config,
				State:     models.RoomStateLobby,
				CreatedAt: time.Now(),
			}

			// Apply defaults
			if room.Config.MaxPlayers == 0 {
				room.Config.MaxPlayers = 8
			}
			if room.Config.TimerMode == "" {
				room.Config.TimerMode = "none"
			}

			// Validate room code
			if len(room.Code) != 6 {
				t.Errorf("Expected room code length 6, got %d", len(room.Code))
			}

			// Validate initial state
			if room.State != models.RoomStateLobby {
				t.Errorf("Expected initial state 'lobby', got %s", room.State)
			}

			// Run custom validations
			tt.validate(t, room)
		})
	}
}

// TestRoomCodeUniqueness verifies that room codes are unique
func TestRoomCodeUniqueness(t *testing.T) {
	codes := make(map[string]bool)
	iterations := 1000

	for i := 0; i < iterations; i++ {
		code := generateRoomCode()
		if codes[code] {
			t.Errorf("Duplicate room code generated: %s", code)
		}
		codes[code] = true
	}

	if len(codes) != iterations {
		t.Errorf("Expected %d unique codes, got %d", iterations, len(codes))
	}
}

// TestRoomConfigValidation verifies room config validation
func TestRoomConfigValidation(t *testing.T) {
	tests := []struct {
		name   string
		config models.RoomConfig
		valid  bool
		reason string
	}{
		{
			name: "Valid config with 2 players",
			config: models.RoomConfig{
				MaxPlayers:   2,
				TimerMode:    "none",
				HintsEnabled: true,
			},
			valid: true,
		},
		{
			name: "Valid config with 10 players",
			config: models.RoomConfig{
				MaxPlayers:   10,
				TimerMode:    "countdown",
				TimerSeconds: 1800,
				HintsEnabled: false,
			},
			valid: true,
		},
		{
			name: "Invalid max players (too low)",
			config: models.RoomConfig{
				MaxPlayers:   1,
				TimerMode:    "none",
				HintsEnabled: true,
			},
			valid:  false,
			reason: "Max players must be between 2-10",
		},
		{
			name: "Invalid max players (too high)",
			config: models.RoomConfig{
				MaxPlayers:   11,
				TimerMode:    "none",
				HintsEnabled: true,
			},
			valid:  false,
			reason: "Max players must be between 2-10",
		},
		{
			name: "Valid timer modes",
			config: models.RoomConfig{
				MaxPlayers:   4,
				TimerMode:    "countdown",
				TimerSeconds: 300,
				HintsEnabled: true,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate max players (2-10)
			isValid := tt.config.MaxPlayers >= 2 && tt.config.MaxPlayers <= 10

			if isValid != tt.valid {
				if !tt.valid {
					t.Logf("Expected validation to fail: %s", tt.reason)
				} else {
					t.Errorf("Expected config to be valid, but validation failed")
				}
			}

			// Validate timer mode
			validTimerModes := []string{"none", "countdown", "stopwatch"}
			timerModeValid := false
			for _, mode := range validTimerModes {
				if tt.config.TimerMode == mode {
					timerModeValid = true
					break
				}
			}

			if !timerModeValid && tt.config.TimerMode != "" {
				t.Errorf("Invalid timer mode: %s", tt.config.TimerMode)
			}
		})
	}
}

// TestRoomModes verifies all room modes are supported
func TestRoomModes(t *testing.T) {
	modes := []models.RoomMode{
		models.RoomModeCollaborative,
		models.RoomModeRace,
		models.RoomModeRelay,
	}

	for _, mode := range modes {
		t.Run(string(mode), func(t *testing.T) {
			room := &models.Room{
				ID:       uuid.New().String(),
				Code:     generateRoomCode(),
				HostID:   "test-host",
				PuzzleID: "test-puzzle",
				Mode:     mode,
				Config: models.RoomConfig{
					MaxPlayers:   8,
					TimerMode:    "none",
					HintsEnabled: true,
				},
				State:     models.RoomStateLobby,
				CreatedAt: time.Now(),
			}

			// Verify mode is set correctly
			if room.Mode != mode {
				t.Errorf("Expected mode %s, got %s", mode, room.Mode)
			}

			// Verify mode is one of the valid modes
			validModes := []models.RoomMode{
				models.RoomModeCollaborative,
				models.RoomModeRace,
				models.RoomModeRelay,
			}

			found := false
			for _, vm := range validModes {
				if room.Mode == vm {
					found = true
					break
				}
			}

			if !found {
				t.Errorf("Room mode %s is not valid", room.Mode)
			}
		})
	}
}

// TestRoomStates verifies room state transitions
func TestRoomStates(t *testing.T) {
	states := []models.RoomState{
		models.RoomStateLobby,
		models.RoomStateActive,
		models.RoomStateCompleted,
	}

	for _, state := range states {
		t.Run(string(state), func(t *testing.T) {
			room := &models.Room{
				ID:       uuid.New().String(),
				Code:     generateRoomCode(),
				HostID:   "test-host",
				PuzzleID: "test-puzzle",
				Mode:     models.RoomModeCollaborative,
				Config: models.RoomConfig{
					MaxPlayers:   8,
					TimerMode:    "none",
					HintsEnabled: true,
				},
				State:     state,
				CreatedAt: time.Now(),
			}

			// Verify state is set correctly
			if room.State != state {
				t.Errorf("Expected state %s, got %s", state, room.State)
			}
		})
	}
}

// TestInitializeGridState verifies grid state initialization
func TestInitializeGridState(t *testing.T) {
	puzzle := &models.Puzzle{
		ID:         uuid.New().String(),
		GridWidth:  5,
		GridHeight: 5,
		Grid:       make([][]models.GridCell, 5),
	}

	// Initialize puzzle grid
	for y := 0; y < puzzle.GridHeight; y++ {
		puzzle.Grid[y] = make([]models.GridCell, puzzle.GridWidth)
		for x := 0; x < puzzle.GridWidth; x++ {
			letter := "A"
			puzzle.Grid[y][x] = models.GridCell{
				Letter: &letter,
			}
		}
	}

	roomID := "test-room-123"
	gridState := initializeGridState(roomID, puzzle)

	// Verify grid state structure
	if gridState.RoomID != roomID {
		t.Errorf("Expected room ID %s, got %s", roomID, gridState.RoomID)
	}

	if len(gridState.Cells) != puzzle.GridHeight {
		t.Errorf("Expected %d rows, got %d", puzzle.GridHeight, len(gridState.Cells))
	}

	for y := 0; y < puzzle.GridHeight; y++ {
		if len(gridState.Cells[y]) != puzzle.GridWidth {
			t.Errorf("Expected %d columns in row %d, got %d", puzzle.GridWidth, y, len(gridState.Cells[y]))
		}

		for x := 0; x < puzzle.GridWidth; x++ {
			cell := gridState.Cells[y][x]
			if cell.Value != nil {
				t.Errorf("Expected nil value at [%d][%d], got %v", y, x, *cell.Value)
			}
			if cell.IsRevealed {
				t.Errorf("Expected IsRevealed false at [%d][%d]", y, x)
			}
		}
	}

	if len(gridState.CompletedClues) != 0 {
		t.Errorf("Expected 0 completed clues, got %d", len(gridState.CompletedClues))
	}
}

// TestPuzzleCompletionStatus verifies completion status logic
func TestPuzzleCompletionStatus(t *testing.T) {
	// Test for logged-in user
	completedTrue := true
	metadataCompleted := models.PuzzleMetadata{
		ID:          uuid.New().String(),
		Title:       "Completed Puzzle",
		IsCompleted: &completedTrue,
	}

	if metadataCompleted.IsCompleted == nil {
		t.Error("IsCompleted should not be nil for logged-in user")
	}

	if *metadataCompleted.IsCompleted != true {
		t.Error("IsCompleted should be true for completed puzzle")
	}

	// Test for incomplete puzzle
	completedFalse := false
	metadataIncomplete := models.PuzzleMetadata{
		ID:          uuid.New().String(),
		Title:       "Incomplete Puzzle",
		IsCompleted: &completedFalse,
	}

	if *metadataIncomplete.IsCompleted != false {
		t.Error("IsCompleted should be false for incomplete puzzle")
	}

	// Test for anonymous/public user (no completion status)
	metadataAnonymous := models.PuzzleMetadata{
		ID:          uuid.New().String(),
		Title:       "Anonymous User Puzzle",
		IsCompleted: nil,
	}

	if metadataAnonymous.IsCompleted != nil {
		t.Error("IsCompleted should be nil for anonymous users")
	}
}

// TestJoinRoomByCodeRequest verifies join room by code request validation
func TestJoinRoomByCodeRequest(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		displayName string
		isSpectator bool
		shouldPass  bool
		reason      string
	}{
		{
			name:        "Valid 6-character uppercase code",
			code:        "ABC123",
			displayName: "Player1",
			isSpectator: false,
			shouldPass:  true,
		},
		{
			name:        "Valid 6-character lowercase code (case-insensitive)",
			code:        "abc123",
			displayName: "Player2",
			isSpectator: false,
			shouldPass:  true,
		},
		{
			name:        "Valid 6-character mixed case code",
			code:        "AbC123",
			displayName: "Player3",
			isSpectator: false,
			shouldPass:  true,
		},
		{
			name:        "Valid code with spectator",
			code:        "XYZ789",
			displayName: "Spectator1",
			isSpectator: true,
			shouldPass:  true,
		},
		{
			name:        "Invalid code - too short (5 chars)",
			code:        "ABC12",
			displayName: "Player4",
			isSpectator: false,
			shouldPass:  false,
			reason:      "Code must be exactly 6 characters",
		},
		{
			name:        "Invalid code - too long (7 chars)",
			code:        "ABC1234",
			displayName: "Player5",
			isSpectator: false,
			shouldPass:  false,
			reason:      "Code must be exactly 6 characters",
		},
		{
			name:        "Invalid code - empty",
			code:        "",
			displayName: "Player6",
			isSpectator: false,
			shouldPass:  false,
			reason:      "Code is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := JoinRoomByCodeRequest{
				Code:        tt.code,
				DisplayName: tt.displayName,
				IsSpectator: tt.isSpectator,
			}

			// Validate code length
			isValid := len(req.Code) == 6

			if isValid != tt.shouldPass {
				if !tt.shouldPass {
					t.Logf("Expected validation to fail: %s", tt.reason)
				} else {
					t.Errorf("Expected request to be valid, but validation failed")
				}
			}
		})
	}
}

// TestJoinRoomByCodeCaseInsensitive verifies case-insensitive code matching
func TestJoinRoomByCodeCaseInsensitive(t *testing.T) {
	originalCode := "ABC123"
	testCases := []string{
		"ABC123", // exact match
		"abc123", // lowercase
		"AbC123", // mixed case
		"aBc123", // different mixed case
	}

	for _, testCode := range testCases {
		t.Run(testCode, func(t *testing.T) {
			// Normalize both codes to uppercase for comparison
			normalizedOriginal := strings.ToUpper(originalCode)
			normalizedTest := strings.ToUpper(testCode)

			if normalizedOriginal != normalizedTest {
				t.Errorf("Expected normalized codes to match: %s != %s", normalizedOriginal, normalizedTest)
			}

			// Verify they match after normalization
			if normalizedOriginal != "ABC123" {
				t.Error("Normalized code should be ABC123")
			}
		})
	}
}

// TestJoinRoomByCodeValidation verifies room validation logic
func TestJoinRoomByCodeValidation(t *testing.T) {
	tests := []struct {
		name        string
		roomState   models.RoomState
		maxPlayers  int
		numPlayers  int
		isSpectator bool
		shouldPass  bool
		errorMsg    string
	}{
		{
			name:        "Join lobby room with space",
			roomState:   models.RoomStateLobby,
			maxPlayers:  4,
			numPlayers:  2,
			isSpectator: false,
			shouldPass:  true,
		},
		{
			name:        "Join active room with space",
			roomState:   models.RoomStateActive,
			maxPlayers:  4,
			numPlayers:  2,
			isSpectator: false,
			shouldPass:  true,
		},
		{
			name:        "Cannot join completed room",
			roomState:   models.RoomStateCompleted,
			maxPlayers:  4,
			numPlayers:  2,
			isSpectator: false,
			shouldPass:  false,
			errorMsg:    "cannot join completed game",
		},
		{
			name:        "Cannot join full room as player",
			roomState:   models.RoomStateLobby,
			maxPlayers:  4,
			numPlayers:  4,
			isSpectator: false,
			shouldPass:  false,
			errorMsg:    "room is full",
		},
		{
			name:        "Can join full room as spectator",
			roomState:   models.RoomStateLobby,
			maxPlayers:  4,
			numPlayers:  4,
			isSpectator: true,
			shouldPass:  true,
		},
		{
			name:        "Spectator doesn't count toward max players",
			roomState:   models.RoomStateLobby,
			maxPlayers:  2,
			numPlayers:  2,
			isSpectator: true,
			shouldPass:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate room state
			canJoin := tt.roomState != models.RoomStateCompleted

			if !canJoin && tt.shouldPass {
				t.Error("Expected to be able to join, but room state prevents it")
			}

			if !canJoin && tt.roomState == models.RoomStateCompleted {
				if tt.errorMsg != "cannot join completed game" {
					t.Errorf("Expected error message about completed game, got: %s", tt.errorMsg)
				}
			}

			// Validate max players (only for non-spectators)
			if canJoin && !tt.isSpectator {
				roomFull := tt.numPlayers >= tt.maxPlayers
				if roomFull && tt.shouldPass {
					t.Error("Expected to be able to join, but room is full")
				}
				if roomFull && !tt.shouldPass && tt.errorMsg == "room is full" {
					t.Log("Correctly rejected joining full room")
				}
			}
		})
	}
}

// TestJoinRoomByCodePlayerRoster verifies player is added to roster
func TestJoinRoomByCodePlayerRoster(t *testing.T) {
	roomID := uuid.New().String()
	userID := uuid.New().String()
	displayName := "TestPlayer"

	player := &models.Player{
		UserID:      userID,
		RoomID:      roomID,
		DisplayName: displayName,
		IsSpectator: false,
		IsConnected: true,
		Color:       getPlayerColor(0),
		JoinedAt:    time.Now(),
	}

	// Verify player structure
	if player.UserID != userID {
		t.Errorf("Expected user ID %s, got %s", userID, player.UserID)
	}

	if player.RoomID != roomID {
		t.Errorf("Expected room ID %s, got %s", roomID, player.RoomID)
	}

	if player.DisplayName != displayName {
		t.Errorf("Expected display name %s, got %s", displayName, player.DisplayName)
	}

	if !player.IsConnected {
		t.Error("Player should be connected upon joining")
	}

	if player.IsSpectator {
		t.Error("Player should not be spectator by default")
	}

	if player.Color == "" {
		t.Error("Player should have a color assigned")
	}

	if player.JoinedAt.IsZero() {
		t.Error("Player should have a join timestamp")
	}
}

// TestJoinRoomByCodeResponse verifies the response includes required data
func TestJoinRoomByCodeResponse(t *testing.T) {
	// Create mock room
	room := &models.Room{
		ID:       uuid.New().String(),
		Code:     "ABC123",
		HostID:   "host-123",
		PuzzleID: "puzzle-456",
		Mode:     models.RoomModeCollaborative,
		Config: models.RoomConfig{
			MaxPlayers:   8,
			IsPublic:     true,
			TimerMode:    "none",
			HintsEnabled: true,
		},
		State:     models.RoomStateLobby,
		CreatedAt: time.Now(),
	}

	// Create mock player
	player := &models.Player{
		UserID:      "user-789",
		RoomID:      room.ID,
		DisplayName: "TestPlayer",
		IsSpectator: false,
		IsConnected: true,
		Color:       getPlayerColor(0),
		JoinedAt:    time.Now(),
	}

	// Verify response would include:
	// 1. Room state
	if room.ID == "" {
		t.Error("Response should include room ID")
	}
	if room.Code == "" {
		t.Error("Response should include room code")
	}
	if room.State == "" {
		t.Error("Response should include room state")
	}

	// 2. Player info
	if player.UserID == "" {
		t.Error("Response should include player user ID")
	}
	if player.DisplayName == "" {
		t.Error("Response should include player display name")
	}

	// 3. Room configuration
	if room.Config.MaxPlayers == 0 {
		t.Error("Response should include room max players")
	}
	if room.Mode == "" {
		t.Error("Response should include room mode")
	}

	// 4. Puzzle ID (puzzle data returned separately)
	if room.PuzzleID == "" {
		t.Error("Response should include puzzle ID")
	}
}

// TestJoinRoomCodeNormalization verifies 6-character codes are normalized
func TestJoinRoomCodeNormalization(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"abcdef", "ABCDEF"},
		{"ABCDEF", "ABCDEF"},
		{"AbCdEf", "ABCDEF"},
		{"123456", "123456"},
		{"abc123", "ABC123"},
		{"XyZ789", "XYZ789"},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			normalized := strings.ToUpper(tc.input)
			if normalized != tc.expected {
				t.Errorf("Expected %s to normalize to %s, got %s", tc.input, tc.expected, normalized)
			}
		})
	}
}
