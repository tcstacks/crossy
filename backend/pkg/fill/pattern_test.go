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

// MockWordlist is a simple mock for testing
type MockWordlist struct {
	matchCounts map[string]int
}

func (m *MockWordlist) Match(pattern string) []string {
	count, ok := m.matchCounts[pattern]
	if !ok {
		return []string{}
	}
	// Return dummy results, count is what matters
	result := make([]string, count)
	for i := 0; i < count; i++ {
		result[i] = pattern // Dummy word
	}
	return result
}

func (m *MockWordlist) MatchWithScores(pattern string, minScore int) []WordCandidate {
	// For this simple mock, just return the same as Match but with dummy scores
	words := m.Match(pattern)
	result := make([]WordCandidate, len(words))
	for i, w := range words {
		result[i] = WordCandidate{
			Word:  w,
			Score: 50, // Default score that meets minimum
		}
	}
	return result
}

func TestCountCrossings(t *testing.T) {
	// Create a 5x5 grid with entries
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create across entry at row 2, cols 0-4
	acrossEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[2][0],
			g.Cells[2][1],
			g.Cells[2][2],
			g.Cells[2][3],
			g.Cells[2][4],
		},
	}

	// Create down entries that cross the across entry
	downEntry1 := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  1,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][1],
			g.Cells[1][1],
			g.Cells[2][1], // Crosses acrossEntry
			g.Cells[3][1],
			g.Cells[4][1],
		},
	}

	downEntry2 := &grid.Entry{
		Number:    3,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  3,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][3],
			g.Cells[1][3],
			g.Cells[2][3], // Crosses acrossEntry
			g.Cells[3][3],
			g.Cells[4][3],
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry1, downEntry2}

	// Test crossing count for across entry (should have 2 crossings)
	count := countCrossings(acrossEntry, g)
	if count != 2 {
		t.Errorf("countCrossings(acrossEntry) = %d, want 2", count)
	}

	// Test crossing count for down entry (should have 1 crossing)
	count = countCrossings(downEntry1, g)
	if count != 1 {
		t.Errorf("countCrossings(downEntry1) = %d, want 1", count)
	}

	// Test with nil entry
	count = countCrossings(nil, g)
	if count != 0 {
		t.Errorf("countCrossings(nil) = %d, want 0", count)
	}

	// Test with nil grid
	count = countCrossings(acrossEntry, nil)
	if count != 0 {
		t.Errorf("countCrossings(entry, nil) = %d, want 0", count)
	}
}

func TestGetPatternSpecificity(t *testing.T) {
	mockWL := &MockWordlist{
		matchCounts: map[string]int{
			"_____": 100,  // Many matches for blank pattern
			"H____": 50,   // Fewer matches with one letter
			"HE___": 10,   // Even fewer with two letters
			"HELLO": 1,    // Very specific pattern
		},
	}

	tests := []struct {
		name     string
		pattern  string
		expected int
	}{
		{"blank pattern", "_____", 100},
		{"one letter", "H____", 50},
		{"two letters", "HE___", 10},
		{"full word", "HELLO", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create entry with appropriate cells
			cells := make([]*grid.Cell, len(tt.pattern))
			for i, ch := range tt.pattern {
				letter := rune(0)
				if ch != '_' {
					letter = ch
				}
				cells[i] = &grid.Cell{
					Row:     0,
					Col:     i,
					IsBlack: false,
					Letter:  letter,
					Number:  0,
				}
			}

			entry := &grid.Entry{
				Number:    1,
				Direction: grid.ACROSS,
				StartRow:  0,
				StartCol:  0,
				Length:    len(tt.pattern),
				Cells:     cells,
			}

			specificity := getPatternSpecificity(entry, mockWL)
			if specificity != tt.expected {
				t.Errorf("getPatternSpecificity(%q) = %d, want %d", tt.pattern, specificity, tt.expected)
			}
		})
	}

	// Test with nil entry
	specificity := getPatternSpecificity(nil, mockWL)
	if specificity != 0 {
		t.Errorf("getPatternSpecificity(nil) = %d, want 0", specificity)
	}

	// Test with nil wordlist
	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			{Row: 0, Col: 0, IsBlack: false, Letter: 0, Number: 0},
		},
	}
	specificity = getPatternSpecificity(entry, nil)
	if specificity != 0 {
		t.Errorf("getPatternSpecificity(entry, nil) = %d, want 0", specificity)
	}
}

