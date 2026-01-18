package fill

import (
	"errors"
	"testing"

	"github.com/crossplay/backend/pkg/grid"
)

// MockWordlistWithScores is a mock wordlist that can filter by score
type MockWordlistWithScores struct {
	words map[string][]WordWithScore
}

type WordWithScore struct {
	Text  string
	Score int
}

func (m *MockWordlistWithScores) Match(pattern string) []string {
	words, ok := m.words[pattern]
	if !ok {
		return []string{}
	}
	result := make([]string, len(words))
	for i, w := range words {
		result[i] = w.Text
	}
	return result
}

func (m *MockWordlistWithScores) MatchWithScores(pattern string, minScore int) []WordCandidate {
	words, ok := m.words[pattern]
	if !ok {
		return []WordCandidate{}
	}
	result := []WordCandidate{}
	for _, w := range words {
		if w.Score >= minScore {
			result = append(result, WordCandidate{
				Word:  w.Text,
				Score: w.Score,
			})
		}
	}
	return result
}

func TestFillRecursive_EmptyEntries(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	wordlist := &MockWordlistWithScores{words: map[string][]WordWithScore{}}
	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive(empty entries) = %v, want nil", err)
	}
}

func TestFillRecursive_SingleEntry_Success(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create a simple 4-letter across entry
	entry := &grid.Entry{
		Number:    1,
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

	// Mock wordlist with one matching word
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"____": {{Text: "TEST", Score: 80}},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil", err)
	}

	// Verify the word was placed
	expected := "TEST"
	for i, cell := range entry.Cells {
		if cell.Letter != rune(expected[i]) {
			t.Errorf("cell %d: got %c, want %c", i, cell.Letter, expected[i])
		}
	}
}

func TestFillRecursive_SingleEntry_NoMatch(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Number:    1,
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

	// Mock wordlist with no matching words
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry}, 0, g, wordlist, config, usedWords)
	if !errors.Is(err, ErrNoValidFill) {
		t.Errorf("fillRecursive() = %v, want ErrNoValidFill", err)
	}
}

func TestFillRecursive_TwoEntries_NoCrossing_Success(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create two non-crossing entries
	entry1 := &grid.Entry{
		Number:    1,
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

	entry2 := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[2][0],
			g.Cells[2][1],
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{entry1, entry2}

	// Mock wordlist
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
				{Text: "DOG", Score: 75},
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry1, entry2}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil", err)
	}

	// Verify both entries are filled
	if !isEntryFilled(entry1) {
		t.Error("entry1 should be filled")
	}
	if !isEntryFilled(entry2) {
		t.Error("entry2 should be filled")
	}
}

func TestFillRecursive_TwoEntries_WithCrossing_Success(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create crossing entries
	acrossEntry := &grid.Entry{
		Number:    1,
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

	downEntry := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][2],
			g.Cells[1][2], // Crossing point
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry}

	// Mock wordlist with compatible words
	// If we place "CAT" across, the down word must have "A" in position 1
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
				{Text: "BAT", Score: 75},
			},
			"_A_": {
				{Text: "BAD", Score: 70},
				{Text: "CAR", Score: 65},
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{acrossEntry, downEntry}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil", err)
	}

	// Verify both entries are filled
	if !isEntryFilled(acrossEntry) {
		t.Error("acrossEntry should be filled")
	}
	if !isEntryFilled(downEntry) {
		t.Error("downEntry should be filled")
	}

	// Verify crossing cell matches in both entries
	crossingCell := g.Cells[1][2]
	if crossingCell.Letter != 'A' {
		t.Errorf("crossing cell: got %c, want A", crossingCell.Letter)
	}
}

func TestFillRecursive_Backtracking(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create crossing entries where first choice needs to be backtracked
	acrossEntry := &grid.Entry{
		Number:    1,
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

	downEntry := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][2],
			g.Cells[1][2], // Crossing point
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry}

	// Mock wordlist where first across choice "DOG" has no compatible down words
	// But second choice "CAT" does
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "DOG", Score: 90}, // First choice, but no compatible down word
				{Text: "CAT", Score: 80}, // Second choice, has compatible down word
			},
			"_O_": {
				// No words available with O in middle
			},
			"_A_": {
				{Text: "BAD", Score: 70}, // Compatible with CAT
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{acrossEntry, downEntry}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil (should backtrack and find solution)", err)
	}

	// Verify the solution is CAT (not DOG) because DOG couldn't be completed
	acrossWord := ""
	for _, cell := range acrossEntry.Cells {
		acrossWord += string(cell.Letter)
	}

	if acrossWord == "DOG" {
		t.Error("Should not use DOG as it has no compatible crossing word")
	}
	if acrossWord != "CAT" {
		t.Errorf("Expected CAT after backtracking, got %s", acrossWord)
	}
}

