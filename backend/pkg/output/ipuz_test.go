package output

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
)

func TestFormatIPuz(t *testing.T) {
	// Create a sample puzzle
	now := time.Now()
	publishedAt := now.Add(24 * time.Hour)

	letterA := "A"
	letterC := "C"
	letterE := "E"
	letterT := "T"

	num1 := 1
	num2 := 2

	puzzle := &models.Puzzle{
		ID:          "test-puzzle-123",
		Title:       "Test Puzzle",
		Author:      "Test Author",
		Difficulty:  models.DifficultyMedium,
		GridWidth:   3,
		GridHeight:  3,
		CreatedAt:   now,
		PublishedAt: &publishedAt,
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

	// Convert to ipuz format
	result, err := FormatIPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatIPuz failed: %v", err)
	}

	// Verify version and kind
	if result.Version != "http://ipuz.org/v2" {
		t.Errorf("Expected Version to be 'http://ipuz.org/v2', got '%s'", result.Version)
	}
	if len(result.Kind) != 1 || result.Kind[0] != "http://ipuz.org/crossword#1" {
		t.Errorf("Expected Kind to be ['http://ipuz.org/crossword#1'], got %v", result.Kind)
	}

	// Verify metadata
	if result.Title != "Test Puzzle" {
		t.Errorf("Expected Title to be 'Test Puzzle', got '%s'", result.Title)
	}
	if result.Author != "Test Author" {
		t.Errorf("Expected Author to be 'Test Author', got '%s'", result.Author)
	}
	if result.Difficulty != "medium" {
		t.Errorf("Expected Difficulty to be 'medium', got '%s'", result.Difficulty)
	}

	// Verify dimensions
	if result.Dimensions.Width != 3 {
		t.Errorf("Expected Width to be 3, got %d", result.Dimensions.Width)
	}
	if result.Dimensions.Height != 3 {
		t.Errorf("Expected Height to be 3, got %d", result.Dimensions.Height)
	}

	// Verify puzzle grid dimensions
	if len(result.Puzzle) != 3 {
		t.Fatalf("Expected puzzle grid height to be 3, got %d", len(result.Puzzle))
	}
	for i, row := range result.Puzzle {
		if len(row) != 3 {
			t.Fatalf("Expected puzzle grid width to be 3 at row %d, got %d", i, len(row))
		}
	}

	// Verify solution grid dimensions
	if len(result.Solution) != 3 {
		t.Fatalf("Expected solution grid height to be 3, got %d", len(result.Solution))
	}
	for i, row := range result.Solution {
		if len(row) != 3 {
			t.Fatalf("Expected solution grid width to be 3 at row %d, got %d", i, len(row))
		}
	}

	// Verify solution grid content
	expectedSolution := [][]string{
		{"A", "C", "E"},
		{"#", "#", "#"},
		{"T", "E", "A"},
	}
	for y := 0; y < 3; y++ {
		for x := 0; x < 3; x++ {
			if result.Solution[y][x] != expectedSolution[y][x] {
				t.Errorf("Expected solution[%d][%d] to be '%s', got '%v'",
					y, x, expectedSolution[y][x], result.Solution[y][x])
			}
		}
	}

	// Verify puzzle grid structure (check first cell has number 1)
	firstCell, ok := result.Puzzle[0][0].(IPuzCell)
	if !ok {
		t.Fatalf("Expected puzzle[0][0] to be IPuzCell, got %T", result.Puzzle[0][0])
	}
	if firstCell.Cell == nil || *firstCell.Cell != 1 {
		t.Errorf("Expected puzzle[0][0].Cell to be 1, got %v", firstCell.Cell)
	}

	// Verify across clues
	if len(result.Clues.Across) != 2 {
		t.Fatalf("Expected 2 across clues, got %d", len(result.Clues.Across))
	}
	// Check first across clue: [1, "Expert"]
	if len(result.Clues.Across[0]) != 2 {
		t.Fatalf("Expected across clue to have 2 elements, got %d", len(result.Clues.Across[0]))
	}
	if result.Clues.Across[0][0] != 1 {
		t.Errorf("Expected across[0][0] to be 1, got %v", result.Clues.Across[0][0])
	}
	if result.Clues.Across[0][1] != "Expert" {
		t.Errorf("Expected across[0][1] to be 'Expert', got '%v'", result.Clues.Across[0][1])
	}

	// Verify down clues
	if len(result.Clues.Down) != 1 {
		t.Fatalf("Expected 1 down clue, got %d", len(result.Clues.Down))
	}
	// Check first down clue: [1, "Consumed"]
	if len(result.Clues.Down[0]) != 2 {
		t.Fatalf("Expected down clue to have 2 elements, got %d", len(result.Clues.Down[0]))
	}
	if result.Clues.Down[0][0] != 1 {
		t.Errorf("Expected down[0][0] to be 1, got %v", result.Clues.Down[0][0])
	}
	if result.Clues.Down[0][1] != "Consumed" {
		t.Errorf("Expected down[0][1] to be 'Consumed', got '%v'", result.Clues.Down[0][1])
	}
}

