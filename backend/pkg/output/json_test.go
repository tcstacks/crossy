package output

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
)

func TestFormatJSON(t *testing.T) {
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

	// Convert to JSON format
	result := FormatJSON(puzzle)

	// Verify metadata
	if result.ID != "test-puzzle-123" {
		t.Errorf("Expected ID to be 'test-puzzle-123', got '%s'", result.ID)
	}
	if result.Title != "Test Puzzle" {
		t.Errorf("Expected Title to be 'Test Puzzle', got '%s'", result.Title)
	}
	if result.Author != "Test Author" {
		t.Errorf("Expected Author to be 'Test Author', got '%s'", result.Author)
	}
	if result.Difficulty != "medium" {
		t.Errorf("Expected Difficulty to be 'medium', got '%s'", result.Difficulty)
	}
	if !result.CreatedAt.Equal(now) {
		t.Errorf("Expected CreatedAt to be %v, got %v", now, result.CreatedAt)
	}
	if result.PublishedAt == nil || !result.PublishedAt.Equal(publishedAt) {
		t.Errorf("Expected PublishedAt to be %v, got %v", publishedAt, result.PublishedAt)
	}

	// Verify grid dimensions
	if len(result.Grid) != 3 {
		t.Fatalf("Expected grid height to be 3, got %d", len(result.Grid))
	}
	for i, row := range result.Grid {
		if len(row) != 3 {
			t.Fatalf("Expected grid width to be 3 at row %d, got %d", i, len(row))
		}
	}

	// Verify grid content
	expectedGrid := [][]string{
		{"A", "C", "E"},
		{".", ".", "."},
		{"T", "E", "A"},
	}
	for y := 0; y < 3; y++ {
		for x := 0; x < 3; x++ {
			if result.Grid[y][x] != expectedGrid[y][x] {
				t.Errorf("Expected grid[%d][%d] to be '%s', got '%s'",
					y, x, expectedGrid[y][x], result.Grid[y][x])
			}
		}
	}

	// Verify across clues
	if len(result.Across) != 2 {
		t.Fatalf("Expected 2 across clues, got %d", len(result.Across))
	}
	if result.Across[0].Number != 1 {
		t.Errorf("Expected across[0].Number to be 1, got %d", result.Across[0].Number)
	}
	if result.Across[0].Text != "Expert" {
		t.Errorf("Expected across[0].Text to be 'Expert', got '%s'", result.Across[0].Text)
	}
	if result.Across[0].Answer != "ACE" {
		t.Errorf("Expected across[0].Answer to be 'ACE', got '%s'", result.Across[0].Answer)
	}
	if result.Across[0].Length != 3 {
		t.Errorf("Expected across[0].Length to be 3, got %d", result.Across[0].Length)
	}

	// Verify down clues
	if len(result.Down) != 1 {
		t.Fatalf("Expected 1 down clue, got %d", len(result.Down))
	}
	if result.Down[0].Number != 1 {
		t.Errorf("Expected down[0].Number to be 1, got %d", result.Down[0].Number)
	}
	if result.Down[0].Text != "Consumed" {
		t.Errorf("Expected down[0].Text to be 'Consumed', got '%s'", result.Down[0].Text)
	}
	if result.Down[0].Answer != "ATE" {
		t.Errorf("Expected down[0].Answer to be 'ATE', got '%s'", result.Down[0].Answer)
	}
	if result.Down[0].Length != 3 {
		t.Errorf("Expected down[0].Length to be 3, got %d", result.Down[0].Length)
	}
}

func TestFormatJSON_AllBlackCells(t *testing.T) {
	now := time.Now()
	puzzle := &models.Puzzle{
		ID:         "test-all-black",
		Title:      "All Black",
		Author:     "Tester",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 2,
		CreatedAt:  now,
		Grid: [][]models.GridCell{
			{{Letter: nil}, {Letter: nil}},
			{{Letter: nil}, {Letter: nil}},
		},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	result := FormatJSON(puzzle)

	// Verify all cells are black
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			if result.Grid[y][x] != "." {
				t.Errorf("Expected grid[%d][%d] to be '.', got '%s'", y, x, result.Grid[y][x])
			}
		}
	}
}

