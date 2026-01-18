package fill

import (
	"testing"

	"github.com/crossplay/backend/pkg/grid"
)

func TestPlaceWord(t *testing.T) {
	tests := []struct {
		name        string
		entry       *grid.Entry
		word        string
		wantErr     bool
		errContains string
	}{
		{
			name: "valid placement",
			entry: &grid.Entry{
				Length: 4,
				Cells: []*grid.Cell{
					{Row: 0, Col: 0, Letter: 0},
					{Row: 0, Col: 1, Letter: 0},
					{Row: 0, Col: 2, Letter: 0},
					{Row: 0, Col: 3, Letter: 0},
				},
			},
			word:    "JAZZ",
			wantErr: false,
		},
		{
			name: "word too short",
			entry: &grid.Entry{
				Length: 4,
				Cells: []*grid.Cell{
					{Row: 0, Col: 0, Letter: 0},
					{Row: 0, Col: 1, Letter: 0},
					{Row: 0, Col: 2, Letter: 0},
					{Row: 0, Col: 3, Letter: 0},
				},
			},
			word:        "CAT",
			wantErr:     true,
			errContains: "does not match entry length",
		},
		{
			name: "word too long",
			entry: &grid.Entry{
				Length: 3,
				Cells: []*grid.Cell{
					{Row: 0, Col: 0, Letter: 0},
					{Row: 0, Col: 1, Letter: 0},
					{Row: 0, Col: 2, Letter: 0},
				},
			},
			word:        "CATS",
			wantErr:     true,
			errContains: "does not match entry length",
		},
		{
			name:        "nil entry",
			entry:       nil,
			word:        "TEST",
			wantErr:     true,
			errContains: "entry cannot be nil",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := placeWord(tt.entry, tt.word)
			if (err != nil) != tt.wantErr {
				t.Errorf("placeWord() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err != nil {
				if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("placeWord() error = %v, want error containing %q", err, tt.errContains)
				}
				return
			}

			// Verify letters were placed correctly
			if tt.entry != nil {
				for i, cell := range tt.entry.Cells {
					if cell.Letter != rune(tt.word[i]) {
						t.Errorf("cell %d: got letter %c, want %c", i, cell.Letter, tt.word[i])
					}
				}
			}
		})
	}
}

func TestRemoveWord_NoCrossings(t *testing.T) {
	// Create a simple grid with one entry
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    4,
		Cells: []*grid.Cell{
			g.Cells[0][0],
			g.Cells[0][1],
			g.Cells[0][2],
			g.Cells[0][3],
		},
	}

	g.Entries = []*grid.Entry{entry}

	// Place a word
	err := placeWord(entry, "TEST")
	if err != nil {
		t.Fatalf("placeWord() error = %v", err)
	}

	// Verify placement
	for i, cell := range entry.Cells {
		if cell.Letter != rune("TEST"[i]) {
			t.Errorf("before removal: cell %d: got letter %c, want %c", i, cell.Letter, "TEST"[i])
		}
	}

	// Remove the word
	removeWord(entry, g)

	// Verify all cells are cleared
	for i, cell := range entry.Cells {
		if cell.Letter != 0 {
			t.Errorf("after removal: cell %d: got letter %c, want 0", i, cell.Letter)
		}
	}
}