func TestIsCornerOrEdge(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	tests := []struct {
		name     string
		startRow int
		startCol int
		expected bool
	}{
		{"top-left corner", 0, 0, true},
		{"top-right corner", 0, 4, true},
		{"bottom-left corner", 4, 0, true},
		{"bottom-right corner", 4, 4, true},
		{"top edge", 0, 2, true},
		{"bottom edge", 4, 2, true},
		{"left edge", 2, 0, true},
		{"right edge", 2, 4, true},
		{"center", 2, 2, false},
		{"near center", 1, 1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entry := &grid.Entry{
				Number:    1,
				Direction: grid.ACROSS,
				StartRow:  tt.startRow,
				StartCol:  tt.startCol,
				Length:    3,
				Cells: []*grid.Cell{
					g.Cells[tt.startRow][tt.startCol],
				},
			}

			result := isCornerOrEdge(entry, g)
			if result != tt.expected {
				t.Errorf("isCornerOrEdge(%d, %d) = %v, want %v", tt.startRow, tt.startCol, result, tt.expected)
			}
		})
	}

	// Test with nil entry
	result := isCornerOrEdge(nil, g)
	if result != false {
		t.Errorf("isCornerOrEdge(nil) = %v, want false", result)
	}

	// Test with nil grid
	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    3,
		Cells:     []*grid.Cell{{Row: 0, Col: 0}},
	}
	result = isCornerOrEdge(entry, nil)
	if result != false {
		t.Errorf("isCornerOrEdge(entry, nil) = %v, want false", result)
	}

	// Test with empty cells
	entry = &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    0,
		Cells:     []*grid.Cell{},
	}
	result = isCornerOrEdge(entry, g)
	if result != false {
		t.Errorf("isCornerOrEdge(empty cells) = %v, want false", result)
	}
}

func TestSortByConstraint_Empty(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	mockWL := &MockWordlist{matchCounts: map[string]int{}}

	entries := []*grid.Entry{}
	sorted := sortByConstraint(entries, g, mockWL)

	if len(sorted) != 0 {
		t.Errorf("sortByConstraint(empty) returned %d entries, want 0", len(sorted))
	}
}

func TestSortByConstraint_ByCornerEdge(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	mockWL := &MockWordlist{
		matchCounts: map[string]int{
			"_____": 100, // All entries have same pattern
		},
	}

	// Create entries at different positions
	cornerEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][0], g.Cells[0][1], g.Cells[0][2], g.Cells[0][3], g.Cells[0][4],
		},
	}

	centerEntry := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  1,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[2][1], g.Cells[2][2], g.Cells[2][3],
		},
	}

	edgeEntry := &grid.Entry{
		Number:    3,
		Direction: grid.ACROSS,
		StartRow:  4,
		StartCol:  1,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[4][1], g.Cells[4][2], g.Cells[4][3],
		},
	}

	g.Entries = []*grid.Entry{centerEntry, cornerEntry, edgeEntry}

	entries := []*grid.Entry{centerEntry, cornerEntry, edgeEntry}
	sorted := sortByConstraint(entries, g, mockWL)

	// Corner and edge entries should come before center
	if sorted[len(sorted)-1] != centerEntry {
		t.Error("Center entry should be last")
	}
}

func TestSortByConstraint_ByCrossingCount(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	mockWL := &MockWordlist{
		matchCounts: map[string]int{
			"_____": 100,
		},
	}

	// Create across entry
	acrossEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[2][0], g.Cells[2][1], g.Cells[2][2], g.Cells[2][3], g.Cells[2][4],
		},
	}

	// Create down entries crossing the across entry
	downEntry1 := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  1,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][1], g.Cells[1][1], g.Cells[2][1], g.Cells[3][1], g.Cells[4][1],
		},
	}

	downEntry2 := &grid.Entry{
		Number:    3,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  3,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][3], g.Cells[1][3], g.Cells[2][3], g.Cells[3][3], g.Cells[4][3],
		},
	}

	// Across entry crosses 2 down entries, down entries each cross 1
	g.Entries = []*grid.Entry{acrossEntry, downEntry1, downEntry2}

	entries := []*grid.Entry{downEntry1, acrossEntry, downEntry2}
	sorted := sortByConstraint(entries, g, mockWL)

	// Across entry (2 crossings) should come before down entries (1 crossing each)
	if sorted[0] != acrossEntry {
		t.Errorf("Entry with most crossings should be first, got entry %d", sorted[0].Number)
	}
}

