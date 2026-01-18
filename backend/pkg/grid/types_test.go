package grid

import "testing"

func TestDirection_String(t *testing.T) {
	tests := []struct {
		name string
		dir  Direction
		want string
	}{
		{
			name: "ACROSS direction",
			dir:  ACROSS,
			want: "across",
		},
		{
			name: "DOWN direction",
			dir:  DOWN,
			want: "down",
		},
		{
			name: "Invalid direction",
			dir:  Direction(99),
			want: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.dir.String(); got != tt.want {
				t.Errorf("Direction.String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCell_Creation(t *testing.T) {
	cell := Cell{
		Row:     5,
		Col:     3,
		IsBlack: false,
		Letter:  'A',
		Number:  12,
	}

	if cell.Row != 5 {
		t.Errorf("Cell.Row = %v, want %v", cell.Row, 5)
	}
	if cell.Col != 3 {
		t.Errorf("Cell.Col = %v, want %v", cell.Col, 3)
	}
	if cell.IsBlack {
		t.Errorf("Cell.IsBlack = %v, want %v", cell.IsBlack, false)
	}
	if cell.Letter != 'A' {
		t.Errorf("Cell.Letter = %v, want %v", cell.Letter, 'A')
	}
	if cell.Number != 12 {
		t.Errorf("Cell.Number = %v, want %v", cell.Number, 12)
	}
}

func TestCell_BlackCell(t *testing.T) {
	cell := Cell{
		Row:     0,
		Col:     0,
		IsBlack: true,
		Letter:  0,
		Number:  0,
	}

	if !cell.IsBlack {
		t.Errorf("Cell.IsBlack = %v, want %v", cell.IsBlack, true)
	}
	if cell.Letter != 0 {
		t.Errorf("Black cell should have Letter = 0, got %v", cell.Letter)
	}
}

func TestEntry_Creation(t *testing.T) {
	cells := []*Cell{
		{Row: 0, Col: 0, Letter: 'H'},
		{Row: 0, Col: 1, Letter: 'E'},
		{Row: 0, Col: 2, Letter: 'L'},
		{Row: 0, Col: 3, Letter: 'L'},
		{Row: 0, Col: 4, Letter: 'O'},
	}

	entry := Entry{
		Number:    1,
		Direction: ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     cells,
	}

	if entry.Number != 1 {
		t.Errorf("Entry.Number = %v, want %v", entry.Number, 1)
	}
	if entry.Direction != ACROSS {
		t.Errorf("Entry.Direction = %v, want %v", entry.Direction, ACROSS)
	}
	if entry.StartRow != 0 {
		t.Errorf("Entry.StartRow = %v, want %v", entry.StartRow, 0)
	}
	if entry.StartCol != 0 {
		t.Errorf("Entry.StartCol = %v, want %v", entry.StartCol, 0)
	}
	if entry.Length != 5 {
		t.Errorf("Entry.Length = %v, want %v", entry.Length, 5)
	}
	if len(entry.Cells) != 5 {
		t.Errorf("Entry.Cells length = %v, want %v", len(entry.Cells), 5)
	}
}

func TestEntry_DownDirection(t *testing.T) {
	cells := []*Cell{
		{Row: 0, Col: 0, Letter: 'W'},
		{Row: 1, Col: 0, Letter: 'O'},
		{Row: 2, Col: 0, Letter: 'R'},
		{Row: 3, Col: 0, Letter: 'D'},
	}

	entry := Entry{
		Number:    2,
		Direction: DOWN,
		StartRow:  0,
		StartCol:  0,
		Length:    4,
		Cells:     cells,
	}

	if entry.Direction != DOWN {
		t.Errorf("Entry.Direction = %v, want %v", entry.Direction, DOWN)
	}
	if entry.Direction.String() != "down" {
		t.Errorf("Entry.Direction.String() = %v, want %v", entry.Direction.String(), "down")
	}
}

func TestGrid_Creation(t *testing.T) {
	size := 15
	cells := make([][]*Cell, size)
	for i := 0; i < size; i++ {
		cells[i] = make([]*Cell, size)
		for j := 0; j < size; j++ {
			cells[i][j] = &Cell{
				Row:     i,
				Col:     j,
				IsBlack: false,
				Letter:  0,
				Number:  0,
			}
		}
	}

	grid := Grid{
		Size:    size,
		Cells:   cells,
		Entries: []*Entry{},
	}

	if grid.Size != 15 {
		t.Errorf("Grid.Size = %v, want %v", grid.Size, 15)
	}
	if len(grid.Cells) != 15 {
		t.Errorf("len(Grid.Cells) = %v, want %v", len(grid.Cells), 15)
	}
	if len(grid.Cells[0]) != 15 {
		t.Errorf("len(Grid.Cells[0]) = %v, want %v", len(grid.Cells[0]), 15)
	}
	if len(grid.Entries) != 0 {
		t.Errorf("len(Grid.Entries) = %v, want %v", len(grid.Entries), 0)
	}
}

func TestGrid_WithEntries(t *testing.T) {
	size := 5
	cells := make([][]*Cell, size)
	for i := 0; i < size; i++ {
		cells[i] = make([]*Cell, size)
		for j := 0; j < size; j++ {
			cells[i][j] = &Cell{
				Row:     i,
				Col:     j,
				IsBlack: false,
				Letter:  0,
				Number:  0,
			}
		}
	}

	// Create some entries
	entry1 := &Entry{
		Number:    1,
		Direction: ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     cells[0],
	}

	entry2 := &Entry{
		Number:    1,
		Direction: DOWN,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     []*Cell{cells[0][0], cells[1][0], cells[2][0], cells[3][0], cells[4][0]},
	}

	grid := Grid{
		Size:    size,
		Cells:   cells,
		Entries: []*Entry{entry1, entry2},
	}

	if len(grid.Entries) != 2 {
		t.Errorf("len(Grid.Entries) = %v, want %v", len(grid.Entries), 2)
	}
	if grid.Entries[0].Direction != ACROSS {
		t.Errorf("First entry direction = %v, want %v", grid.Entries[0].Direction, ACROSS)
	}
	if grid.Entries[1].Direction != DOWN {
		t.Errorf("Second entry direction = %v, want %v", grid.Entries[1].Direction, DOWN)
	}
}

func TestCell_EmptyCell(t *testing.T) {
	cell := Cell{}

	if cell.Row != 0 {
		t.Errorf("Empty Cell.Row = %v, want %v", cell.Row, 0)
	}
	if cell.Col != 0 {
		t.Errorf("Empty Cell.Col = %v, want %v", cell.Col, 0)
	}
	if cell.IsBlack {
		t.Errorf("Empty Cell.IsBlack = %v, want %v", cell.IsBlack, false)
	}
	if cell.Letter != 0 {
		t.Errorf("Empty Cell.Letter = %v, want %v", cell.Letter, 0)
	}
	if cell.Number != 0 {
		t.Errorf("Empty Cell.Number = %v, want %v", cell.Number, 0)
	}
}

func TestEntry_EmptyEntry(t *testing.T) {
	entry := Entry{}

	if entry.Number != 0 {
		t.Errorf("Empty Entry.Number = %v, want %v", entry.Number, 0)
	}
	if entry.Direction != ACROSS {
		t.Errorf("Empty Entry.Direction = %v, want %v", entry.Direction, ACROSS)
	}
	if entry.StartRow != 0 {
		t.Errorf("Empty Entry.StartRow = %v, want %v", entry.StartRow, 0)
	}
	if entry.StartCol != 0 {
		t.Errorf("Empty Entry.StartCol = %v, want %v", entry.StartCol, 0)
	}
	if entry.Length != 0 {
		t.Errorf("Empty Entry.Length = %v, want %v", entry.Length, 0)
	}
	if entry.Cells != nil {
		t.Errorf("Empty Entry.Cells = %v, want %v", entry.Cells, nil)
	}
}

func TestNewEmptyGrid_15x15(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	if grid == nil {
		t.Fatal("NewEmptyGrid returned nil")
	}

	if grid.Size != 15 {
		t.Errorf("Grid.Size = %v, want %v", grid.Size, 15)
	}

	if len(grid.Cells) != 15 {
		t.Errorf("len(Grid.Cells) = %v, want %v", len(grid.Cells), 15)
	}

	// Check all cells are properly initialized
	for i := 0; i < 15; i++ {
		if len(grid.Cells[i]) != 15 {
			t.Errorf("len(Grid.Cells[%d]) = %v, want %v", i, len(grid.Cells[i]), 15)
		}

		for j := 0; j < 15; j++ {
			cell := grid.Cells[i][j]
			if cell == nil {
				t.Fatalf("Grid.Cells[%d][%d] is nil", i, j)
			}

			if cell.Row != i {
				t.Errorf("Grid.Cells[%d][%d].Row = %v, want %v", i, j, cell.Row, i)
			}

			if cell.Col != j {
				t.Errorf("Grid.Cells[%d][%d].Col = %v, want %v", i, j, cell.Col, j)
			}

			if cell.IsBlack {
				t.Errorf("Grid.Cells[%d][%d].IsBlack = %v, want %v", i, j, cell.IsBlack, false)
			}

			if cell.Letter != 0 {
				t.Errorf("Grid.Cells[%d][%d].Letter = %v, want %v", i, j, cell.Letter, 0)
			}

			if cell.Number != 0 {
				t.Errorf("Grid.Cells[%d][%d].Number = %v, want %v", i, j, cell.Number, 0)
			}
		}
	}

	if len(grid.Entries) != 0 {
		t.Errorf("len(Grid.Entries) = %v, want %v", len(grid.Entries), 0)
	}
}

func TestNewEmptyGrid_ConfigurableSize(t *testing.T) {
	tests := []struct {
		name string
		size int
	}{
		{
			name: "5x5 grid",
			size: 5,
		},
		{
			name: "10x10 grid",
			size: 10,
		},
		{
			name: "15x15 grid",
			size: 15,
		},
		{
			name: "21x21 grid",
			size: 21,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := GridConfig{Size: tt.size}
			grid := NewEmptyGrid(config)

			if grid.Size != tt.size {
				t.Errorf("Grid.Size = %v, want %v", grid.Size, tt.size)
			}

			if len(grid.Cells) != tt.size {
				t.Errorf("len(Grid.Cells) = %v, want %v", len(grid.Cells), tt.size)
			}

			for i := 0; i < tt.size; i++ {
				if len(grid.Cells[i]) != tt.size {
					t.Errorf("len(Grid.Cells[%d]) = %v, want %v", i, len(grid.Cells[i]), tt.size)
				}
			}

			if len(grid.Entries) != 0 {
				t.Errorf("len(Grid.Entries) = %v, want %v", len(grid.Entries), 0)
			}
		})
	}
}

func TestNewEmptyGrid_AllCellsWhite(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	for i := 0; i < grid.Size; i++ {
		for j := 0; j < grid.Size; j++ {
			if grid.Cells[i][j].IsBlack {
				t.Errorf("Grid.Cells[%d][%d] should be white, got black", i, j)
			}
		}
	}
}

func TestNewEmptyGrid_AllCellsUnfilled(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	for i := 0; i < grid.Size; i++ {
		for j := 0; j < grid.Size; j++ {
			if grid.Cells[i][j].Letter != 0 {
				t.Errorf("Grid.Cells[%d][%d].Letter = %v, want 0 (unfilled)", i, j, grid.Cells[i][j].Letter)
			}
		}
	}
}

func TestNewEmptyGrid_AllCellsNoClueNumber(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	for i := 0; i < grid.Size; i++ {
		for j := 0; j < grid.Size; j++ {
			if grid.Cells[i][j].Number != 0 {
				t.Errorf("Grid.Cells[%d][%d].Number = %v, want 0 (no clue number)", i, j, grid.Cells[i][j].Number)
			}
		}
	}
}
