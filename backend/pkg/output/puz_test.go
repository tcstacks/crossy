package output

import (
	"bytes"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
)

func TestFormatPuz_BasicPuzzle(t *testing.T) {
	// Create a simple 3x3 puzzle
	letterA := "A"
	letterC := "C"
	letterE := "E"
	letterT := "T"

	num1 := 1
	num2 := 2

	puzzle := &models.Puzzle{
		ID:         "test-puz-1",
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: models.DifficultyMedium,
		GridWidth:  3,
		GridHeight: 3,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{
				{Letter: &letterA, Number: &num1},
				{Letter: &letterC, Number: nil},
				{Letter: &letterE, Number: nil},
			},
			{
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
			},
			{
				{Letter: &letterT, Number: &num2},
				{Letter: &letterE, Number: nil},
				{Letter: &letterA, Number: nil},
			},
		},
		CluesAcross: []models.Clue{
			{
				Number:    1,
				Text:      "Expert",
				Answer:    "ACE",
				PositionX: 0,
				PositionY: 0,
				Length:    3,
				Direction: "across",
			},
			{
				Number:    2,
				Text:      "Beverage",
				Answer:    "TEA",
				PositionX: 0,
				PositionY: 2,
				Length:    3,
				Direction: "across",
			},
		},
		CluesDown: []models.Clue{
			{
				Number:    1,
				Text:      "Consumed",
				Answer:    "ATE",
				PositionX: 0,
				PositionY: 0,
				Length:    3,
				Direction: "down",
			},
		},
	}

	// Generate .puz file
	puzData, err := FormatPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatPuz failed: %v", err)
	}

	// Verify file is not empty
	if len(puzData) == 0 {
		t.Fatal("Expected non-empty .puz data")
	}

	// Verify magic number
	if !bytes.HasPrefix(puzData, []byte("ACROSS&DOWN\x00")) {
		t.Error("Missing ACROSS&DOWN magic number")
	}

	// Verify second magic (at offset 0x0E)
	if !bytes.Contains(puzData[0x0E:0x16], []byte("ICHEATED")) {
		t.Error("Missing ICHEATED magic number")
	}

	// Verify width and height (at offset 0x2C and 0x2D)
	if puzData[0x2C] != 3 {
		t.Errorf("Expected width 3, got %d", puzData[0x2C])
	}
	if puzData[0x2D] != 3 {
		t.Errorf("Expected height 3, got %d", puzData[0x2D])
	}

	// Verify solution string is present
	solution := "ACE...TEA"
	if !bytes.Contains(puzData, []byte(solution)) {
		t.Errorf("Solution string '%s' not found in .puz data", solution)
	}

	// Verify title is present
	if !bytes.Contains(puzData, []byte("Test Puzzle\x00")) {
		t.Error("Title not found in .puz data")
	}

	// Verify author is present
	if !bytes.Contains(puzData, []byte("Test Author\x00")) {
		t.Error("Author not found in .puz data")
	}

	// Verify clues are present
	if !bytes.Contains(puzData, []byte("Expert\x00")) {
		t.Error("Clue 'Expert' not found in .puz data")
	}
	if !bytes.Contains(puzData, []byte("Consumed\x00")) {
		t.Error("Clue 'Consumed' not found in .puz data")
	}
	if !bytes.Contains(puzData, []byte("Beverage\x00")) {
		t.Error("Clue 'Beverage' not found in .puz data")
	}
}

func TestFormatPuz_LargePuzzle(t *testing.T) {
	// Create a 15x15 puzzle (standard size)
	grid := make([][]models.GridCell, 15)
	for y := 0; y < 15; y++ {
		grid[y] = make([]models.GridCell, 15)
		for x := 0; x < 15; x++ {
			letter := "A"
			grid[y][x] = models.GridCell{Letter: &letter}
		}
	}

	// Add a black cell pattern
	grid[0][5] = models.GridCell{Letter: nil}
	grid[5][0] = models.GridCell{Letter: nil}

	num1 := 1
	grid[0][0].Number = &num1

	puzzle := &models.Puzzle{
		ID:         "test-15x15",
		Title:      "Large Puzzle",
		Author:     "Large Author",
		Difficulty: models.DifficultyHard,
		GridWidth:  15,
		GridHeight: 15,
		CreatedAt:  time.Now(),
		Grid:       grid,
		CluesAcross: []models.Clue{
			{
				Number:    1,
				Text:      "First clue",
				Answer:    "AAAAA",
				PositionX: 0,
				PositionY: 0,
				Length:    5,
				Direction: "across",
			},
		},
		CluesDown: []models.Clue{},
	}

	puzData, err := FormatPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatPuz failed: %v", err)
	}

	// Verify dimensions
	if puzData[0x2C] != 15 {
		t.Errorf("Expected width 15, got %d", puzData[0x2C])
	}
	if puzData[0x2D] != 15 {
		t.Errorf("Expected height 15, got %d", puzData[0x2D])
	}

	// Verify solution contains 225 characters (15x15)
	// Solution starts at offset 0x34
	solutionStart := 0x34
	solutionEnd := solutionStart + 225
	if len(puzData) < solutionEnd {
		t.Fatalf("File too short, expected at least %d bytes", solutionEnd)
	}
}

func TestFormatPuz_EmptyPuzzle(t *testing.T) {
	// Edge case: minimal puzzle
	puzzle := &models.Puzzle{
		ID:          "test-empty",
		Title:       "Empty",
		Author:      "Nobody",
		Difficulty:  models.DifficultyEasy,
		GridWidth:   1,
		GridHeight:  1,
		CreatedAt:   time.Now(),
		Grid:        [][]models.GridCell{{{Letter: nil}}},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	puzData, err := FormatPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatPuz failed: %v", err)
	}

	if len(puzData) == 0 {
		t.Fatal("Expected non-empty .puz data even for empty puzzle")
	}

	// Verify dimensions
	if puzData[0x2C] != 1 {
		t.Errorf("Expected width 1, got %d", puzData[0x2C])
	}
	if puzData[0x2D] != 1 {
		t.Errorf("Expected height 1, got %d", puzData[0x2D])
	}
}