func TestFormatIPuz_CircledCells(t *testing.T) {
	letterA := "A"
	letterB := "B"
	num1 := 1

	puzzle := &models.Puzzle{
		ID:         "test-circled",
		Title:      "Circled Test",
		Author:     "Tester",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 1,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{
				{Letter: &letterA, Number: &num1, IsCircled: true},
				{Letter: &letterB, Number: nil, IsCircled: false},
			},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Two letters", Answer: "AB", Length: 2, Direction: "across"},
		},
		CluesDown: []models.Clue{},
	}

	result, err := FormatIPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatIPuz failed: %v", err)
	}

	// Check that first cell is circled
	firstCell, ok := result.Puzzle[0][0].(IPuzCell)
	if !ok {
		t.Fatalf("Expected puzzle[0][0] to be IPuzCell, got %T", result.Puzzle[0][0])
	}
	if !firstCell.IsCircled {
		t.Errorf("Expected puzzle[0][0] to be circled")
	}

	// Check that second cell is not circled (should be 0 since no number)
	if result.Puzzle[0][1] != 0 {
		t.Errorf("Expected puzzle[0][1] to be 0, got %v", result.Puzzle[0][1])
	}
}

func TestFormatIPuz_AllBlackCells(t *testing.T) {
	puzzle := &models.Puzzle{
		ID:         "test-all-black",
		Title:      "All Black",
		Author:     "Tester",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 2,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{{Letter: nil}, {Letter: nil}},
			{{Letter: nil}, {Letter: nil}},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Dummy", Answer: "X", Length: 1, Direction: "across"},
		},
		CluesDown: []models.Clue{},
	}

	result, err := FormatIPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatIPuz failed: %v", err)
	}

	// Verify all cells are black in both puzzle and solution
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			if result.Puzzle[y][x] != "#" {
				t.Errorf("Expected puzzle[%d][%d] to be '#', got '%v'", y, x, result.Puzzle[y][x])
			}
			if result.Solution[y][x] != "#" {
				t.Errorf("Expected solution[%d][%d] to be '#', got '%v'", y, x, result.Solution[y][x])
			}
		}
	}
}

func TestFormatIPuz_NilPuzzle(t *testing.T) {
	_, err := FormatIPuz(nil)
	if err == nil {
		t.Fatal("Expected error for nil puzzle, got nil")
	}
	if err.Error() != "puzzle cannot be nil" {
		t.Errorf("Expected error 'puzzle cannot be nil', got '%v'", err)
	}
}

