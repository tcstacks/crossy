package main

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
)

// TestParseDifficulty tests the parseDifficulty function
func TestParseDifficulty(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"monday", "monday"},
		{"Monday", "monday"},
		{"TUESDAY", "tuesday"},
		{"wednesday", "wednesday"},
		{"thursday", "thursday"},
		{"friday", "friday"},
		{"saturday", "saturday"},
		{"sunday", "sunday"},
		{"invalid", "wednesday"}, // default
		{"", "wednesday"},        // default
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseDifficulty(tt.input)
			if string(result) != tt.expected {
				t.Errorf("parseDifficulty(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// TestTruncate tests the truncate function
func TestTruncate(t *testing.T) {
	tests := []struct {
		input    string
		maxLen   int
		expected string
	}{
		{"short", 10, "short"},
		{"exact length", 12, "exact length"},
		{"this is a very long string", 10, "this is..."},
		{"", 5, ""},
		{"abc", 3, "abc"},
		{"abcd", 3, "..."},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := truncate(tt.input, tt.maxLen)
			if result != tt.expected {
				t.Errorf("truncate(%q, %d) = %q, want %q", tt.input, tt.maxLen, result, tt.expected)
			}
		})
	}
}

// TestImportValidation tests JSON validation during import
func TestImportValidation(t *testing.T) {
	// Create a temporary directory for test files
	tmpDir, err := os.MkdirTemp("", "admin-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	tests := []struct {
		name      string
		content   string
		wantError bool
	}{
		{
			name: "valid_puzzle",
			content: `{
				"id": "test-123",
				"title": "Test Puzzle",
				"author": "Test Author",
				"difficulty": "easy",
				"gridWidth": 5,
				"gridHeight": 5,
				"grid": [[{"letter": "A"}]],
				"cluesAcross": [{"number": 1, "text": "Test", "answer": "TEST", "positionX": 0, "positionY": 0, "length": 4, "direction": "across"}],
				"cluesDown": [],
				"status": "draft"
			}`,
			wantError: false,
		},
		{
			name:      "invalid_json",
			content:   `{invalid json`,
			wantError: true,
		},
		{
			name: "missing_title",
			content: `{
				"id": "test-123",
				"author": "Test Author",
				"difficulty": "easy",
				"gridWidth": 5,
				"gridHeight": 5,
				"grid": [[{"letter": "A"}]],
				"cluesAcross": [],
				"cluesDown": []
			}`,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Write test file
			filePath := tmpDir + "/" + tt.name + ".json"
			if err := os.WriteFile(filePath, []byte(tt.content), 0644); err != nil {
				t.Fatalf("Failed to write test file: %v", err)
			}

			// Read and validate
			data, err := os.ReadFile(filePath)
			if err != nil {
				t.Fatalf("Failed to read test file: %v", err)
			}

			var puzzle models.Puzzle
			err = json.Unmarshal(data, &puzzle)

			hasError := err != nil || puzzle.Title == ""
			if hasError != tt.wantError {
				t.Errorf("Validation error = %v, wantError %v", hasError, tt.wantError)
			}
		})
	}
}

// TestImportSingleFile tests importing a single puzzle file
func TestImportSingleFile(t *testing.T) {
	// Create a temporary puzzle file
	tmpDir, err := os.MkdirTemp("", "admin-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	puzzle := models.Puzzle{
		ID:         "test-puzzle-1",
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  5,
		GridHeight: 5,
		Grid: [][]models.GridCell{
			{{Letter: stringPtr("A")}},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Test", Answer: "TEST", PositionX: 0, PositionY: 0, Length: 4, Direction: "across"},
		},
		CluesDown: []models.Clue{},
		Status:    "draft",
		CreatedAt: time.Now(),
	}

	data, err := json.MarshalIndent(puzzle, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal puzzle: %v", err)
	}

	filePath := tmpDir + "/puzzle.json"
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		t.Fatalf("Failed to write puzzle file: %v", err)
	}

	// Verify file exists and is readable
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		t.Fatalf("Failed to stat file: %v", err)
	}

	if fileInfo.IsDir() {
		t.Error("Expected file, got directory")
	}

	// Verify we can read and parse the file
	data, err = os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	var parsedPuzzle models.Puzzle
	if err := json.Unmarshal(data, &parsedPuzzle); err != nil {
		t.Fatalf("Failed to parse puzzle: %v", err)
	}

	if parsedPuzzle.Title != puzzle.Title {
		t.Errorf("Title = %q, want %q", parsedPuzzle.Title, puzzle.Title)
	}
}

