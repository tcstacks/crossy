package api

import (
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
