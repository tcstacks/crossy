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
