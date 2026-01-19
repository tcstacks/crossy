package puzzle

import (
	"time"

	"github.com/crossplay/backend/pkg/grid"
)

// Metadata contains puzzle metadata like title, author, and timestamps
type Metadata struct {
	ID         string         // Unique identifier for the puzzle
	Title      string         // Puzzle title
	Author     string         // Puzzle author/creator
	Difficulty grid.Difficulty // Puzzle difficulty level
	Theme      string         // Optional theme description
	CreatedAt  time.Time      // Timestamp when puzzle was created
}

// Puzzle represents a complete crossword puzzle with grid, clues, and metadata
type Puzzle struct {
	Grid     *grid.Grid       // The filled grid with all letters
	Clues    map[string]string // Map of entry key (e.g., "1-across") to clue text
	Metadata Metadata         // Puzzle metadata
}

// NewPuzzle creates a new Puzzle instance with the provided components
func NewPuzzle(g *grid.Grid, clues map[string]string, metadata Metadata) *Puzzle {
	return &Puzzle{
		Grid:     g,
		Clues:    clues,
		Metadata: metadata,
	}
}