func TestSortByConstraint_ByPatternSpecificity(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	mockWL := &MockWordlist{
		matchCounts: map[string]int{
			"_____": 100,
			"H____": 50,
			"HE___": 10,
		},
	}

	// Create entries with different patterns
	entry1 := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			{Row: 0, Col: 0, Letter: 0}, // _____
			{Row: 0, Col: 1, Letter: 0},
			{Row: 0, Col: 2, Letter: 0},
			{Row: 0, Col: 3, Letter: 0},
			{Row: 0, Col: 4, Letter: 0},
		},
	}

	entry2 := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  1,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			{Row: 1, Col: 0, Letter: 'H'}, // H____
			{Row: 1, Col: 1, Letter: 0},
			{Row: 1, Col: 2, Letter: 0},
			{Row: 1, Col: 3, Letter: 0},
			{Row: 1, Col: 4, Letter: 0},
		},
	}

	entry3 := &grid.Entry{
		Number:    3,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			{Row: 2, Col: 0, Letter: 'H'}, // HE___
			{Row: 2, Col: 1, Letter: 'E'},
			{Row: 2, Col: 2, Letter: 0},
			{Row: 2, Col: 3, Letter: 0},
			{Row: 2, Col: 4, Letter: 0},
		},
	}

	g.Entries = []*grid.Entry{entry1, entry2, entry3}

	entries := []*grid.Entry{entry1, entry2, entry3}
	sorted := sortByConstraint(entries, g, mockWL)

	// More specific patterns (fewer matches) should come first
	// Order should be: entry3 (10), entry2 (50), entry1 (100)
	if sorted[0] != entry3 {
		t.Errorf("Most specific pattern should be first, got entry %d", sorted[0].Number)
	}
	if sorted[1] != entry2 {
		t.Errorf("Second most specific pattern should be second, got entry %d", sorted[1].Number)
	}
	if sorted[2] != entry1 {
		t.Errorf("Least specific pattern should be last, got entry %d", sorted[2].Number)
	}
}

func TestSortByConstraint_MultiLevel(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 7})
	mockWL := &MockWordlist{
		matchCounts: map[string]int{
			"_____": 100,
			"___":   200,
		},
	}

	// Corner entry with high crossings
	cornerEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[0][0], g.Cells[0][1], g.Cells[0][2], g.Cells[0][3], g.Cells[0][4],
		},
	}

	// Edge entry with low crossings
	edgeEntry := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  5,
		Length:    2,
		Cells: []*grid.Cell{
			g.Cells[0][5], g.Cells[0][6],
		},
	}

	// Center entry with high crossings
	centerEntry := &grid.Entry{
		Number:    3,
		Direction: grid.ACROSS,
		StartRow:  3,
		StartCol:  1,
		Length:    5,
		Cells: []*grid.Cell{
			g.Cells[3][1], g.Cells[3][2], g.Cells[3][3], g.Cells[3][4], g.Cells[3][5],
		},
	}

	// Down entries to create crossings
	downEntry1 := &grid.Entry{
		Number:    4,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  1,
		Length:    7,
		Cells: []*grid.Cell{
			g.Cells[0][1], g.Cells[1][1], g.Cells[2][1], g.Cells[3][1], g.Cells[4][1], g.Cells[5][1], g.Cells[6][1],
		},
	}

	downEntry2 := &grid.Entry{
		Number:    5,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  3,
		Length:    7,
		Cells: []*grid.Cell{
			g.Cells[0][3], g.Cells[1][3], g.Cells[2][3], g.Cells[3][3], g.Cells[4][3], g.Cells[5][3], g.Cells[6][3],
		},
	}

	g.Entries = []*grid.Entry{cornerEntry, edgeEntry, centerEntry, downEntry1, downEntry2}

	entries := []*grid.Entry{centerEntry, edgeEntry, cornerEntry}
	sorted := sortByConstraint(entries, g, mockWL)

	// Priority order:
	// 1. Corner/edge first: cornerEntry and edgeEntry
	// 2. Among corner/edge, more crossings: cornerEntry (2) before edgeEntry (0)
	// 3. Center last: centerEntry

	if sorted[0] != cornerEntry {
		t.Errorf("Corner entry with crossings should be first, got entry %d", sorted[0].Number)
	}
	if sorted[len(sorted)-1] != centerEntry {
		t.Errorf("Center entry should be last, got entry %d", sorted[len(sorted)-1].Number)
	}
}
