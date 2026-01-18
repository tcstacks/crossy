package grid

import "errors"

// ErrShortWords is returned when a grid contains words shorter than MinWordLength
var ErrShortWords = errors.New("grid contains words shorter than minimum allowed length")

// MinWordLength is the minimum allowed word length in a crossword grid (default 3)
const MinWordLength = 3

// hasShortWords checks if the grid contains any word slots shorter than MinWordLength.
// A word slot is a consecutive sequence of white cells in either horizontal or vertical direction.
// Returns true if any word is too short, false otherwise.
//
// The function scans:
// 1. All horizontal word slots (left to right, row by row)
// 2. All vertical word slots (top to bottom, column by column)
//
// Each consecutive sequence of white cells bounded by black cells or grid edges
// is counted as a word slot. If any slot has length < MinWordLength and length > 1,
// it is considered too short (single white cells surrounded by blacks are ignored).
func hasShortWords(grid *Grid) bool {
	if grid == nil || grid.Size == 0 {
		return false
	}

	// Check horizontal words (across)
	for row := 0; row < grid.Size; row++ {
		wordLength := 0
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				// End of word - check if it was too short
				if wordLength > 1 && wordLength < MinWordLength {
					return true
				}
				wordLength = 0
			} else {
				// White cell - part of a word
				wordLength++
			}
		}
		// Check word at end of row
		if wordLength > 1 && wordLength < MinWordLength {
			return true
		}
	}

	// Check vertical words (down)
	for col := 0; col < grid.Size; col++ {
		wordLength := 0
		for row := 0; row < grid.Size; row++ {
			if grid.Cells[row][col].IsBlack {
				// End of word - check if it was too short
				if wordLength > 1 && wordLength < MinWordLength {
					return true
				}
				wordLength = 0
			} else {
				// White cell - part of a word
				wordLength++
			}
		}
		// Check word at end of column
		if wordLength > 1 && wordLength < MinWordLength {
			return true
		}
	}

	return false
}
