package fill

import (
	"fmt"

	"github.com/crossplay/backend/pkg/grid"
)

// placeWord fills the entry cells with the letters from the given word.
// It updates the grid state atomically by setting the Letter field of each cell.
//
// Parameters:
//   - entry: The entry to fill
//   - word: The word to place (must match entry length)
//
// Returns:
//   - error if word length doesn't match entry length
func placeWord(entry *grid.Entry, word string) error {
	if entry == nil {
		return fmt.Errorf("entry cannot be nil")
	}

	if len(word) != entry.Length {
		return fmt.Errorf("word length %d does not match entry length %d", len(word), entry.Length)
	}

	if len(word) != len(entry.Cells) {
		return fmt.Errorf("word length %d does not match cells length %d", len(word), len(entry.Cells))
	}

	// Place each letter in the corresponding cell
	for i, letter := range word {
		entry.Cells[i].Letter = letter
	}

	return nil
}

// removeWord clears the entry cells back to unfilled state (Letter = 0).
// It handles crossing cells correctly by only clearing a cell if it's not
// part of a filled perpendicular word.
//
// Parameters:
//   - entry: The entry to clear
//   - g: The grid containing all entries
func removeWord(entry *grid.Entry, g *grid.Grid) {
	if entry == nil || g == nil {
		return
	}

	// Determine the perpendicular direction
	crossDirection := grid.DOWN
	if entry.Direction == grid.DOWN {
		crossDirection = grid.ACROSS
	}

	// For each cell in this entry
	for _, cell := range entry.Cells {
		// Check if this cell is part of a filled perpendicular entry
		hasFilledCrossing := false

		for _, other := range g.Entries {
			// Skip if not the perpendicular direction
			if other.Direction != crossDirection {
				continue
			}

			// Check if this entry crosses at this cell
			for _, otherCell := range other.Cells {
				if otherCell == cell {
					// Found a crossing - check if the crossing entry is filled
					if isEntryFilled(other) {
						hasFilledCrossing = true
						break
					}
				}
			}

			if hasFilledCrossing {
				break
			}
		}

		// Only clear the cell if there's no filled perpendicular word using it
		if !hasFilledCrossing {
			cell.Letter = 0
		}
	}
}

// isEntryFilled checks if all cells in an entry have letters (are filled)
func isEntryFilled(entry *grid.Entry) bool {
	if entry == nil || len(entry.Cells) == 0 {
		return false
	}

	for _, cell := range entry.Cells {
		if cell.Letter == 0 {
			return false
		}
	}

	return true
}
