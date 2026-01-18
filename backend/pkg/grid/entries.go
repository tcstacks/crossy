package grid

// computeEntries identifies all word slots (entries) in the grid.
// It scans the grid to find:
// - Across entries: horizontal word slots (left-to-right, top-to-bottom)
// - Down entries: vertical word slots (top-to-bottom, left-to-right)
//
// Each entry consists of consecutive non-black cells that form a word slot.
// The function populates the grid's Entries field with all discovered word slots.
//
// Parameters:
//   - grid: The grid to compute entries for
//
// The function modifies the grid's Entries field in place.
func computeEntries(grid *Grid) {
	// Clear any existing entries
	grid.Entries = []*Entry{}

	clueNumber := 1
	numberAssigned := make(map[[2]int]int) // Maps [row, col] to clue number

	// First pass: scan for across and down entries, assigning clue numbers
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			// Skip black cells
			if grid.Cells[row][col].IsBlack {
				continue
			}

			// Check if this cell starts an across entry
			startsAcross := false
			if col == 0 || grid.Cells[row][col-1].IsBlack {
				// This could be the start of an across word
				// Check if there's at least one more non-black cell to the right
				if col+1 < grid.Size && !grid.Cells[row][col+1].IsBlack {
					startsAcross = true
				}
			}

			// Check if this cell starts a down entry
			startsDown := false
			if row == 0 || grid.Cells[row-1][col].IsBlack {
				// This could be the start of a down word
				// Check if there's at least one more non-black cell below
				if row+1 < grid.Size && !grid.Cells[row+1][col].IsBlack {
					startsDown = true
				}
			}

			// If this cell starts either an across or down entry, assign it a clue number
			if startsAcross || startsDown {
				numberAssigned[[2]int{row, col}] = clueNumber
				grid.Cells[row][col].Number = clueNumber
				clueNumber++
			}
		}
	}

	// Second pass: create across entries (left-to-right, top-to-bottom)
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			// Skip black cells
			if grid.Cells[row][col].IsBlack {
				continue
			}

			// Check if this is the start of an across entry
			if col == 0 || grid.Cells[row][col-1].IsBlack {
				// Collect all consecutive non-black cells to the right
				cells := []*Cell{}
				c := col
				for c < grid.Size && !grid.Cells[row][c].IsBlack {
					cells = append(cells, grid.Cells[row][c])
					c++
				}

				// Only create an entry if we have at least 2 cells (minimum word length)
				if len(cells) >= 2 {
					entry := &Entry{
						Number:    numberAssigned[[2]int{row, col}],
						Direction: ACROSS,
						StartRow:  row,
						StartCol:  col,
						Length:    len(cells),
						Cells:     cells,
					}
					grid.Entries = append(grid.Entries, entry)
				}
			}
		}
	}

	// Third pass: create down entries (top-to-bottom, left-to-right)
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			// Skip black cells
			if grid.Cells[row][col].IsBlack {
				continue
			}

			// Check if this is the start of a down entry
			if row == 0 || grid.Cells[row-1][col].IsBlack {
				// Collect all consecutive non-black cells downward
				cells := []*Cell{}
				r := row
				for r < grid.Size && !grid.Cells[r][col].IsBlack {
					cells = append(cells, grid.Cells[r][col])
					r++
				}

				// Only create an entry if we have at least 2 cells (minimum word length)
				if len(cells) >= 2 {
					entry := &Entry{
						Number:    numberAssigned[[2]int{row, col}],
						Direction: DOWN,
						StartRow:  row,
						StartCol:  col,
						Length:    len(cells),
						Cells:     cells,
					}
					grid.Entries = append(grid.Entries, entry)
				}
			}
		}
	}
}
