package puzzle

import (
	"fmt"

	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/pkg/grid"
)

// ToModelsPuzzle converts a pkg/puzzle.Puzzle to models.Puzzle for output formatting
func ToModelsPuzzle(p *Puzzle) *models.Puzzle {
	// Convert grid cells
	gridCells := make([][]models.GridCell, p.Grid.Size)
	for y := 0; y < p.Grid.Size; y++ {
		gridCells[y] = make([]models.GridCell, p.Grid.Size)
		for x := 0; x < p.Grid.Size; x++ {
			cell := p.Grid.Cells[y][x]

			var letter *string
			if !cell.IsBlack {
				letterStr := string(cell.Letter)
				letter = &letterStr
			}

			var number *int
			if cell.Number > 0 {
				num := cell.Number
				number = &num
			}

			gridCells[y][x] = models.GridCell{
				Letter:    letter,
				Number:    number,
				IsCircled: false,
				Rebus:     nil,
			}
		}
	}

	// Convert across clues
	acrossClues := make([]models.Clue, 0)
	for _, entry := range p.Grid.Entries {
		if entry.Direction != grid.ACROSS {
			continue
		}

		clueKey := getClueKey(entry)
		clueText, found := p.Clues[clueKey]
		if !found {
			clueText = "Missing clue"
		}

		answer := extractAnswer(entry)

		acrossClues = append(acrossClues, models.Clue{
			Number:    entry.Number,
			Text:      clueText,
			Answer:    answer,
			PositionX: entry.StartCol,
			PositionY: entry.StartRow,
			Length:    entry.Length,
			Direction: "across",
		})
	}

	// Convert down clues
	downClues := make([]models.Clue, 0)
	for _, entry := range p.Grid.Entries {
		if entry.Direction != grid.DOWN {
			continue
		}

		clueKey := getClueKey(entry)
		clueText, found := p.Clues[clueKey]
		if !found {
			clueText = "Missing clue"
		}

		answer := extractAnswer(entry)

		downClues = append(downClues, models.Clue{
			Number:    entry.Number,
			Text:      clueText,
			Answer:    answer,
			PositionX: entry.StartCol,
			PositionY: entry.StartRow,
			Length:    entry.Length,
			Direction: "down",
		})
	}

	// Convert difficulty
	var difficulty models.Difficulty
	switch p.Metadata.Difficulty {
	case grid.Easy:
		difficulty = models.DifficultyEasy
	case grid.Medium:
		difficulty = models.DifficultyMedium
	case grid.Hard, grid.Expert:
		difficulty = models.DifficultyHard
	default:
		difficulty = models.DifficultyMedium
	}

	// Create theme pointer if not empty
	var theme *string
	if p.Metadata.Theme != "" {
		theme = &p.Metadata.Theme
	}

	return &models.Puzzle{
		ID:          p.Metadata.ID,
		Date:        nil,
		Title:       p.Metadata.Title,
		Author:      p.Metadata.Author,
		Difficulty:  difficulty,
		GridWidth:   p.Grid.Size,
		GridHeight:  p.Grid.Size,
		Grid:        gridCells,
		CluesAcross: acrossClues,
		CluesDown:   downClues,
		Theme:       theme,
		CreatedAt:   p.Metadata.CreatedAt,
		PublishedAt: nil,
		Status:      "draft",
	}
}

// getClueKey generates the key for looking up a clue in the clues map
func getClueKey(entry *grid.Entry) string {
	return fmt.Sprintf("%d-%s", entry.Number, entry.Direction.String())
}

// extractAnswer extracts the answer string from an entry's cells
func extractAnswer(entry *grid.Entry) string {
	answer := make([]rune, len(entry.Cells))
	for i, cell := range entry.Cells {
		answer[i] = cell.Letter
	}
	return string(answer)
}
