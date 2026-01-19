package output

import (
	"encoding/json"
	"time"

	"github.com/crossplay/backend/internal/models"
)

// ClueJSON represents a clue in the JSON format
type ClueJSON struct {
	Number int    `json:"number"`
	Text   string `json:"text"`
	Answer string `json:"answer"`
	Length int    `json:"length"`
}

// PuzzleJSON represents a puzzle in the JSON format for export
type PuzzleJSON struct {
	// Metadata
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Author     string    `json:"author"`
	Difficulty string    `json:"difficulty"`
	CreatedAt  time.Time `json:"createdAt"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`

	// Grid
	Grid [][]string `json:"grid"` // 2D array with letters or '.' for black cells

	// Clues
	Across []ClueJSON `json:"across"`
	Down   []ClueJSON `json:"down"`
}

// FormatJSON converts a models.Puzzle to PuzzleJSON struct
func FormatJSON(puzzle *models.Puzzle) *PuzzleJSON {
	// Convert grid to 2D array with letters or '.' for black cells
	grid := make([][]string, puzzle.GridHeight)
	for y := 0; y < puzzle.GridHeight; y++ {
		grid[y] = make([]string, puzzle.GridWidth)
		for x := 0; x < puzzle.GridWidth; x++ {
			cell := puzzle.Grid[y][x]
			if cell.Letter == nil {
				// Black cell
				grid[y][x] = "."
			} else {
				// Letter cell
				grid[y][x] = *cell.Letter
			}
		}
	}

	// Convert across clues
	across := make([]ClueJSON, len(puzzle.CluesAcross))
	for i, clue := range puzzle.CluesAcross {
		across[i] = ClueJSON{
			Number: clue.Number,
			Text:   clue.Text,
			Answer: clue.Answer,
			Length: clue.Length,
		}
	}

	// Convert down clues
	down := make([]ClueJSON, len(puzzle.CluesDown))
	for i, clue := range puzzle.CluesDown {
		down[i] = ClueJSON{
			Number: clue.Number,
			Text:   clue.Text,
			Answer: clue.Answer,
			Length: clue.Length,
		}
	}

	return &PuzzleJSON{
		ID:          puzzle.ID,
		Title:       puzzle.Title,
		Author:      puzzle.Author,
		Difficulty:  string(puzzle.Difficulty),
		CreatedAt:   puzzle.CreatedAt,
		PublishedAt: puzzle.PublishedAt,
		Grid:        grid,
		Across:      across,
		Down:        down,
	}
}

// MarshalJSON serializes a PuzzleJSON to JSON bytes
func (p *PuzzleJSON) MarshalJSON() ([]byte, error) {
	type Alias PuzzleJSON
	return json.Marshal((*Alias)(p))
}

// ToJSON converts a models.Puzzle to JSON bytes
func ToJSON(puzzle *models.Puzzle) ([]byte, error) {
	puzzleJSON := FormatJSON(puzzle)
	return json.MarshalIndent(puzzleJSON, "", "  ")
}
