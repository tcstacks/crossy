package grid

import "testing"

func TestIsConnected_EmptyGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	if !isConnected(grid) {
		t.Error("Empty grid (all white cells) should be connected")
	}
}

func TestIsConnected_SmallGrid(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	if !isConnected(grid) {
		t.Error("5x5 empty grid should be connected")
	}
}

func TestIsConnected_SingleBlackCell(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Place a black cell in corner (not center)
	grid.Cells[0][0].IsBlack = true

	if !isConnected(grid) {
		t.Error("Grid with single black cell in corner should still be connected")
	}
}

func TestIsConnected_DisconnectedRegions(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a wall of black cells that disconnects the grid
	// This creates a horizontal wall across the middle row (row 2)
	for col := 0; col < 5; col++ {
		grid.Cells[2][col].IsBlack = true
	}

	if isConnected(grid) {
		t.Error("Grid with horizontal wall should be disconnected")
	}
}

func TestIsConnected_VerticalWall(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a vertical wall that disconnects the grid
	for row := 0; row < 5; row++ {
		grid.Cells[row][2].IsBlack = true
	}

	if isConnected(grid) {
		t.Error("Grid with vertical wall should be disconnected")
	}
}

func TestIsConnected_LShape(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create an L-shaped connected region
	// Only bottom-left corner should be white, rest black except L-shape
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}

	// Create an L-shape of white cells that includes the center
	grid.Cells[2][2].IsBlack = false // center
	grid.Cells[1][2].IsBlack = false
	grid.Cells[0][2].IsBlack = false
	grid.Cells[2][1].IsBlack = false
	grid.Cells[2][0].IsBlack = false

	if !isConnected(grid) {
		t.Error("L-shaped connected region should be connected")
	}
}

func TestIsConnected_LShapeDisconnected(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create two separate L-shapes that don't connect
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}

	// Top-left L (doesn't include center)
	grid.Cells[0][0].IsBlack = false
	grid.Cells[0][1].IsBlack = false
	grid.Cells[1][0].IsBlack = false

	// Bottom-right L (doesn't include center)
	grid.Cells[3][4].IsBlack = false
	grid.Cells[4][4].IsBlack = false
	grid.Cells[4][3].IsBlack = false

	// Center is black, so we need to make it white for the test
	// But these regions are separated, so let's keep center black
	// This should be disconnected since center is black

	if isConnected(grid) {
		t.Error("Disconnected L-shapes with black center should be disconnected")
	}
}

func TestIsConnected_CenterBlack(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Make only the center cell black
	grid.Cells[2][2].IsBlack = true

	// Even though all other white cells are connected,
	// we can't start flood fill from center
	if isConnected(grid) {
		t.Error("Grid with black center cell should return false (can't start flood fill)")
	}
}

func TestIsConnected_SymmetricPattern(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a symmetric pattern with black corners
	grid.Cells[0][0].IsBlack = true
	grid.Cells[4][4].IsBlack = true
	grid.Cells[0][4].IsBlack = true
	grid.Cells[4][0].IsBlack = true

	// All white cells should still be connected
	if !isConnected(grid) {
		t.Error("Grid with symmetric corner blacks should be connected")
	}
}

func TestIsConnected_CheckerboardPattern(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a checkerboard pattern - this will disconnect the grid
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			if (row+col)%2 == 1 {
				grid.Cells[row][col].IsBlack = true
			}
		}
	}

	if isConnected(grid) {
		t.Error("Checkerboard pattern should be disconnected")
	}
}

func TestIsConnected_LargeGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Add some scattered black cells
	grid.Cells[0][0].IsBlack = true
	grid.Cells[14][14].IsBlack = true
	grid.Cells[3][5].IsBlack = true
	grid.Cells[11][9].IsBlack = true

	// Should still be connected
	if !isConnected(grid) {
		t.Error("15x15 grid with scattered black cells should be connected")
	}
}

func TestIsConnected_NilGrid(t *testing.T) {
	var grid *Grid = nil

	if isConnected(grid) {
		t.Error("Nil grid should return false")
	}
}

func TestIsConnected_ZeroSizeGrid(t *testing.T) {
	grid := &Grid{
		Size:  0,
		Cells: nil,
	}

	if isConnected(grid) {
		t.Error("Zero-size grid should return false")
	}
}

func TestIsConnected_AllBlackCells(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Make all cells black
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}

	if isConnected(grid) {
		t.Error("Grid with all black cells should return false")
	}
}

func TestIsConnected_BorderPattern(t *testing.T) {
	config := GridConfig{Size: 7}
	grid := NewEmptyGrid(config)

	// Create a border of black cells with white interior
	for i := 0; i < 7; i++ {
		grid.Cells[0][i].IsBlack = true      // top row
		grid.Cells[6][i].IsBlack = true      // bottom row
		grid.Cells[i][0].IsBlack = true      // left column
		grid.Cells[i][6].IsBlack = true      // right column
	}

	// The interior white cells should be connected (includes center at 3,3)
	if !isConnected(grid) {
		t.Error("Grid with black border and white interior should be connected")
	}
}

func TestIsConnected_SpiralPattern(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a spiral pattern of black cells that doesn't disconnect
	grid.Cells[0][1].IsBlack = true
	grid.Cells[0][2].IsBlack = true
	grid.Cells[0][3].IsBlack = true
	grid.Cells[1][3].IsBlack = true
	grid.Cells[2][3].IsBlack = true
	grid.Cells[3][3].IsBlack = true
	grid.Cells[3][2].IsBlack = true
	grid.Cells[3][1].IsBlack = true

	// White cells should still be connected through the gaps
	if !isConnected(grid) {
		t.Error("Grid with spiral pattern should be connected")
	}
}

func TestErrDisconnectedGrid(t *testing.T) {
	if ErrDisconnectedGrid == nil {
		t.Error("ErrDisconnectedGrid should be defined")
	}

	expectedMsg := "grid has disconnected regions: not all white cells are reachable"
	if ErrDisconnectedGrid.Error() != expectedMsg {
		t.Errorf("ErrDisconnectedGrid message = %q, want %q", ErrDisconnectedGrid.Error(), expectedMsg)
	}
}

func TestFloodFill_CountsCorrectly(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a simple pattern
	grid.Cells[0][0].IsBlack = true
	grid.Cells[4][4].IsBlack = true

	visited := make([][]bool, grid.Size)
	for i := range visited {
		visited[i] = make([]bool, grid.Size)
	}

	count := floodFill(grid, 2, 2, visited)

	// Should reach 23 cells (25 total - 2 black cells)
	expectedCount := 23
	if count != expectedCount {
		t.Errorf("floodFill count = %d, want %d", count, expectedCount)
	}
}

func TestFloodFill_VisitsAdjacentOnly(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	// Make all cells black except center and one corner
	for row := 0; row < 3; row++ {
		for col := 0; col < 3; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}
	grid.Cells[1][1].IsBlack = false // center
	grid.Cells[0][0].IsBlack = false // corner (diagonal, not adjacent)

	visited := make([][]bool, grid.Size)
	for i := range visited {
		visited[i] = make([]bool, grid.Size)
	}

	count := floodFill(grid, 1, 1, visited)

	// Should only reach center (1 cell), not the diagonal corner
	if count != 1 {
		t.Errorf("floodFill count = %d, want 1 (diagonal cells should not be connected)", count)
	}

	if visited[0][0] {
		t.Error("floodFill should not visit diagonal cells")
	}
}