func TestRemoveWord_WithCrossings(t *testing.T) {
	// Create a grid with crossing entries
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create an ACROSS entry at (1, 1) - "JAZZ"
	acrossEntry := &grid.Entry{
		Direction: grid.ACROSS,
		StartRow:  1,
		StartCol:  1,
		Length:    4,
		Cells: []*grid.Cell{
			g.Cells[1][1], // J
			g.Cells[1][2], // A
			g.Cells[1][3], // Z
			g.Cells[1][4], // Z
		},
	}

	// Create a DOWN entry at (0, 2) crossing at (1, 2) - "CATS"
	downEntry := &grid.Entry{
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    4,
		Cells: []*grid.Cell{
			g.Cells[0][2], // C
			g.Cells[1][2], // A (crossing with JAZZ)
			g.Cells[2][2], // T
			g.Cells[3][2], // S
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry}

	// Place both words
	err := placeWord(acrossEntry, "JAZZ")
	if err != nil {
		t.Fatalf("placeWord(JAZZ) error = %v", err)
	}

	err = placeWord(downEntry, "CATS")
	if err != nil {
		t.Fatalf("placeWord(CATS) error = %v", err)
	}

	// Remove the ACROSS entry
	removeWord(acrossEntry, g)

	// Verify ACROSS cells are cleared except the crossing cell
	// J at (1, 1) should be cleared
	if g.Cells[1][1].Letter != 0 {
		t.Errorf("cell (1,1): got letter %c, want 0", g.Cells[1][1].Letter)
	}

	// A at (1, 2) should NOT be cleared (it's part of the filled DOWN entry)
	if g.Cells[1][2].Letter != 'A' {
		t.Errorf("cell (1,2): got letter %c, want 'A'", g.Cells[1][2].Letter)
	}

	// Z at (1, 3) should be cleared
	if g.Cells[1][3].Letter != 0 {
		t.Errorf("cell (1,3): got letter %c, want 0", g.Cells[1][3].Letter)
	}

	// Z at (1, 4) should be cleared
	if g.Cells[1][4].Letter != 0 {
		t.Errorf("cell (1,4): got letter %c, want 0", g.Cells[1][4].Letter)
	}

	// Verify DOWN entry is still intact
	expected := "CATS"
	for i, cell := range downEntry.Cells {
		if cell.Letter != rune(expected[i]) {
			t.Errorf("down entry cell %d: got letter %c, want %c", i, cell.Letter, expected[i])
		}
	}
}

func TestRemoveWord_WithPartialCrossing(t *testing.T) {
	// Test case where crossing entry is only partially filled
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create an ACROSS entry
	acrossEntry := &grid.Entry{
		Direction: grid.ACROSS,
		StartRow:  1,
		StartCol:  1,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[1][1],
			g.Cells[1][2],
			g.Cells[1][3],
		},
	}

	// Create a DOWN entry crossing at (1, 2) but only partially filled
	downEntry := &grid.Entry{
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][2], // Will be filled
			g.Cells[1][2], // Crossing - will be filled
			g.Cells[2][2], // Will be empty (not filled)
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry}

	// Place ACROSS word
	err := placeWord(acrossEntry, "CAT")
	if err != nil {
		t.Fatalf("placeWord(CAT) error = %v", err)
	}

	// Partially fill DOWN entry (only first two cells)
	downEntry.Cells[0].Letter = 'B'
	downEntry.Cells[1].Letter = 'A'
	// downEntry.Cells[2] remains empty (Letter = 0)

	// Remove the ACROSS entry
	removeWord(acrossEntry, g)

	// Since the DOWN entry is NOT completely filled, the crossing cell should be cleared
	if g.Cells[1][2].Letter != 0 {
		t.Errorf("cell (1,2): got letter %c, want 0 (crossing entry not fully filled)", g.Cells[1][2].Letter)
	}
}

func TestRemoveWord_NilInputs(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][0],
			g.Cells[0][1],
			g.Cells[0][2],
		},
	}

	// Test nil entry
	removeWord(nil, g)
	// Should not panic

	// Test nil grid
	removeWord(entry, nil)
	// Should not panic

	// Test both nil
	removeWord(nil, nil)
	// Should not panic
}

