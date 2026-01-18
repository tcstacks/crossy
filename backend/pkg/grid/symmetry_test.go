package grid

import (
	"testing"
)

func TestEnforceSymmetry_BasicSymmetry(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Place a black square in the top-left corner
	grid.Cells[0][0].IsBlack = true

	enforceSymmetry(grid)

	// The bottom-right corner should now also be black (180-degree rotation)
	if !grid.Cells[14][14].IsBlack {
		t.Error("Expected cell [14][14] to be black after enforcing symmetry")
	}

	// Verify the grid is symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after enforceSymmetry")
	}
}

func TestEnforceSymmetry_TopLeftToBottomRight(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Place black squares in various positions in the top-left
	testCases := []struct {
		row        int
		col        int
		mirrorRow  int
		mirrorCol  int
	}{
		{0, 0, 14, 14},    // top-left corner to bottom-right corner
		{0, 1, 14, 13},    // top edge
		{1, 0, 13, 14},    // left edge
		{2, 3, 12, 11},    // middle area
		{5, 6, 9, 8},      // near center
	}

	for _, tc := range testCases {
		grid.Cells[tc.row][tc.col].IsBlack = true
	}

	enforceSymmetry(grid)

	// Verify all mirrors are created
	for _, tc := range testCases {
		if !grid.Cells[tc.mirrorRow][tc.mirrorCol].IsBlack {
			t.Errorf("Expected cell [%d][%d] to mirror cell [%d][%d]",
				tc.mirrorRow, tc.mirrorCol, tc.row, tc.col)
		}
	}

	// Verify the grid is symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after enforceSymmetry")
	}
}

func TestEnforceSymmetry_CenterCell(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// The center cell (7,7) in a 15x15 grid should mirror to itself
	grid.Cells[7][7].IsBlack = true

	enforceSymmetry(grid)

	// Center cell should still be black
	if !grid.Cells[7][7].IsBlack {
		t.Error("Center cell [7][7] should remain black")
	}

	// Verify the grid is symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after enforceSymmetry")
	}
}

func TestEnforceSymmetry_CompleteQuadrant(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Seed black squares in the top-left quadrant
	seedConfig := SeedConfig{
		Seed:         42,
		BlackDensity: 0.18,
	}
	seedBlackSquares(grid, seedConfig)

	// Grid should NOT be symmetric yet (only top-left has blacks)
	if isSymmetric(grid) {
		t.Error("Grid should not be symmetric before enforceSymmetry")
	}

	enforceSymmetry(grid)

	// Grid should now be symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after enforceSymmetry")
	}
}

func TestEnforceSymmetry_AlreadySymmetric(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Place symmetric black squares manually
	grid.Cells[0][0].IsBlack = true
	grid.Cells[14][14].IsBlack = true
	grid.Cells[1][2].IsBlack = true
	grid.Cells[13][12].IsBlack = true

	// Grid is already symmetric
	if !isSymmetric(grid) {
		t.Fatal("Test setup error: grid should be symmetric")
	}

	enforceSymmetry(grid)

	// Should still be symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should remain symmetric after enforceSymmetry")
	}

	// Verify the specific cells are still black
	if !grid.Cells[0][0].IsBlack || !grid.Cells[14][14].IsBlack {
		t.Error("Symmetric pairs should remain black")
	}
}

func TestEnforceSymmetry_EmptyGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Empty grid is symmetric (all white)
	if !isSymmetric(grid) {
		t.Fatal("Empty grid should be symmetric")
	}

	enforceSymmetry(grid)

	// Should still be symmetric
	if !isSymmetric(grid) {
		t.Error("Empty grid should remain symmetric after enforceSymmetry")
	}

	// Verify no cells became black
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				t.Errorf("Cell [%d][%d] should be white in empty grid", row, col)
			}
		}
	}
}

func TestEnforceSymmetry_DifferentGridSizes(t *testing.T) {
	tests := []struct {
		name       string
		size       int
		centerRow  int
		centerCol  int
	}{
		{name: "5x5 grid", size: 5, centerRow: 2, centerCol: 2},
		{name: "11x11 grid", size: 11, centerRow: 5, centerCol: 5},
		{name: "15x15 grid", size: 15, centerRow: 7, centerCol: 7},
		{name: "21x21 grid", size: 21, centerRow: 10, centerCol: 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := GridConfig{Size: tt.size}
			grid := NewEmptyGrid(config)

			// Place black in top-left corner
			grid.Cells[0][0].IsBlack = true
			// Place black in center
			grid.Cells[tt.centerRow][tt.centerCol].IsBlack = true

			enforceSymmetry(grid)

			// Bottom-right corner should be black
			if !grid.Cells[tt.size-1][tt.size-1].IsBlack {
				t.Errorf("Cell [%d][%d] should be black", tt.size-1, tt.size-1)
			}

			// Center should still be black
			if !grid.Cells[tt.centerRow][tt.centerCol].IsBlack {
				t.Errorf("Center cell [%d][%d] should be black", tt.centerRow, tt.centerCol)
			}

			// Grid should be symmetric
			if !isSymmetric(grid) {
				t.Error("Grid should be symmetric after enforceSymmetry")
			}
		})
	}
}