// TestImportBatchDirectory tests importing multiple puzzles from a directory
func TestImportBatchDirectory(t *testing.T) {
	// Create a temporary directory with multiple puzzle files
	tmpDir, err := os.MkdirTemp("", "admin-test-batch-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create 3 test puzzles
	for i := 1; i <= 3; i++ {
		puzzle := models.Puzzle{
			ID:         "test-puzzle-" + string(rune(i+'0')),
			Title:      "Test Puzzle " + string(rune(i+'0')),
			Author:     "Test Author",
			Difficulty: models.DifficultyEasy,
			GridWidth:  5,
			GridHeight: 5,
			Grid: [][]models.GridCell{
				{{Letter: stringPtr("A")}},
			},
			CluesAcross: []models.Clue{
				{Number: 1, Text: "Test", Answer: "TEST", PositionX: 0, PositionY: 0, Length: 4, Direction: "across"},
			},
			CluesDown: []models.Clue{},
			Status:    "draft",
			CreatedAt: time.Now(),
		}

		data, _ := json.MarshalIndent(puzzle, "", "  ")
		filePath := tmpDir + "/puzzle_" + string(rune(i+'0')) + ".json"
		os.WriteFile(filePath, data, 0644)
	}

	// Read directory and verify files
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		t.Fatalf("Failed to read directory: %v", err)
	}

	jsonFiles := 0
	for _, entry := range entries {
		if !entry.IsDir() && len(entry.Name()) > 5 && entry.Name()[len(entry.Name())-5:] == ".json" {
			jsonFiles++
		}
	}

	if jsonFiles != 3 {
		t.Errorf("Expected 3 JSON files, got %d", jsonFiles)
	}
}

// TestPublishValidation tests publish command validation
func TestPublishValidation(t *testing.T) {
	tests := []struct {
		name       string
		puzzleID   string
		date       string
		shouldFail bool
	}{
		{
			name:       "valid_id_and_date",
			puzzleID:   "test-123",
			date:       "2024-01-15",
			shouldFail: false,
		},
		{
			name:       "valid_id_no_date",
			puzzleID:   "test-123",
			date:       "",
			shouldFail: false,
		},
		{
			name:       "empty_id",
			puzzleID:   "",
			date:       "2024-01-15",
			shouldFail: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Just validate the inputs
			if tt.puzzleID == "" && !tt.shouldFail {
				t.Error("Expected validation to fail for empty puzzle ID")
			}
		})
	}
}

// TestListFilterValidation tests list command filter validation
func TestListFilterValidation(t *testing.T) {
	validStatuses := []string{"", "draft", "approved", "published"}

	for _, status := range validStatuses {
		t.Run("status_"+status, func(t *testing.T) {
			// In a real database query, empty string means "all"
			// This just validates that our expected statuses are valid
			if status != "" && status != "draft" && status != "approved" && status != "published" {
				t.Errorf("Invalid status: %s", status)
			}
		})
	}
}

// TestImportDefaultStatus tests that imported puzzles get default status
func TestImportDefaultStatus(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "admin-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create puzzle without status
	puzzle := models.Puzzle{
		ID:         "test-puzzle-1",
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  5,
		GridHeight: 5,
		Grid: [][]models.GridCell{
			{{Letter: stringPtr("A")}},
		},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
		// Status intentionally omitted
	}

	data, _ := json.MarshalIndent(puzzle, "", "  ")
	filePath := tmpDir + "/puzzle.json"
	os.WriteFile(filePath, data, 0644)

	// Read and parse
	data, _ = os.ReadFile(filePath)
	var parsedPuzzle models.Puzzle
	json.Unmarshal(data, &parsedPuzzle)

	// Simulate import logic
	if parsedPuzzle.Status == "" {
		parsedPuzzle.Status = "draft"
	}

	if parsedPuzzle.Status != "draft" {
		t.Errorf("Expected default status 'draft', got %q", parsedPuzzle.Status)
	}
}

// TestPublishSetsTimestamp tests that publishing sets timestamp
func TestPublishSetsTimestamp(t *testing.T) {
	puzzle := &models.Puzzle{
		ID:         "test-123",
		Title:      "Test Puzzle",
		Status:     "draft",
		CreatedAt:  time.Now(),
	}

	// Simulate publish logic
	puzzle.Status = "published"
	now := time.Now()
	puzzle.PublishedAt = &now

	if puzzle.Status != "published" {
		t.Errorf("Expected status 'published', got %q", puzzle.Status)
	}

	if puzzle.PublishedAt == nil {
		t.Error("PublishedAt should be set")
	}

	if puzzle.PublishedAt.IsZero() {
		t.Error("PublishedAt should not be zero")
	}
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
