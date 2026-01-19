package puzzle

import (
	"testing"
	"time"

	"github.com/crossplay/backend/pkg/grid"
)

func TestNewPuzzle(t *testing.T) {
	// Create a simple grid
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create clues map
	clues := map[string]string{
		"1-across": "Test clue 1",
		"2-down":   "Test clue 2",
	}

	// Create metadata
	metadata := Metadata{
		ID:         "test-id",
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: grid.Easy,
		Theme:      "Test Theme",
		CreatedAt:  time.Now(),
	}

	// Create puzzle
	puzzle := NewPuzzle(g, clues, metadata)

	// Verify puzzle was created correctly
	if puzzle.Grid != g {
		t.Error("Grid not set correctly")
	}

	if len(puzzle.Clues) != 2 {
		t.Errorf("Expected 2 clues, got %d", len(puzzle.Clues))
	}

	if puzzle.Clues["1-across"] != "Test clue 1" {
		t.Error("Clue 1-across not set correctly")
	}

	if puzzle.Metadata.ID != "test-id" {
		t.Error("Metadata ID not set correctly")
	}

	if puzzle.Metadata.Title != "Test Puzzle" {
		t.Error("Metadata Title not set correctly")
	}
}

func TestMetadata(t *testing.T) {
	now := time.Now()

	metadata := Metadata{
		ID:         "unique-id-123",
		Title:      "Daily Crossword",
		Author:     "John Doe",
		Difficulty: grid.Medium,
		Theme:      "Geography",
		CreatedAt:  now,
	}

	// Test all fields are accessible
	if metadata.ID != "unique-id-123" {
		t.Error("ID not set correctly")
	}

	if metadata.Title != "Daily Crossword" {
		t.Error("Title not set correctly")
	}

	if metadata.Author != "John Doe" {
		t.Error("Author not set correctly")
	}

	if metadata.Difficulty != grid.Medium {
		t.Error("Difficulty not set correctly")
	}

	if metadata.Theme != "Geography" {
		t.Error("Theme not set correctly")
	}

	if !metadata.CreatedAt.Equal(now) {
		t.Error("CreatedAt not set correctly")
	}
}

func TestPuzzleStructure(t *testing.T) {
	// Test that Puzzle struct has all required fields
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 3})
	clues := make(map[string]string)
	metadata := Metadata{}

	puzzle := &Puzzle{
		Grid:     g,
		Clues:    clues,
		Metadata: metadata,
	}

	if puzzle.Grid == nil {
		t.Error("Grid field should not be nil")
	}

	if puzzle.Clues == nil {
		t.Error("Clues field should not be nil")
	}
}
