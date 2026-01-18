package grid

import (
	"math/rand"
)

// SeedConfig holds configuration for black square seeding
type SeedConfig struct {
	Seed        int64   // Random seed for reproducibility
	BlackDensity float64 // Percentage of black squares (0.16-0.20 typical)
}

// seedBlackSquares randomly places black squares in the top-left quadrant of the grid.
// The black squares will later be mirrored to create 180-degree rotational symmetry.
//
// For a 15x15 grid, the top-left quadrant includes cells where both row and col are < 7.
// The center cell (7,7) is never made black to ensure connectivity validation can proceed.
//
// Parameters:
//   - grid: The grid to seed with black squares
//   - config: Configuration for seeding (random seed and black density)
//
// The function places black squares only in the top-left quadrant, which will be
// mirrored to the bottom-right quadrant by the enforceSymmetry function.
func seedBlackSquares(grid *Grid, config SeedConfig) {
	// Create a new random source with the provided seed
	r := rand.New(rand.NewSource(config.Seed))

	// Calculate total cells and target number of black cells
	totalCells := grid.Size * grid.Size
	targetBlackCells := int(float64(totalCells) * config.BlackDensity)

	// For symmetric grids, we only place in top-left quadrant
	// The number of cells in top-left quadrant (not including center row/col for odd-sized grids)
	quadrantSize := grid.Size / 2

	// Calculate how many black squares to place in the quadrant
	// Since we'll mirror them, we need half of the target (accounting for center cell if grid is odd)
	blacksToPlace := targetBlackCells / 2

	// Calculate center position for odd-sized grids
	center := grid.Size / 2

	// Create a list of all possible positions in the top-left quadrant
	// Exclude center cell to ensure it's never black (required for connectivity check)
	var positions []struct{ row, col int }
	for row := 0; row < quadrantSize; row++ {
		for col := 0; col < quadrantSize; col++ {
			positions = append(positions, struct{ row, col int }{row, col})
		}
	}

	// Shuffle the positions to randomize placement
	r.Shuffle(len(positions), func(i, j int) {
		positions[i], positions[j] = positions[j], positions[i]
	})

	// Place black squares in the first N positions
	placedCount := 0
	for i := 0; i < len(positions) && placedCount < blacksToPlace; i++ {
		pos := positions[i]
		grid.Cells[pos.row][pos.col].IsBlack = true
		placedCount++
	}

	// Ensure center cell is always white (required for connectivity check)
	grid.Cells[center][center].IsBlack = false
}