func TestFormatPuz_MetadataEmbedded(t *testing.T) {
	letterH := "H"
	letterI := "I"
	num1 := 1

	puzzle := &models.Puzzle{
		ID:         "test-metadata",
		Title:      "Metadata Test Puzzle",
		Author:     "John Doe",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 1,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{{Letter: &letterH, Number: &num1}, {Letter: &letterI}},
		},
		CluesAcross: []models.Clue{
			{
				Number:    1,
				Text:      "Greeting",
				Answer:    "HI",
				PositionX: 0,
				PositionY: 0,
				Length:    2,
				Direction: "across",
			},
		},
		CluesDown: []models.Clue{},
	}

	puzData, err := FormatPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatPuz failed: %v", err)
	}

	// Verify title
	if !bytes.Contains(puzData, []byte("Metadata Test Puzzle\x00")) {
		t.Error("Title not properly embedded")
	}

	// Verify author
	if !bytes.Contains(puzData, []byte("John Doe\x00")) {
		t.Error("Author not properly embedded")
	}

	// Verify copyright
	if !bytes.Contains(puzData, []byte("© John Doe\x00")) {
		t.Error("Copyright not properly embedded")
	}
}

func TestBuildSolutionString(t *testing.T) {
	letterA := "A"
	letterB := "B"

	puzzle := &models.Puzzle{
		GridWidth:  2,
		GridHeight: 2,
		Grid: [][]models.GridCell{
			{{Letter: &letterA}, {Letter: nil}},
			{{Letter: nil}, {Letter: &letterB}},
		},
	}

	solution := buildSolutionString(puzzle)
	expected := "A..B"

	if solution != expected {
		t.Errorf("Expected solution '%s', got '%s'", expected, solution)
	}
}

func TestBuildClueStrings(t *testing.T) {
	puzzle := &models.Puzzle{
		CluesAcross: []models.Clue{
			{Number: 1, Text: "First across"},
			{Number: 3, Text: "Third across"},
		},
		CluesDown: []models.Clue{
			{Number: 1, Text: "First down"},
			{Number: 2, Text: "Second down"},
		},
	}

	clues := buildClueStrings(puzzle)

	// Expected order: 1-across, 1-down, 2-down, 3-across
	expected := []string{
		"First across",
		"First down",
		"Second down",
		"Third across",
	}

	if len(clues) != len(expected) {
		t.Fatalf("Expected %d clues, got %d", len(expected), len(clues))
	}

	for i, exp := range expected {
		if clues[i] != exp {
			t.Errorf("Clue %d: expected '%s', got '%s'", i, exp, clues[i])
		}
	}
}

func TestChecksumRegion(t *testing.T) {
	// Test basic checksum computation
	data := []byte{0x01, 0x02, 0x03}
	cksum := checksumRegion(0, data)

	// Checksum should be non-zero for non-empty data
	if cksum == 0 {
		t.Error("Expected non-zero checksum")
	}

	// Test that same input produces same checksum
	cksum2 := checksumRegion(0, data)
	if cksum != cksum2 {
		t.Error("Checksum should be deterministic")
	}

	// Test that different input produces different checksum
	data2 := []byte{0x04, 0x05, 0x06}
	cksum3 := checksumRegion(0, data2)
	if cksum == cksum3 {
		t.Error("Different data should produce different checksum")
	}
}

func TestComputeCIB(t *testing.T) {
	// Test CIB computation
	width := byte(15)
	height := byte(15)
	numClues := uint16(76)
	puzzleType := uint16(0x0001)
	scrambledState := uint16(0x0000)

	cib := computeCIB(width, height, numClues, puzzleType, scrambledState)

	// CIB should be non-zero for typical puzzle
	if cib == 0 {
		t.Error("Expected non-zero CIB checksum")
	}

	// Test determinism
	cib2 := computeCIB(width, height, numClues, puzzleType, scrambledState)
	if cib != cib2 {
		t.Error("CIB checksum should be deterministic")
	}

	// Test that different dimensions produce different CIB
	cib3 := computeCIB(byte(10), byte(10), numClues, puzzleType, scrambledState)
	if cib == cib3 {
		t.Error("Different dimensions should produce different CIB")
	}
}

func TestFormatPuz_SpecialCharacters(t *testing.T) {
	// Test with special characters in metadata
	letterA := "A"
	num1 := 1

	puzzle := &models.Puzzle{
		ID:         "test-special",
		Title:      "Test & Puzzle",
		Author:     "O'Brien",
		Difficulty: models.DifficultyMedium,
		GridWidth:  1,
		GridHeight: 1,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{{Letter: &letterA, Number: &num1}},
		},
		CluesAcross: []models.Clue{
			{
				Number:    1,
				Text:      "Letter",
				Answer:    "A",
				PositionX: 0,
				PositionY: 0,
				Length:    1,
				Direction: "across",
			},
		},
		CluesDown: []models.Clue{},
	}

	puzData, err := FormatPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatPuz failed with special characters: %v", err)
	}

	// Verify special characters are preserved
	if !bytes.Contains(puzData, []byte("Test & Puzzle\x00")) {
		t.Error("Ampersand in title not preserved")
	}
	if !bytes.Contains(puzData, []byte("O'Brien\x00")) {
		t.Error("Apostrophe in author not preserved")
	}
}
