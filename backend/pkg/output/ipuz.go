package output

import (
	"encoding/json"
	"fmt"

	"github.com/crossplay/backend/internal/models"
)

// IPuzDimensions represents the puzzle dimensions
type IPuzDimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// IPuzCell represents a cell in the ipuz puzzle grid
// Can be null (omitted), "#" (block), a number (clue label), or an object with cell properties
type IPuzCell struct {
	Cell      *int    `json:"cell,omitempty"`      // Clue number if this is the start of a word
	Style     *string `json:"style,omitempty"`     // Style information
	IsCircled bool    `json:"isCircled,omitempty"` // For circled cells
}

// IPuzClue represents a clue in ipuz format [number, "clue text"]
type IPuzClue []interface{}

// IPuzClues represents the clues section with Across and Down
type IPuzClues struct {
	Across []IPuzClue `json:"Across"`
	Down   []IPuzClue `json:"Down"`
}

// IPuzPuzzle represents the complete ipuz format structure
type IPuzPuzzle struct {
	Version    string          `json:"version"`
	Kind       []string        `json:"kind"`
	Title      string          `json:"title,omitempty"`
	Author     string          `json:"author,omitempty"`
	Copyright  string          `json:"copyright,omitempty"`
	Difficulty string          `json:"difficulty,omitempty"`
	Dimensions IPuzDimensions  `json:"dimensions"`
	Puzzle     [][]interface{} `json:"puzzle"`
	Solution   [][]interface{} `json:"solution"`
	Clues      IPuzClues       `json:"clues"`
}

// FormatIPuz converts a models.Puzzle to ipuz JSON format
// The ipuz format is used by modern web solvers and follows the specification at http://ipuz.org/
func FormatIPuz(puzzle *models.Puzzle) (*IPuzPuzzle, error) {
	if puzzle == nil {
		return nil, fmt.Errorf("puzzle cannot be nil")
	}

	// Validate grid dimensions
	if puzzle.GridWidth <= 0 || puzzle.GridHeight <= 0 {
		return nil, fmt.Errorf("invalid grid dimensions: %dx%d", puzzle.GridWidth, puzzle.GridHeight)
	}

	if len(puzzle.Grid) != puzzle.GridHeight {
		return nil, fmt.Errorf("grid height mismatch: expected %d, got %d", puzzle.GridHeight, len(puzzle.Grid))
	}

	// Build the puzzle grid (with clue numbers)
	puzzleGrid := make([][]interface{}, puzzle.GridHeight)
	for y := 0; y < puzzle.GridHeight; y++ {
		if len(puzzle.Grid[y]) != puzzle.GridWidth {
			return nil, fmt.Errorf("grid width mismatch at row %d: expected %d, got %d", y, puzzle.GridWidth, len(puzzle.Grid[y]))
		}

		puzzleGrid[y] = make([]interface{}, puzzle.GridWidth)
		for x := 0; x < puzzle.GridWidth; x++ {
			cell := puzzle.Grid[y][x]
			if cell.Letter == nil {
				// Black cell
				puzzleGrid[y][x] = "#"
			} else if cell.Number != nil {
				// Cell with a clue number
				ipuzCell := IPuzCell{
					Cell:      cell.Number,
					IsCircled: cell.IsCircled,
				}
				puzzleGrid[y][x] = ipuzCell
			} else if cell.IsCircled {
				// Circled cell without a number
				ipuzCell := IPuzCell{
					Cell:      nil,
					IsCircled: true,
				}
				puzzleGrid[y][x] = ipuzCell
			} else {
				// Regular cell with no number (represented as 0 in ipuz)
				puzzleGrid[y][x] = 0
			}
		}
	}

	// Build the solution grid (letters only)
	solutionGrid := make([][]interface{}, puzzle.GridHeight)
	for y := 0; y < puzzle.GridHeight; y++ {
		solutionGrid[y] = make([]interface{}, puzzle.GridWidth)
		for x := 0; x < puzzle.GridWidth; x++ {
			cell := puzzle.Grid[y][x]
			if cell.Letter == nil {
				// Black cell
				solutionGrid[y][x] = "#"
			} else {
				// Letter cell
				solutionGrid[y][x] = *cell.Letter
			}
		}
	}

	// Build across clues
	acrossClues := make([]IPuzClue, 0, len(puzzle.CluesAcross))
	for _, clue := range puzzle.CluesAcross {
		// ipuz format: [clueNumber, "clue text"]
		acrossClues = append(acrossClues, IPuzClue{clue.Number, clue.Text})
	}

	// Build down clues
	downClues := make([]IPuzClue, 0, len(puzzle.CluesDown))
	for _, clue := range puzzle.CluesDown {
		// ipuz format: [clueNumber, "clue text"]
		downClues = append(downClues, IPuzClue{clue.Number, clue.Text})
	}

	// Build copyright string
	copyright := fmt.Sprintf("© %s", puzzle.Author)
	if puzzle.PublishedAt != nil {
		copyright = fmt.Sprintf("© %d %s", puzzle.PublishedAt.Year(), puzzle.Author)
	}

	return &IPuzPuzzle{
		Version:    "http://ipuz.org/v2",
		Kind:       []string{"http://ipuz.org/crossword#1"},
		Title:      puzzle.Title,
		Author:     puzzle.Author,
		Copyright:  copyright,
		Difficulty: string(puzzle.Difficulty),
		Dimensions: IPuzDimensions{
			Width:  puzzle.GridWidth,
			Height: puzzle.GridHeight,
		},
		Puzzle:   puzzleGrid,
		Solution: solutionGrid,
		Clues: IPuzClues{
			Across: acrossClues,
			Down:   downClues,
		},
	}, nil
}