func TestIsEntryFilled(t *testing.T) {
	tests := []struct {
		name  string
		entry *grid.Entry
		want  bool
	}{
		{
			name: "fully filled entry",
			entry: &grid.Entry{
				Cells: []*grid.Cell{
					{Letter: 'T'},
					{Letter: 'E'},
					{Letter: 'S'},
					{Letter: 'T'},
				},
			},
			want: true,
		},
		{
			name: "partially filled entry",
			entry: &grid.Entry{
				Cells: []*grid.Cell{
					{Letter: 'T'},
					{Letter: 'E'},
					{Letter: 0},
					{Letter: 'T'},
				},
			},
			want: false,
		},
		{
			name: "empty entry",
			entry: &grid.Entry{
				Cells: []*grid.Cell{
					{Letter: 0},
					{Letter: 0},
					{Letter: 0},
				},
			},
			want: false,
		},
		{
			name:  "nil entry",
			entry: nil,
			want:  false,
		},
		{
			name: "entry with no cells",
			entry: &grid.Entry{
				Cells: []*grid.Cell{},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isEntryFilled(tt.entry); got != tt.want {
				t.Errorf("isEntryFilled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestConflictsWithFilled(t *testing.T) {
	tests := []struct {
		name          string
		setupEntry    func() *grid.Entry
		word          string
		wantConflict  bool
	}{
		{
			name: "no conflicts - all cells empty",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 0},
						{Row: 0, Col: 1, Letter: 0},
						{Row: 0, Col: 2, Letter: 0},
						{Row: 0, Col: 3, Letter: 0},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: false,
		},
		{
			name: "no conflicts - matching crossing letter",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 0},
						{Row: 0, Col: 1, Letter: 'A'},
						{Row: 0, Col: 2, Letter: 0},
						{Row: 0, Col: 3, Letter: 0},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: false,
		},
		{
			name: "no conflicts - all letters match",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 'J'},
						{Row: 0, Col: 1, Letter: 'A'},
						{Row: 0, Col: 2, Letter: 'Z'},
						{Row: 0, Col: 3, Letter: 'Z'},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: false,
		},
		{
			name: "conflict - first letter differs",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 'C'},
						{Row: 0, Col: 1, Letter: 0},
						{Row: 0, Col: 2, Letter: 0},
						{Row: 0, Col: 3, Letter: 0},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: true,
		},
		{
			name: "conflict - middle letter differs",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 0},
						{Row: 0, Col: 1, Letter: 'X'},
						{Row: 0, Col: 2, Letter: 0},
						{Row: 0, Col: 3, Letter: 0},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: true,
		},
		{
			name: "conflict - last letter differs",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 0},
						{Row: 0, Col: 1, Letter: 0},
						{Row: 0, Col: 2, Letter: 0},
						{Row: 0, Col: 3, Letter: 'Y'},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: true,
		},
		{
			name: "conflict - multiple letters differ",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 'C'},
						{Row: 0, Col: 1, Letter: 'A'},
						{Row: 0, Col: 2, Letter: 'T'},
						{Row: 0, Col: 3, Letter: 'S'},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: true,
		},
		{
			name: "no conflicts - partial fill with matching letters",
			setupEntry: func() *grid.Entry {
				return &grid.Entry{
					Length: 4,
					Cells: []*grid.Cell{
						{Row: 0, Col: 0, Letter: 'J'},
						{Row: 0, Col: 1, Letter: 0},
						{Row: 0, Col: 2, Letter: 'Z'},
						{Row: 0, Col: 3, Letter: 0},
					},
				}
			},
			word:         "JAZZ",
			wantConflict: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entry := tt.setupEntry()
			got := conflictsWithFilled(entry, tt.word)
			if got != tt.wantConflict {
				t.Errorf("conflictsWithFilled() = %v, want %v", got, tt.wantConflict)
			}
		})
	}
}