func TestIsSymmetric_SymmetricGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Create a symmetric pattern
	grid.Cells[0][0].IsBlack = true
	grid.Cells[14][14].IsBlack = true
	grid.Cells[1][3].IsBlack = true
	grid.Cells[13][11].IsBlack = true
	grid.Cells[7][7].IsBlack = true // center

	if !isSymmetric(grid) {
		t.Error("Grid should be detected as symmetric")
	}
}

func TestIsSymmetric_AsymmetricGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Create an asymmetric pattern (black in top-left but not bottom-right)
	grid.Cells[0][0].IsBlack = true
	// Missing mirror at [14][14]

	if isSymmetric(grid) {
		t.Error("Grid should be detected as asymmetric")
	}
}

func TestIsSymmetric_PartiallyAsymmetric(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Some symmetric pairs
	grid.Cells[0][0].IsBlack = true
	grid.Cells[14][14].IsBlack = true

	// One asymmetric pair
	grid.Cells[1][1].IsBlack = true
	// Missing mirror at [13][13]

	if isSymmetric(grid) {
		t.Error("Grid with any asymmetric pair should be detected as asymmetric")
	}
}

func TestIsSymmetric_EmptyGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Empty grid is symmetric
	if !isSymmetric(grid) {
		t.Error("Empty grid should be symmetric")
	}
}

func TestIsSymmetric_FullyBlackGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Make all cells black
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}

	// Fully black grid is symmetric
	if !isSymmetric(grid) {
		t.Error("Fully black grid should be symmetric")
	}
}

func TestIsSymmetric_CenterCellOnly(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Only center cell is black
	grid.Cells[7][7].IsBlack = true

	// Should still be symmetric (center mirrors to itself)
	if !isSymmetric(grid) {
		t.Error("Grid with only center cell black should be symmetric")
	}
}

func TestSymmetry_IntegrationWithSeed(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Use the actual seeding function
	seedConfig := SeedConfig{
		Seed:         123456,
		BlackDensity: 0.18,
	}
	seedBlackSquares(grid, seedConfig)

	// Before enforcing symmetry, grid should be asymmetric
	if isSymmetric(grid) {
		t.Error("Grid should be asymmetric before enforceSymmetry")
	}

	// Count blacks before
	blacksBefore := 0
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				blacksBefore++
			}
		}
	}

	// Enforce symmetry
	enforceSymmetry(grid)

	// After enforcing symmetry, grid should be symmetric
	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after enforceSymmetry")
	}

	// Count blacks after
	blacksAfter := 0
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				blacksAfter++
			}
		}
	}

	// Should have approximately double the blacks (accounting for center cell if it was black)
	// The ratio should be close to 2:1
	if blacksAfter < blacksBefore {
		t.Errorf("After symmetry, should have more blacks: before=%d, after=%d", blacksBefore, blacksAfter)
	}
}

func TestEnforceSymmetry_MirrorsFromTopLeft(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Place black squares only in top-left quadrant
	grid.Cells[0][0].IsBlack = true
	grid.Cells[1][1].IsBlack = true
	grid.Cells[2][2].IsBlack = true

	// Count blacks in bottom-right quadrant before
	bottomRightBlacks := 0
	for row := 8; row < 15; row++ {
		for col := 8; col < 15; col++ {
			if grid.Cells[row][col].IsBlack {
				bottomRightBlacks++
			}
		}
	}

	if bottomRightBlacks != 0 {
		t.Fatal("Test setup error: bottom-right should start with 0 blacks")
	}

	enforceSymmetry(grid)

	// Count blacks in bottom-right quadrant after
	bottomRightBlacks = 0
	for row := 8; row < 15; row++ {
		for col := 8; col < 15; col++ {
			if grid.Cells[row][col].IsBlack {
				bottomRightBlacks++
			}
		}
	}

	if bottomRightBlacks == 0 {
		t.Error("Bottom-right quadrant should have mirrored blacks after enforceSymmetry")
	}

	// Verify specific mirrors
	if !grid.Cells[14][14].IsBlack {
		t.Error("Cell [14][14] should mirror [0][0]")
	}
	if !grid.Cells[13][13].IsBlack {
		t.Error("Cell [13][13] should mirror [1][1]")
	}
	if !grid.Cells[12][12].IsBlack {
		t.Error("Cell [12][12] should mirror [2][2]")
	}
}

func TestIsSymmetric_ValidatesAllCells(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a pattern that's symmetric except for one cell
	grid.Cells[0][0].IsBlack = true
	grid.Cells[4][4].IsBlack = true
	grid.Cells[0][1].IsBlack = true
	grid.Cells[4][3].IsBlack = true
	grid.Cells[1][0].IsBlack = true
	// Missing mirror for [1][0] at [3][4]

	if isSymmetric(grid) {
		t.Error("Grid with one asymmetric cell should fail validation")
	}

	// Add the missing mirror
	grid.Cells[3][4].IsBlack = true

	if !isSymmetric(grid) {
		t.Error("Grid should be symmetric after adding missing mirror")
	}
}