// ToIPuz converts a models.Puzzle to ipuz JSON bytes
func ToIPuz(puzzle *models.Puzzle) ([]byte, error) {
	ipuzPuzzle, err := FormatIPuz(puzzle)
	if err != nil {
		return nil, err
	}
	return json.MarshalIndent(ipuzPuzzle, "", "  ")
}

// FromIPuz parses ipuz JSON bytes and returns a models.Puzzle
func FromIPuz(data []byte) (*models.Puzzle, error) {
	var ipuz IPuzPuzzle
	if err := json.Unmarshal(data, &ipuz); err != nil {
		return nil, fmt.Errorf("failed to parse ipuz: %w", err)
	}

	// Create the grid
	grid := make([][]models.GridCell, ipuz.Dimensions.Height)
	for y := 0; y < ipuz.Dimensions.Height; y++ {
		grid[y] = make([]models.GridCell, ipuz.Dimensions.Width)
		for x := 0; x < ipuz.Dimensions.Width; x++ {
			cell := models.GridCell{}

			// Get the solution (letter or black square)
			if y < len(ipuz.Solution) && x < len(ipuz.Solution[y]) {
				switch sol := ipuz.Solution[y][x].(type) {
				case string:
					if sol == "#" {
						// Black cell
						cell.Letter = nil
					} else {
						// Letter cell
						cell.Letter = &sol
					}
				}
			}

			// Get the puzzle cell (for numbers and circling)
			if y < len(ipuz.Puzzle) && x < len(ipuz.Puzzle[y]) {
				switch puz := ipuz.Puzzle[y][x].(type) {
				case float64:
					// Numeric value
					if puz > 0 {
						num := int(puz)
						cell.Number = &num
					}
				case map[string]interface{}:
					// IPuzCell object
					if cellNum, ok := puz["cell"].(float64); ok && cellNum > 0 {
						num := int(cellNum)
						cell.Number = &num
					}
					if isCircled, ok := puz["isCircled"].(bool); ok {
						cell.IsCircled = isCircled
					}
				}
			}

			grid[y][x] = cell
		}
	}

	// Parse clues
	acrossClues := make([]models.Clue, 0)
	for _, clue := range ipuz.Clues.Across {
		if len(clue) >= 2 {
			number := 0
			text := ""

			if num, ok := clue[0].(float64); ok {
				number = int(num)
			}
			if txt, ok := clue[1].(string); ok {
				text = txt
			}

			acrossClues = append(acrossClues, models.Clue{
				Number:    number,
				Text:      text,
				Direction: "across",
			})
		}
	}

	downClues := make([]models.Clue, 0)
	for _, clue := range ipuz.Clues.Down {
		if len(clue) >= 2 {
			number := 0
			text := ""

			if num, ok := clue[0].(float64); ok {
				number = int(num)
			}
			if txt, ok := clue[1].(string); ok {
				text = txt
			}

			downClues = append(downClues, models.Clue{
				Number:    number,
				Text:      text,
				Direction: "down",
			})
		}
	}

	// Map difficulty string to enum
	difficulty := models.DifficultyMedium
	switch ipuz.Difficulty {
	case "easy", "Easy":
		difficulty = models.DifficultyEasy
	case "medium", "Medium":
		difficulty = models.DifficultyMedium
	case "hard", "Hard":
		difficulty = models.DifficultyHard
	}

	return &models.Puzzle{
		Title:       ipuz.Title,
		Author:      ipuz.Author,
		Difficulty:  difficulty,
		GridWidth:   ipuz.Dimensions.Width,
		GridHeight:  ipuz.Dimensions.Height,
		Grid:        grid,
		CluesAcross: acrossClues,
		CluesDown:   downClues,
		Status:      "draft",
	}, nil
}

// ValidateIPuz validates that a puzzle can be converted to ipuz format
func ValidateIPuz(puzzle *models.Puzzle) error {
	if puzzle == nil {
		return fmt.Errorf("puzzle cannot be nil")
	}

	// Validate required fields
	if puzzle.Title == "" {
		return fmt.Errorf("puzzle title is required")
	}

	if puzzle.Author == "" {
		return fmt.Errorf("puzzle author is required")
	}

	// Validate grid dimensions
	if puzzle.GridWidth <= 0 || puzzle.GridHeight <= 0 {
		return fmt.Errorf("invalid grid dimensions: %dx%d", puzzle.GridWidth, puzzle.GridHeight)
	}

	// Validate grid structure
	if len(puzzle.Grid) != puzzle.GridHeight {
		return fmt.Errorf("grid height mismatch: expected %d, got %d", puzzle.GridHeight, len(puzzle.Grid))
	}

	for y := 0; y < puzzle.GridHeight; y++ {
		if len(puzzle.Grid[y]) != puzzle.GridWidth {
			return fmt.Errorf("grid width mismatch at row %d: expected %d, got %d", y, puzzle.GridWidth, len(puzzle.Grid[y]))
		}
	}

	// Validate that we have at least one clue
	if len(puzzle.CluesAcross) == 0 && len(puzzle.CluesDown) == 0 {
		return fmt.Errorf("puzzle must have at least one clue")
	}

	return nil
}