func TestFormatIPuz_InvalidDimensions(t *testing.T) {
	puzzle := &models.Puzzle{
		ID:         "test-invalid",
		Title:      "Invalid",
		Author:     "Tester",
		Difficulty: models.DifficultyEasy,
		GridWidth:  0,
		GridHeight: 0,
		CreatedAt:  time.Now(),
		Grid:       [][]models.GridCell{},
	}

	_, err := FormatIPuz(puzzle)
	if err == nil {
		t.Fatal("Expected error for invalid dimensions, got nil")
	}
}

func TestFormatIPuz_GridMismatch(t *testing.T) {
	letterA := "A"

	puzzle := &models.Puzzle{
		ID:         "test-mismatch",
		Title:      "Mismatch",
		Author:     "Tester",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 2,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{{Letter: &letterA}}, // Only 1 cell instead of 2
		},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	_, err := FormatIPuz(puzzle)
	if err == nil {
		t.Fatal("Expected error for grid mismatch, got nil")
	}
}

func TestToIPuz(t *testing.T) {
	letterH := "H"
	letterI := "I"
	num1 := 1

	puzzle := &models.Puzzle{
		ID:         "ipuz-test",
		Title:      "IPUZ Test",
		Author:     "IPUZ Author",
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

	// Convert to ipuz JSON bytes
	jsonBytes, err := ToIPuz(puzzle)
	if err != nil {
		t.Fatalf("ToIPuz failed: %v", err)
	}

	// Parse JSON back
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("Failed to parse JSON: %v", err)
	}

	// Verify structure
	if parsed["version"] != "http://ipuz.org/v2" {
		t.Errorf("Expected version to be 'http://ipuz.org/v2', got '%v'", parsed["version"])
	}
	if parsed["title"] != "IPUZ Test" {
		t.Errorf("Expected title to be 'IPUZ Test', got '%v'", parsed["title"])
	}
	if parsed["difficulty"] != "easy" {
		t.Errorf("Expected difficulty to be 'easy', got '%v'", parsed["difficulty"])
	}

	// Verify dimensions
	dimensions, ok := parsed["dimensions"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected dimensions to be an object")
	}
	if dimensions["width"] != float64(2) {
		t.Errorf("Expected width to be 2, got %v", dimensions["width"])
	}
	if dimensions["height"] != float64(1) {
		t.Errorf("Expected height to be 1, got %v", dimensions["height"])
	}

	// Verify kind
	kind, ok := parsed["kind"].([]interface{})
	if !ok {
		t.Fatal("Expected kind to be an array")
	}
	if len(kind) != 1 || kind[0] != "http://ipuz.org/crossword#1" {
		t.Errorf("Expected kind to be ['http://ipuz.org/crossword#1'], got %v", kind)
	}

	// Verify solution grid
	solution, ok := parsed["solution"].([]interface{})
	if !ok {
		t.Fatal("Expected solution to be an array")
	}
	if len(solution) != 1 {
		t.Fatalf("Expected solution to have 1 row, got %d", len(solution))
	}
	row := solution[0].([]interface{})
	if len(row) != 2 {
		t.Fatalf("Expected solution row to have 2 cells, got %d", len(row))
	}
	if row[0] != "H" || row[1] != "I" {
		t.Errorf("Expected solution row to be [H, I], got %v", row)
	}

	// Verify clues
	clues, ok := parsed["clues"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected clues to be an object")
	}
	across, ok := clues["Across"].([]interface{})
	if !ok {
		t.Fatal("Expected Across to be an array")
	}
	if len(across) != 1 {
		t.Fatalf("Expected 1 across clue, got %d", len(across))
	}
}