func TestFormatJSON_NoClues(t *testing.T) {
	now := time.Now()
	letterA := "A"

	puzzle := &models.Puzzle{
		ID:         "test-no-clues",
		Title:      "No Clues",
		Author:     "Tester",
		Difficulty: models.DifficultyHard,
		GridWidth:  1,
		GridHeight: 1,
		CreatedAt:  now,
		Grid: [][]models.GridCell{
			{{Letter: &letterA}},
		},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	result := FormatJSON(puzzle)

	if len(result.Across) != 0 {
		t.Errorf("Expected 0 across clues, got %d", len(result.Across))
	}
	if len(result.Down) != 0 {
		t.Errorf("Expected 0 down clues, got %d", len(result.Down))
	}
}

func TestToJSON(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second) // Truncate for easier comparison

	letterH := "H"
	letterI := "I"
	num1 := 1

	puzzle := &models.Puzzle{
		ID:         "json-test",
		Title:      "JSON Test",
		Author:     "JSON Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  2,
		GridHeight: 1,
		CreatedAt:  now,
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

	// Convert to JSON bytes
	jsonBytes, err := ToJSON(puzzle)
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	// Parse JSON back
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("Failed to parse JSON: %v", err)
	}

	// Verify structure
	if parsed["id"] != "json-test" {
		t.Errorf("Expected id to be 'json-test', got '%v'", parsed["id"])
	}
	if parsed["title"] != "JSON Test" {
		t.Errorf("Expected title to be 'JSON Test', got '%v'", parsed["title"])
	}
	if parsed["difficulty"] != "easy" {
		t.Errorf("Expected difficulty to be 'easy', got '%v'", parsed["difficulty"])
	}

	// Verify grid is present
	grid, ok := parsed["grid"].([]interface{})
	if !ok {
		t.Fatal("Expected grid to be an array")
	}
	if len(grid) != 1 {
		t.Fatalf("Expected grid to have 1 row, got %d", len(grid))
	}
	row := grid[0].([]interface{})
	if len(row) != 2 {
		t.Fatalf("Expected grid row to have 2 cells, got %d", len(row))
	}
	if row[0] != "H" || row[1] != "I" {
		t.Errorf("Expected grid row to be [H, I], got %v", row)
	}

	// Verify clues
	across, ok := parsed["across"].([]interface{})
	if !ok {
		t.Fatal("Expected across to be an array")
	}
	if len(across) != 1 {
		t.Fatalf("Expected 1 across clue, got %d", len(across))
	}

	down, ok := parsed["down"].([]interface{})
	if !ok {
		t.Fatal("Expected down to be an array")
	}
	if len(down) != 0 {
		t.Errorf("Expected 0 down clues, got %d", len(down))
	}
}

func TestFormatJSON_LargePuzzle(t *testing.T) {
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
		ID:          "large-puzzle",
		Title:       "Large Puzzle",
		Author:      "Large Author",
		Difficulty:  models.DifficultyHard,
		GridWidth:   15,
		GridHeight:  15,
		CreatedAt:   now,
		Grid:        grid,
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	result := FormatJSON(puzzle)

	// Verify dimensions
	if len(result.Grid) != 15 {
		t.Fatalf("Expected grid height to be 15, got %d", len(result.Grid))
	}
	for i, row := range result.Grid {
		if len(row) != 15 {
			t.Fatalf("Expected grid width to be 15 at row %d, got %d", i, len(row))
		}
	}

	// Verify the pattern
	for y := 0; y < 15; y++ {
		for x := 0; x < 15; x++ {
			expected := "A"
			if (y*15+x)%5 == 0 {
				expected = "."
			}
			if result.Grid[y][x] != expected {
				t.Errorf("Expected grid[%d][%d] to be '%s', got '%s'",
					y, x, expected, result.Grid[y][x])
			}
		}
	}
}

func TestFormatJSON_PreservesPublishedAt(t *testing.T) {
	now := time.Now()
	puzzle := &models.Puzzle{
		ID:          "test-published",
		Title:       "Published Test",
		Author:      "Tester",
		Difficulty:  models.DifficultyMedium,
		GridWidth:   1,
		GridHeight:  1,
		CreatedAt:   now,
		PublishedAt: nil, // Not published yet
		Grid:        [][]models.GridCell{{{Letter: nil}}},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	result := FormatJSON(puzzle)

	if result.PublishedAt != nil {
		t.Errorf("Expected PublishedAt to be nil, got %v", result.PublishedAt)
	}
}
