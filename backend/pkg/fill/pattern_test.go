package fill

import (
	"testing"

	"github.com/crossplay/backend/pkg/grid"
)

func TestGetPattern_EmptyEntry(t *testing.T) {
	// Test with nil entry
	pattern := getPattern(nil)
	if pattern != "" {
		t.Errorf("getPattern(nil) = %q, want empty string", pattern)
	}

	// Test with empty cells
	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    0,
		Cells:     []*grid.Cell{},
	}
	pattern = getPattern(entry)
	if pattern != "" {
		t.Errorf("getPattern(empty entry) = %q, want empty string", pattern)
	}
}

func TestGetPattern_AllUnfilled(t *testing.T) {
	// Create a 5-letter entry with all unfilled cells
	cells := []*grid.Cell{
		{Row: 0, Col: 0, IsBlack: false, Letter: 0, Number: 1},
		{Row: 0, Col: 1, IsBlack: false, Letter: 0, Number: 0},
		{Row: 0, Col: 2, IsBlack: false, Letter: 0, Number: 0},
		{Row: 0, Col: 3, IsBlack: false, Letter: 0, Number: 0},
		{Row: 0, Col: 4, IsBlack: false, Letter: 0, Number: 0},
	}

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     cells,
	}

	pattern := getPattern(entry)
	expected := "_____"
	if pattern != expected {
		t.Errorf("getPattern(all unfilled) = %q, want %q", pattern, expected)
	}
}

func TestGetPattern_AllFilled(t *testing.T) {
	// Create a 5-letter entry with all filled cells (HELLO)
	cells := []*grid.Cell{
		{Row: 0, Col: 0, IsBlack: false, Letter: 'H', Number: 1},
		{Row: 0, Col: 1, IsBlack: false, Letter: 'E', Number: 0},
		{Row: 0, Col: 2, IsBlack: false, Letter: 'L', Number: 0},
		{Row: 0, Col: 3, IsBlack: false, Letter: 'L', Number: 0},
		{Row: 0, Col: 4, IsBlack: false, Letter: 'O', Number: 0},
	}

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     cells,
	}

	pattern := getPattern(entry)
	expected := "HELLO"
	if pattern != expected {
		t.Errorf("getPattern(all filled) = %q, want %q", pattern, expected)
	}
}

func TestGetPattern_PartialllyFilled(t *testing.T) {
	// Create a 5-letter entry with some cells filled (H_LL_)
	cells := []*grid.Cell{
		{Row: 0, Col: 0, IsBlack: false, Letter: 'H', Number: 1},
		{Row: 0, Col: 1, IsBlack: false, Letter: 0, Number: 0},
		{Row: 0, Col: 2, IsBlack: false, Letter: 'L', Number: 0},
		{Row: 0, Col: 3, IsBlack: false, Letter: 'L', Number: 0},
		{Row: 0, Col: 4, IsBlack: false, Letter: 0, Number: 0},
	}

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells:     cells,
	}

	pattern := getPattern(entry)
	expected := "H_LL_"
	if pattern != expected {
		t.Errorf("getPattern(partially filled) = %q, want %q", pattern, expected)
	}
}

func TestGetPattern_WithCrossingLetters(t *testing.T) {
	// Simulate a grid where two words cross
	// Create a simple 5x5 grid
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Fill in some letters for an across word at row 2
	// We'll simulate the word "HELLO" across row 2, columns 0-4
	g.Cells[2][0].Letter = 'H'
	g.Cells[2][0].Number = 1
	g.Cells[2][1].Letter = 'E'
	g.Cells[2][2].Letter = 'L'
	g.Cells[2][3].Letter = 'L'
	g.Cells[2][4].Letter = 'O'

	// Create an across entry for "HELLO"
	acrossEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[2][0], // H
			g.Cells[2][1], // E
			g.Cells[2][2], // L
			g.Cells[2][3], // L
			g.Cells[2][4], // O
		},
	}

	pattern := getPattern(acrossEntry)
	expected := "HELLO"
	if pattern != expected {
		t.Errorf("getPattern(across with crossings) = %q, want %q", pattern, expected)
	}

	// Now create a down entry that crosses at column 2 (the 'L' in HELLO)
	// Only fill the crossing cell, leave others empty
	g.Cells[0][2].Number = 2
	g.Cells[1][2].Letter = 0 // Empty
	// g.Cells[2][2] already has 'L' from HELLO
	g.Cells[3][2].Letter = 0 // Empty
	g.Cells[4][2].Letter = 0 // Empty

	downEntry := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][2], // Empty
			g.Cells[1][2], // Empty
			g.Cells[2][2], // L (crossing from HELLO)
			g.Cells[3][2], // Empty
			g.Cells[4][2], // Empty
		},
	}

	pattern = getPattern(downEntry)
	expected = "__L__"
	if pattern != expected {
		t.Errorf("getPattern(down with crossing letter) = %q, want %q", pattern, expected)
	}
}

func TestGetPattern_LengthMatches(t *testing.T) {
	tests := []struct {
		name   string
		length int
	}{
		{"length 3", 3},
		{"length 5", 5},
		{"length 7", 7},
		{"length 10", 10},
		{"length 15", 15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cells := make([]*grid.Cell, tt.length)
			for i := 0; i < tt.length; i++ {
				cells[i] = &grid.Cell{
					Row:     0,
					Col:     i,
					IsBlack: false,
					Letter:  0,
					Number:  0,
				}
			}

			entry := &grid.Entry{
				Number:    1,
				Direction: grid.ACROSS,
				StartRow:  0,
				StartCol:  0,
				Length:    tt.length,
				Cells:     cells,
			}

			pattern := getPattern(entry)
			if len(pattern) != tt.length {
				t.Errorf("getPattern length = %d, want %d", len(pattern), tt.length)
			}
		})
	}
}

func TestGetPattern_MixedCase(t *testing.T) {
	// Test with lowercase letters (though typically uppercase is used)
	cells := []*grid.Cell{
		{Row: 0, Col: 0, IsBlack: false, Letter: 'a', Number: 1},
		{Row: 0, Col: 1, IsBlack: false, Letter: 'b', Number: 0},
		{Row: 0, Col: 2, IsBlack: false, Letter: 'c', Number: 0},
	}

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    3,
		Cells:     cells,
	}

	pattern := getPattern(entry)
	expected := "abc"
	if pattern != expected {
		t.Errorf("getPattern(lowercase) = %q, want %q", pattern, expected)
	}
}

func TestGetPattern_SingleLetter(t *testing.T) {
	// Edge case: single letter entry (though uncommon in crosswords)
	cells := []*grid.Cell{
		{Row: 0, Col: 0, IsBlack: false, Letter: 'A', Number: 1},
	}

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    1,
		Cells:     cells,
	}

	pattern := getPattern(entry)
	expected := "A"
	if pattern != expected {
		t.Errorf("getPattern(single letter) = %q, want %q", pattern, expected)
	}
}
