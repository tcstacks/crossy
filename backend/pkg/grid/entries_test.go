package grid

import "testing"

func TestComputeEntries_EmptyGrid(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	computeEntries(grid)

	// A 3x3 empty grid should have 6 entries (3 across + 3 down)
	if len(grid.Entries) != 6 {
		t.Errorf("Expected 6 entries, got %d", len(grid.Entries))
	}

	// Check across entries
	acrossCount := 0
	downCount := 0
	for _, entry := range grid.Entries {
		if entry.Direction == ACROSS {
			acrossCount++
		} else {
			downCount++
		}
	}

	if acrossCount != 3 {
		t.Errorf("Expected 3 across entries, got %d", acrossCount)
	}
	if downCount != 3 {
		t.Errorf("Expected 3 down entries, got %d", downCount)
	}
}

func TestComputeEntries_WithBlackSquares(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a simple pattern with black squares
	// . . . # .
	// . . . # .
	// . . . # .
	// # # # # #
	// . . . # .
	grid.Cells[0][3].IsBlack = true
	grid.Cells[1][3].IsBlack = true
	grid.Cells[2][3].IsBlack = true
	grid.Cells[3][0].IsBlack = true
	grid.Cells[3][1].IsBlack = true
	grid.Cells[3][2].IsBlack = true
	grid.Cells[3][3].IsBlack = true
	grid.Cells[3][4].IsBlack = true
	grid.Cells[4][3].IsBlack = true

	computeEntries(grid)

	// Verify we have entries
	if len(grid.Entries) == 0 {
		t.Fatal("Expected entries, got none")
	}

	// Check that entries have correct StartRow, StartCol, Length
	for i, entry := range grid.Entries {
		if entry.StartRow < 0 || entry.StartRow >= grid.Size {
			t.Errorf("Entry %d has invalid StartRow: %d", i, entry.StartRow)
		}
		if entry.StartCol < 0 || entry.StartCol >= grid.Size {
			t.Errorf("Entry %d has invalid StartCol: %d", i, entry.StartCol)
		}
		if entry.Length < 2 {
			t.Errorf("Entry %d has invalid Length: %d (should be >= 2)", i, entry.Length)
		}
		if len(entry.Cells) != entry.Length {
			t.Errorf("Entry %d: len(Cells) = %d, want %d", i, len(entry.Cells), entry.Length)
		}
	}
}

func TestComputeEntries_CellsArePointers(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	computeEntries(grid)

	// Verify that Entry.Cells contains pointers to actual grid cells
	for i, entry := range grid.Entries {
		for j, cell := range entry.Cells {
			if cell == nil {
				t.Errorf("Entry %d, Cell %d is nil", i, j)
				continue
			}

			// Verify this is the same pointer as in the grid
			expectedCell := grid.Cells[cell.Row][cell.Col]
			if cell != expectedCell {
				t.Errorf("Entry %d, Cell %d is not a pointer to the grid cell", i, j)
			}
		}
	}
}

func TestComputeEntries_AcrossScanOrder(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	// Place a black square to create distinct entries
	grid.Cells[1][1].IsBlack = true

	computeEntries(grid)

	// Filter across entries
	var acrossEntries []*Entry
	for _, entry := range grid.Entries {
		if entry.Direction == ACROSS {
			acrossEntries = append(acrossEntries, entry)
		}
	}

	// Across entries should be scanned left-to-right, top-to-bottom
	// So they should appear in order: row 0, row 1 (left), row 1 (right), row 2
	if len(acrossEntries) < 2 {
		t.Fatalf("Expected at least 2 across entries, got %d", len(acrossEntries))
	}

	// Verify order: entries should be sorted by row, then by col
	for i := 1; i < len(acrossEntries); i++ {
		prev := acrossEntries[i-1]
		curr := acrossEntries[i]

		if prev.StartRow > curr.StartRow {
			t.Errorf("Across entries not in top-to-bottom order: entry %d row %d comes after entry %d row %d",
				i-1, prev.StartRow, i, curr.StartRow)
		} else if prev.StartRow == curr.StartRow && prev.StartCol > curr.StartCol {
			t.Errorf("Across entries not in left-to-right order on same row: entry %d col %d comes after entry %d col %d",
				i-1, prev.StartCol, i, curr.StartCol)
		}
	}
}

func TestComputeEntries_DownScanOrder(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	// Place a black square to create distinct entries
	grid.Cells[1][1].IsBlack = true

	computeEntries(grid)

	// Filter down entries
	var downEntries []*Entry
	for _, entry := range grid.Entries {
		if entry.Direction == DOWN {
			downEntries = append(downEntries, entry)
		}
	}

	// Down entries should be scanned top-to-bottom, left-to-right
	if len(downEntries) < 2 {
		t.Fatalf("Expected at least 2 down entries, got %d", len(downEntries))
	}

	// Verify order: entries should be sorted by row, then by col
	for i := 1; i < len(downEntries); i++ {
		prev := downEntries[i-1]
		curr := downEntries[i]

		if prev.StartRow > curr.StartRow {
			t.Errorf("Down entries not in top-to-bottom order: entry %d row %d comes after entry %d row %d",
				i-1, prev.StartRow, i, curr.StartRow)
		} else if prev.StartRow == curr.StartRow && prev.StartCol > curr.StartCol {
			t.Errorf("Down entries not in left-to-right order on same row: entry %d col %d comes after entry %d col %d",
				i-1, prev.StartCol, i, curr.StartCol)
		}
	}
}