func TestConflictsWithFilled_EdgeCases(t *testing.T) {
	tests := []struct {
		name          string
		entry         *grid.Entry
		word          string
		wantConflict  bool
		description   string
	}{
		{
			name:          "nil entry",
			entry:         nil,
			word:          "TEST",
			wantConflict:  true,
			description:   "nil entry should be treated as a conflict",
		},
		{
			name: "word length mismatch - too short",
			entry: &grid.Entry{
				Length: 4,
				Cells: []*grid.Cell{
					{Letter: 0},
					{Letter: 0},
					{Letter: 0},
					{Letter: 0},
				},
			},
			word:          "CAT",
			wantConflict:  true,
			description:   "word shorter than entry should be treated as a conflict",
		},
		{
			name: "word length mismatch - too long",
			entry: &grid.Entry{
				Length: 3,
				Cells: []*grid.Cell{
					{Letter: 0},
					{Letter: 0},
					{Letter: 0},
				},
			},
			word:          "CATS",
			wantConflict:  true,
			description:   "word longer than entry should be treated as a conflict",
		},
		{
			name: "cells array mismatch",
			entry: &grid.Entry{
				Length: 4,
				Cells: []*grid.Cell{
					{Letter: 0},
					{Letter: 0},
				},
			},
			word:          "JAZZ",
			wantConflict:  true,
			description:   "word length not matching cells length should be treated as a conflict",
		},
		{
			name: "empty entry with empty word",
			entry: &grid.Entry{
				Length: 0,
				Cells:  []*grid.Cell{},
			},
			word:          "",
			wantConflict:  false,
			description:   "empty entry with empty word should not conflict",
		},
		{
			name: "single letter - no conflict",
			entry: &grid.Entry{
				Length: 1,
				Cells: []*grid.Cell{
					{Letter: 0},
				},
			},
			word:          "A",
			wantConflict:  false,
			description:   "single letter with empty cell should not conflict",
		},
		{
			name: "single letter - matching",
			entry: &grid.Entry{
				Length: 1,
				Cells: []*grid.Cell{
					{Letter: 'A'},
				},
			},
			word:          "A",
			wantConflict:  false,
			description:   "single letter matching should not conflict",
		},
		{
			name: "single letter - conflict",
			entry: &grid.Entry{
				Length: 1,
				Cells: []*grid.Cell{
					{Letter: 'B'},
				},
			},
			word:          "A",
			wantConflict:  true,
			description:   "single letter not matching should conflict",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := conflictsWithFilled(tt.entry, tt.word)
			if got != tt.wantConflict {
				t.Errorf("conflictsWithFilled() = %v, want %v - %s", got, tt.wantConflict, tt.description)
			}
		})
	}
}

func TestConflictsWithFilled_RealWorldScenario(t *testing.T) {
	// Simulate a real crossword scenario with multiple crossing words
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Place an ACROSS word "CATS" at (1, 1)
	acrossEntry := &grid.Entry{
		Direction: grid.ACROSS,
		StartRow:  1,
		StartCol:  1,
		Length:    4,
		Cells: []*grid.Cell{
			g.Cells[1][1],
			g.Cells[1][2],
			g.Cells[1][3],
			g.Cells[1][4],
		},
	}

	err := placeWord(acrossEntry, "CATS")
	if err != nil {
		t.Fatalf("placeWord() error = %v", err)
	}

	// Now try to place a DOWN word crossing at (1, 2)
	downEntry := &grid.Entry{
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    4,
		Cells: []*grid.Cell{
			g.Cells[0][2],
			g.Cells[1][2], // Crossing with CATS (should have 'A')
			g.Cells[2][2],
			g.Cells[3][2],
		},
	}

	tests := []struct {
		name          string
		word          string
		wantConflict  bool
	}{
		{
			name:          "compatible word - BARN (has 'A' in position 1)",
			word:          "BARN",
			wantConflict:  false,
		},
		{
			name:          "compatible word - CAST (has 'A' in position 1)",
			word:          "CAST",
			wantConflict:  false,
		},
		{
			name:          "incompatible word - COIN (has 'O' in position 1, not 'A')",
			word:          "COIN",
			wantConflict:  true,
		},
		{
			name:          "incompatible word - BEST (has 'E' in position 1, not 'A')",
			word:          "BEST",
			wantConflict:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := conflictsWithFilled(downEntry, tt.word)
			if got != tt.wantConflict {
				t.Errorf("conflictsWithFilled() = %v, want %v for word %q", got, tt.wantConflict, tt.word)
			}
		})
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