func TestValidateIPuz(t *testing.T) {
	letterA := "A"
	num1 := 1

	// Valid puzzle
	validPuzzle := &models.Puzzle{
		ID:         "valid",
		Title:      "Valid Puzzle",
		Author:     "Valid Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  1,
		GridHeight: 1,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{{Letter: &letterA, Number: &num1}},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Letter", Answer: "A", Length: 1, Direction: "across"},
		},
		CluesDown: []models.Clue{},
	}

	if err := ValidateIPuz(validPuzzle); err != nil {
		t.Errorf("Expected valid puzzle to pass validation, got error: %v", err)
	}

	// Nil puzzle
	if err := ValidateIPuz(nil); err == nil {
		t.Error("Expected error for nil puzzle")
	}

	// Missing title
	noTitle := &models.Puzzle{
		Author:     "Author",
		GridWidth:  1,
		GridHeight: 1,
		Grid:       [][]models.GridCell{{{Letter: &letterA}}},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Clue", Answer: "A", Length: 1, Direction: "across"},
		},
	}
	if err := ValidateIPuz(noTitle); err == nil {
		t.Error("Expected error for missing title")
	}

	// Missing author
	noAuthor := &models.Puzzle{
		Title:      "Title",
		GridWidth:  1,
		GridHeight: 1,
		Grid:       [][]models.GridCell{{{Letter: &letterA}}},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Clue", Answer: "A", Length: 1, Direction: "across"},
		},
	}
	if err := ValidateIPuz(noAuthor); err == nil {
		t.Error("Expected error for missing author")
	}

	// Invalid dimensions
	invalidDims := &models.Puzzle{
		Title:       "Title",
		Author:      "Author",
		GridWidth:   0,
		GridHeight:  0,
		Grid:        [][]models.GridCell{},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}
	if err := ValidateIPuz(invalidDims); err == nil {
		t.Error("Expected error for invalid dimensions")
	}

	// No clues
	noClues := &models.Puzzle{
		Title:       "Title",
		Author:      "Author",
		GridWidth:   1,
		GridHeight:  1,
		Grid:        [][]models.GridCell{{{Letter: &letterA}}},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}
	if err := ValidateIPuz(noClues); err == nil {
		t.Error("Expected error for missing clues")
	}
}

func TestFormatIPuz_LargePuzzle(t *testing.T) {
	// Test with a realistic 15x15 puzzle
	now := time.Now()

	// Create a 15x15 grid with a mix of letters and black cells
	grid := make([][]models.GridCell, 15)
	for y := 0; y < 15; y++ {
		grid[y] = make([]models.GridCell, 15)
		for x := 0; x < 15; x++ {
			// Create a pattern: every 5th cell is black
			if (y*15+x)%5 == 0 {
				grid[y][x] = models.GridCell{Letter: nil}
			} else {
				letter := "A"
				grid[y][x] = models.GridCell{Letter: &letter}
			}
		}
	}

	puzzle := &models.Puzzle{
		ID:         "large-puzzle",
		Title:      "Large Puzzle",
		Author:     "Large Author",
		Difficulty: models.DifficultyHard,
		GridWidth:  15,
		GridHeight: 15,
		CreatedAt:  now,
		Grid:       grid,
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Dummy clue", Answer: "TEST", Length: 4, Direction: "across"},
		},
		CluesDown: []models.Clue{},
	}

	result, err := FormatIPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatIPuz failed: %v", err)
	}

	// Verify dimensions
	if result.Dimensions.Width != 15 || result.Dimensions.Height != 15 {
		t.Errorf("Expected 15x15 dimensions, got %dx%d", result.Dimensions.Width, result.Dimensions.Height)
	}

	if len(result.Puzzle) != 15 {
		t.Fatalf("Expected puzzle grid height to be 15, got %d", len(result.Puzzle))
	}
	if len(result.Solution) != 15 {
		t.Fatalf("Expected solution grid height to be 15, got %d", len(result.Solution))
	}

	for i := 0; i < 15; i++ {
		if len(result.Puzzle[i]) != 15 {
			t.Fatalf("Expected puzzle grid width to be 15 at row %d, got %d", i, len(result.Puzzle[i]))
		}
		if len(result.Solution[i]) != 15 {
			t.Fatalf("Expected solution grid width to be 15 at row %d, got %d", i, len(result.Solution[i]))
		}
	}
}