func TestComputeEntries_CorrectStartPositions(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a simple cross pattern
	// . . . . .
	// . . # . .
	// . . . . .
	// . . # . .
	// . . . . .
	grid.Cells[1][2].IsBlack = true
	grid.Cells[3][2].IsBlack = true

	computeEntries(grid)

	// Check specific across entries
	for _, entry := range grid.Entries {
		if entry.Direction == ACROSS && entry.StartRow == 1 && entry.StartCol == 0 {
			// This should be a 2-cell entry (cols 0-1)
			if entry.Length != 2 {
				t.Errorf("Expected length 2 for entry at (1,0), got %d", entry.Length)
			}
		}
		if entry.Direction == ACROSS && entry.StartRow == 1 && entry.StartCol == 3 {
			// This should be a 2-cell entry (cols 3-4)
			if entry.Length != 2 {
				t.Errorf("Expected length 2 for entry at (1,3), got %d", entry.Length)
			}
		}
	}

	// Check specific down entries
	for _, entry := range grid.Entries {
		if entry.Direction == DOWN && entry.StartRow == 0 && entry.StartCol == 2 {
			// This should be a 1-cell entry, which shouldn't exist (< 2)
			t.Errorf("Found down entry at (0,2) with length %d, should not exist (length < 2)", entry.Length)
		}
	}
}

func TestComputeEntries_CorrectCellPositions(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	computeEntries(grid)

	// Check that cells in each entry are in the correct positions
	for i, entry := range grid.Entries {
		for j, cell := range entry.Cells {
			if entry.Direction == ACROSS {
				expectedRow := entry.StartRow
				expectedCol := entry.StartCol + j
				if cell.Row != expectedRow || cell.Col != expectedCol {
					t.Errorf("Entry %d (ACROSS), Cell %d: expected (%d,%d), got (%d,%d)",
						i, j, expectedRow, expectedCol, cell.Row, cell.Col)
				}
			} else {
				expectedRow := entry.StartRow + j
				expectedCol := entry.StartCol
				if cell.Row != expectedRow || cell.Col != expectedCol {
					t.Errorf("Entry %d (DOWN), Cell %d: expected (%d,%d), got (%d,%d)",
						i, j, expectedRow, expectedCol, cell.Row, cell.Col)
				}
			}
		}
	}
}

func TestComputeEntries_MinimumWordLength(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a pattern where some slots are only 1 cell
	// . # . # .
	// # . # . #
	// . # . # .
	// # . # . #
	// . # . # .
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			if (row+col)%2 == 1 {
				grid.Cells[row][col].IsBlack = true
			}
		}
	}

	computeEntries(grid)

	// All entries should have length >= 2
	for i, entry := range grid.Entries {
		if entry.Length < 2 {
			t.Errorf("Entry %d has length %d, expected >= 2", i, entry.Length)
		}
	}

	// In this checkerboard pattern, there should be no entries at all
	// since no two adjacent cells are both white
	if len(grid.Entries) != 0 {
		t.Errorf("Expected 0 entries in checkerboard pattern, got %d", len(grid.Entries))
	}
}

func TestComputeEntries_ClueNumbering(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a simple pattern
	// . . . # .
	// . . . # .
	// . . . . .
	// # # # # #
	// . . . # .
	grid.Cells[0][3].IsBlack = true
	grid.Cells[1][3].IsBlack = true
	grid.Cells[3][0].IsBlack = true
	grid.Cells[3][1].IsBlack = true
	grid.Cells[3][2].IsBlack = true
	grid.Cells[3][3].IsBlack = true
	grid.Cells[3][4].IsBlack = true
	grid.Cells[4][3].IsBlack = true

	computeEntries(grid)

	// Verify that clue numbers are assigned correctly
	// Cell (0,0) should be clue 1 (starts both across and down)
	if grid.Cells[0][0].Number != 1 {
		t.Errorf("Cell (0,0) should have clue number 1, got %d", grid.Cells[0][0].Number)
	}

	// Check that entries have correct clue numbers
	for i, entry := range grid.Entries {
		if entry.Number <= 0 {
			t.Errorf("Entry %d has invalid clue number: %d", i, entry.Number)
		}

		// Verify the clue number matches the cell's number
		startCell := grid.Cells[entry.StartRow][entry.StartCol]
		if entry.Number != startCell.Number {
			t.Errorf("Entry %d: clue number %d doesn't match start cell number %d",
				i, entry.Number, startCell.Number)
		}
	}
}

func TestComputeEntries_ClearsExistingEntries(t *testing.T) {
	config := GridConfig{Size: 3}
	grid := NewEmptyGrid(config)

	// Add some fake entries
	grid.Entries = []*Entry{
		{Number: 999, Direction: ACROSS, StartRow: 0, StartCol: 0, Length: 3},
	}

	computeEntries(grid)

	// Verify that old entries were cleared
	for _, entry := range grid.Entries {
		if entry.Number == 999 {
			t.Error("Old entries were not cleared")
		}
	}
}

func TestComputeEntries_LargerGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Place some black squares in a symmetric pattern
	blackPositions := [][2]int{
		{0, 3}, {0, 11},
		{3, 0}, {3, 14},
		{11, 0}, {11, 14},
		{14, 3}, {14, 11},
	}

	for _, pos := range blackPositions {
		grid.Cells[pos[0]][pos[1]].IsBlack = true
	}

	computeEntries(grid)

	// Should have many entries
	if len(grid.Entries) == 0 {
		t.Error("Expected entries in 15x15 grid, got none")
	}

	// Verify all entries are valid
	for i, entry := range grid.Entries {
		if entry.Length < 2 {
			t.Errorf("Entry %d has invalid length: %d", i, entry.Length)
		}
		if len(entry.Cells) != entry.Length {
			t.Errorf("Entry %d: Cell count mismatch", i)
		}
		if entry.Number <= 0 {
			t.Errorf("Entry %d has invalid clue number: %d", i, entry.Number)
		}
	}
}