func TestFillRecursive_ImpossibleToFill(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create crossing entries with no compatible words
	acrossEntry := &grid.Entry{
		Number:    1,
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

	downEntry := &grid.Entry{
		Number:    2,
		Direction: grid.DOWN,
		StartRow:  0,
		StartCol:  2,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][2],
			g.Cells[1][2], // Crossing point
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{acrossEntry, downEntry}

	// Mock wordlist where no combinations work
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
			},
			"_A_": {
				// No words available with A in middle
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{acrossEntry, downEntry}, 0, g, wordlist, config, usedWords)
	if !errors.Is(err, ErrNoValidFill) {
		t.Errorf("fillRecursive() = %v, want ErrNoValidFill", err)
	}
}

func TestFill_NilInputs(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})
	wordlist := &MockWordlistWithScores{words: map[string][]WordWithScore{}}
	config := FillConfig{}

	// Test nil grid
	err := Fill(nil, wordlist, config)
	if err == nil {
		t.Error("Fill(nil grid) should return error")
	}

	// Test nil wordlist
	err = Fill(g, nil, config)
	if err == nil {
		t.Error("Fill(nil wordlist) should return error")
	}
}

func TestFill_DefaultConfig(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Number:    1,
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

	g.Entries = []*grid.Entry{entry}

	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {{Text: "CAT", Score: 80}},
		},
	}

	// Use empty config to test defaults
	config := FillConfig{}

	err := Fill(g, wordlist, config)
	if err != nil {
		t.Errorf("Fill() = %v, want nil", err)
	}

	// Verify entry was filled
	if !isEntryFilled(entry) {
		t.Error("entry should be filled")
	}
}

func TestFill_Success(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry1 := &grid.Entry{
		Number:    1,
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

	entry2 := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[2][0],
			g.Cells[2][1],
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{entry1, entry2}

	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
				{Text: "DOG", Score: 75},
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 10}

	err := Fill(g, wordlist, config)
	if err != nil {
		t.Errorf("Fill() = %v, want nil", err)
	}

	// Verify all entries are filled
	if !isEntryFilled(entry1) {
		t.Error("entry1 should be filled")
	}
	if !isEntryFilled(entry2) {
		t.Error("entry2 should be filled")
	}
}

func TestFill_MaxRetriesExceeded(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Number:    1,
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

	g.Entries = []*grid.Entry{entry}

	// No matching words - should fail after retries
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 5}

	err := Fill(g, wordlist, config)
	if !errors.Is(err, ErrNoValidFill) {
		t.Errorf("Fill() = %v, want ErrNoValidFill", err)
	}
}

func TestFill_ClearsGridBetweenRetries(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Number:    1,
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

	g.Entries = []*grid.Entry{entry}

	// Place some letters in the grid before Fill
	entry.Cells[0].Letter = 'X'
	entry.Cells[1].Letter = 'Y'

	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 2}

	err := Fill(g, wordlist, config)
	if !errors.Is(err, ErrNoValidFill) {
		t.Errorf("Fill() = %v, want ErrNoValidFill", err)
	}

	// After failing, grid should be cleared
	for _, cell := range entry.Cells {
		if cell.Letter != 0 {
			t.Errorf("cell should be cleared after failed Fill, got %c", cell.Letter)
		}
	}
}

func TestFillRecursive_ConflictDetection(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Pre-fill a cell
	g.Cells[0][1].Letter = 'X'

	entry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		StartRow:  0,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[0][0],
			g.Cells[0][1], // Pre-filled with 'X'
			g.Cells[0][2],
		},
	}

	g.Entries = []*grid.Entry{entry}

	// Wordlist with words that don't have 'X' in position 1
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"_X_": {
				{Text: "AXE", Score: 80}, // Compatible
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil (should find AXE)", err)
	}

	// Verify AXE was placed
	expected := "AXE"
	for i, cell := range entry.Cells {
		if cell.Letter != rune(expected[i]) {
			t.Errorf("cell %d: got %c, want %c", i, cell.Letter, expected[i])
		}
	}
}

