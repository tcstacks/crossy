package grid

import (
	"testing"
)

func TestSeedBlackSquares_TopLeftQuadrantOnly(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	seedConfig := SeedConfig{
		Seed:         42,
		BlackDensity: 0.18, // 18% black squares
	}

	seedBlackSquares(grid, seedConfig)

	// Check that black squares are only in top-left quadrant
	// For 15x15 grid, top-left quadrant is rows 0-6, cols 0-6
	quadrantSize := grid.Size / 2 // 7

	// Count blacks in each quadrant
	topLeftBlacks := 0
	topRightBlacks := 0
	bottomLeftBlacks := 0
	bottomRightBlacks := 0

	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if !grid.Cells[row][col].IsBlack {
				continue
			}

			if row < quadrantSize && col < quadrantSize {
				topLeftBlacks++
			} else if row < quadrantSize && col >= quadrantSize {
				topRightBlacks++
			} else if row >= quadrantSize && col < quadrantSize {
				bottomLeftBlacks++
			} else {
				bottomRightBlacks++
			}
		}
	}

	// Only top-left quadrant should have black squares
	if topLeftBlacks == 0 {
		t.Error("Expected black squares in top-left quadrant, got 0")
	}
	if topRightBlacks != 0 {
		t.Errorf("Expected 0 black squares in top-right quadrant, got %d", topRightBlacks)
	}
	if bottomLeftBlacks != 0 {
		t.Errorf("Expected 0 black squares in bottom-left quadrant, got %d", bottomLeftBlacks)
	}
	if bottomRightBlacks != 0 {
		t.Errorf("Expected 0 black squares in bottom-right quadrant, got %d", bottomRightBlacks)
	}
}

func TestSeedBlackSquares_DensityControl(t *testing.T) {
	tests := []struct {
		name         string
		density      float64
		minExpected  int
		maxExpected  int
	}{
		{
			name:        "16% density",
			density:     0.16,
			minExpected: 16, // ~36 total (18 in quadrant), accounting for rounding
			maxExpected: 20,
		},
		{
			name:        "18% density",
			density:     0.18,
			minExpected: 18, // ~40 total (20 in quadrant)
			maxExpected: 22,
		},
		{
			name:        "20% density",
			density:     0.20,
			minExpected: 20, // ~45 total (22 in quadrant)
			maxExpected: 24,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := GridConfig{Size: 15}
			grid := NewEmptyGrid(config)

			seedConfig := SeedConfig{
				Seed:         12345,
				BlackDensity: tt.density,
			}

			seedBlackSquares(grid, seedConfig)

			// Count black squares in top-left quadrant
			blackCount := 0
			quadrantSize := grid.Size / 2

			for row := 0; row < quadrantSize; row++ {
				for col := 0; col < quadrantSize; col++ {
					if grid.Cells[row][col].IsBlack {
						blackCount++
					}
				}
			}

			if blackCount < tt.minExpected || blackCount > tt.maxExpected {
				t.Errorf("Black square count = %d, expected between %d and %d",
					blackCount, tt.minExpected, tt.maxExpected)
			}
		})
	}
}

func TestSeedBlackSquares_Reproducibility(t *testing.T) {
	config := GridConfig{Size: 15}
	seedConfig := SeedConfig{
		Seed:         99999,
		BlackDensity: 0.18,
	}

	// Create first grid
	grid1 := NewEmptyGrid(config)
	seedBlackSquares(grid1, seedConfig)

	// Create second grid with same seed
	grid2 := NewEmptyGrid(config)
	seedBlackSquares(grid2, seedConfig)

	// Grids should be identical
	quadrantSize := grid1.Size / 2
	for row := 0; row < quadrantSize; row++ {
		for col := 0; col < quadrantSize; col++ {
			if grid1.Cells[row][col].IsBlack != grid2.Cells[row][col].IsBlack {
				t.Errorf("Grids differ at [%d][%d]: grid1=%v, grid2=%v",
					row, col,
					grid1.Cells[row][col].IsBlack,
					grid2.Cells[row][col].IsBlack)
			}
		}
	}
}

