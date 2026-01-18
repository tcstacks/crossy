package grid

// enforceSymmetry mirrors black squares from the top-left to bottom-right
// to create 180-degree rotational symmetry. This is standard for crossword puzzles.
//
// For a grid of size n, a cell at position (r, c) mirrors to position (n-1-r, n-1-c).
// For example, in a 15x15 grid:
//   - Cell (0, 0) mirrors to (14, 14)
//   - Cell (0, 1) mirrors to (14, 13)
//   - Cell (7, 7) is the center and maps to itself
//
// The function iterates through all cells and ensures that if a cell is black,
// its rotationally symmetric counterpart is also black.
func enforceSymmetry(grid *Grid) {
	size := grid.Size

	for row := 0; row < size; row++ {
		for col := 0; col < size; col++ {
			// Calculate the mirrored position (180-degree rotation)
			mirrorRow := size - 1 - row
			mirrorCol := size - 1 - col

			// If this cell is black, make sure the mirror is also black
			if grid.Cells[row][col].IsBlack {
				grid.Cells[mirrorRow][mirrorCol].IsBlack = true
			}
		}
	}
}

// isSymmetric validates that the grid has 180-degree rotational symmetry.
// Returns true if for every black square at (r, c), there is also a black
// square at (n-1-r, n-1-c), where n is the grid size.
//
// This validation ensures that grids follow standard crossword puzzle conventions.
func isSymmetric(grid *Grid) bool {
	size := grid.Size

	for row := 0; row < size; row++ {
		for col := 0; col < size; col++ {
			// Calculate the mirrored position (180-degree rotation)
			mirrorRow := size - 1 - row
			mirrorCol := size - 1 - col

			// Check if black square pattern is symmetric
			if grid.Cells[row][col].IsBlack != grid.Cells[mirrorRow][mirrorCol].IsBlack {
				return false
			}
		}
	}

	return true
}