func TestFillRecursive_MinScoreEnforcement(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry := &grid.Entry{
		Number:    1,
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

	g.Entries = []*grid.Entry{entry}

	// Wordlist with low-scoring and high-scoring words
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "BAD", Score: 30},  // Below threshold
				{Text: "CAT", Score: 80},  // Above threshold
				{Text: "DOG", Score: 75},  // Above threshold
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil", err)
	}

	// Verify that BAD was not used (score too low)
	result := ""
	for _, cell := range entry.Cells {
		result += string(cell.Letter)
	}

	if result == "BAD" {
		t.Error("Should not use BAD (score 30 < MinScore 50)")
	}

	if result != "CAT" && result != "DOG" {
		t.Errorf("Expected CAT or DOG, got %s", result)
	}
}

func TestFillRecursive_DuplicatePrevention(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	// Create two non-crossing entries
	entry1 := &grid.Entry{
		Number:    1,
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

	entry2 := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[2][0],
			g.Cells[2][1],
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{entry1, entry2}

	// Wordlist with multiple words
	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
				{Text: "DOG", Score: 75},
				{Text: "BAT", Score: 70},
			},
		},
	}

	config := FillConfig{MinScore: 50, MaxRetries: 100}
	usedWords := make(map[string]bool)

	err := fillRecursive([]*grid.Entry{entry1, entry2}, 0, g, wordlist, config, usedWords)
	if err != nil {
		t.Errorf("fillRecursive() = %v, want nil", err)
	}

	// Verify both entries are filled
	if !isEntryFilled(entry1) {
		t.Error("entry1 should be filled")
	}
	if !isEntryFilled(entry2) {
		t.Error("entry2 should be filled")
	}

	// Get the words used
	word1 := ""
	for _, cell := range entry1.Cells {
		word1 += string(cell.Letter)
	}

	word2 := ""
	for _, cell := range entry2.Cells {
		word2 += string(cell.Letter)
	}

	// Verify no duplicates
	if word1 == word2 {
		t.Errorf("Duplicate words detected: both entries use %s", word1)
	}
}

func TestFill_WithQualityControls(t *testing.T) {
	g := grid.NewEmptyGrid(grid.GridConfig{Size: 5})

	entry1 := &grid.Entry{
		Number:    1,
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

	entry2 := &grid.Entry{
		Number:    2,
		Direction: grid.ACROSS,
		StartRow:  2,
		StartCol:  0,
		Length:    3,
		Cells: []*grid.Cell{
			g.Cells[2][0],
			g.Cells[2][1],
			g.Cells[2][2],
		},
	}

	g.Entries = []*grid.Entry{entry1, entry2}

	wordlist := &MockWordlistWithScores{
		words: map[string][]WordWithScore{
			"___": {
				{Text: "CAT", Score: 80},
				{Text: "DOG", Score: 75},
				{Text: "BAT", Score: 70},
				{Text: "RAT", Score: 65},
			},
		},
	}

	// Test with custom MinScore
	config := FillConfig{MinScore: 60, MaxRetries: 10}

	err := Fill(g, wordlist, config)
	if err != nil {
		t.Errorf("Fill() = %v, want nil", err)
	}

	// Verify all entries are filled
	if !isEntryFilled(entry1) {
		t.Error("entry1 should be filled")
	}
	if !isEntryFilled(entry2) {
		t.Error("entry2 should be filled")
	}

	// Get the words used
	word1 := ""
	for _, cell := range entry1.Cells {
		word1 += string(cell.Letter)
	}

	word2 := ""
	for _, cell := range entry2.Cells {
		word2 += string(cell.Letter)
	}

	// Verify no duplicates
	if word1 == word2 {
		t.Errorf("Duplicate words detected: both entries use %s", word1)
	}

	// Verify scores meet threshold (RAT has score 65 but should be filtered out)
	// We can't directly test scores without exposing them, but we can verify
	// the fill succeeded with the quality constraints
}