func TestSeedBlackSquares_DifferentSeeds(t *testing.T) {
	config := GridConfig{Size: 15}

	// Create two grids with different seeds
	grid1 := NewEmptyGrid(config)
	seedBlackSquares(grid1, SeedConfig{Seed: 1111, BlackDensity: 0.18})

	grid2 := NewEmptyGrid(config)
	seedBlackSquares(grid2, SeedConfig{Seed: 2222, BlackDensity: 0.18})

	// Grids should be different (very unlikely to be identical by chance)
	differences := 0
	quadrantSize := grid1.Size / 2
	for row := 0; row < quadrantSize; row++ {
		for col := 0; col < quadrantSize; col++ {
			if grid1.Cells[row][col].IsBlack != grid2.Cells[row][col].IsBlack {
				differences++
			}
		}
	}

	if differences == 0 {
		t.Error("Expected grids with different seeds to differ, but they were identical")
	}
}

func TestSeedBlackSquares_MarksIsBlackTrue(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	seedConfig := SeedConfig{
		Seed:         777,
		BlackDensity: 0.18,
	}

	// Verify all cells start as white
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				t.Fatalf("Cell [%d][%d] was black before seeding", row, col)
			}
		}
	}

	seedBlackSquares(grid, seedConfig)

	// Verify that black cells have IsBlack = true
	quadrantSize := grid.Size / 2
	blackFound := false
	for row := 0; row < quadrantSize; row++ {
		for col := 0; col < quadrantSize; col++ {
			if grid.Cells[row][col].IsBlack {
				blackFound = true
				// Additional verification: black cells should have IsBlack = true
				if !grid.Cells[row][col].IsBlack {
					t.Errorf("Cell [%d][%d] should have IsBlack=true", row, col)
				}
			}
		}
	}

	if !blackFound {
		t.Error("Expected to find at least one black square")
	}
}

func TestSeedBlackSquares_DifferentGridSizes(t *testing.T) {
	tests := []struct {
		name string
		size int
	}{
		{name: "5x5 grid", size: 5},
		{name: "11x11 grid", size: 11},
		{name: "15x15 grid", size: 15},
		{name: "21x21 grid", size: 21},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := GridConfig{Size: tt.size}
			grid := NewEmptyGrid(config)

			seedConfig := SeedConfig{
				Seed:         123,
				BlackDensity: 0.18,
			}

			seedBlackSquares(grid, seedConfig)

			// Count blacks in top-left quadrant
			quadrantSize := grid.Size / 2
			blackCount := 0

			for row := 0; row < quadrantSize; row++ {
				for col := 0; col < quadrantSize; col++ {
					if grid.Cells[row][col].IsBlack {
						blackCount++
					}
				}
			}

			// Should have some black squares
			if blackCount == 0 {
				t.Error("Expected at least one black square in quadrant")
			}

			// Verify blacks are only in top-left quadrant
			for row := 0; row < grid.Size; row++ {
				for col := 0; col < grid.Size; col++ {
					if grid.Cells[row][col].IsBlack {
						if row >= quadrantSize || col >= quadrantSize {
							t.Errorf("Found black square outside top-left quadrant at [%d][%d]", row, col)
						}
					}
				}
			}
		})
	}
}

func TestSeedBlackSquares_ZeroDensity(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	seedConfig := SeedConfig{
		Seed:         42,
		BlackDensity: 0.0,
	}

	seedBlackSquares(grid, seedConfig)

	// Should have no black squares
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				t.Errorf("Found black square at [%d][%d] with 0 density", row, col)
			}
		}
	}
}

func TestSeedBlackSquares_HighDensity(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	seedConfig := SeedConfig{
		Seed:         42,
		BlackDensity: 0.30, // 30% is high but should still work
	}

	seedBlackSquares(grid, seedConfig)

	// Count blacks in top-left quadrant
	quadrantSize := grid.Size / 2
	blackCount := 0

	for row := 0; row < quadrantSize; row++ {
		for col := 0; col < quadrantSize; col++ {
			if grid.Cells[row][col].IsBlack {
				blackCount++
			}
		}
	}

	// Should have approximately 30% of total / 2 for quadrant
	totalCells := grid.Size * grid.Size
	expectedQuadrantBlacks := int(float64(totalCells) * 0.30 / 2)

	// Allow some tolerance
	minExpected := expectedQuadrantBlacks - 5
	maxExpected := expectedQuadrantBlacks + 5

	if blackCount < minExpected || blackCount > maxExpected {
		t.Errorf("Black count = %d, expected between %d and %d",
			blackCount, minExpected, maxExpected)
	}
}
