package output

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/crossplay/backend/internal/models"
)

// TestIPuzFormatExampleOutput creates a sample ipuz file for manual verification
func TestIPuzFormatExampleOutput(t *testing.T) {
	// Create a realistic 5x5 puzzle
	letterC := "C"
	letterA := "A"
	letterT := "T"
	letterO := "O"
	letterG := "G"
	letterR := "R"
	letterI := "I"
	letterD := "D"

	num1 := 1
	num2 := 2
	num3 := 3
	num4 := 4
	num5 := 5

	puzzle := &models.Puzzle{
		ID:         "example-ipuz",
		Title:      "Sample Crossword",
		Author:     "Test Author",
		Difficulty: models.DifficultyEasy,
		GridWidth:  5,
		GridHeight: 5,
		CreatedAt:  time.Now(),
		Grid: [][]models.GridCell{
			{
				{Letter: &letterC, Number: &num1},
				{Letter: &letterA, Number: nil},
				{Letter: &letterT, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: &letterD, Number: &num2},
			},
			{
				{Letter: &letterO, Number: &num3},
				{Letter: nil, Number: nil},
				{Letter: &letterO, Number: &num4},
				{Letter: nil, Number: nil},
				{Letter: &letterO, Number: nil},
			},
			{
				{Letter: &letterG, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: &letterG, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: &letterG, Number: nil},
			},
			{
				{Letter: nil, Number: nil},
				{Letter: &letterG, Number: &num5},
				{Letter: &letterR, Number: nil},
				{Letter: &letterI, Number: nil},
				{Letter: &letterD, Number: nil},
			},
			{
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
				{Letter: nil, Number: nil},
			},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "Feline", Answer: "CAT", Length: 3, Direction: "across"},
			{Number: 2, Text: "Canine", Answer: "DOG", Length: 3, Direction: "across"},
			{Number: 3, Text: "Sprocket", Answer: "COG", Length: 3, Direction: "across"},
			{Number: 5, Text: "Lattice", Answer: "GRID", Length: 4, Direction: "across"},
		},
		CluesDown: []models.Clue{
			{Number: 1, Text: "Sprocket", Answer: "COG", Length: 3, Direction: "down"},
			{Number: 2, Text: "Canine", Answer: "DOG", Length: 3, Direction: "down"},
			{Number: 4, Text: "Canine", Answer: "DOG", Length: 3, Direction: "down"},
		},
	}

	// Convert to ipuz format
	ipuzPuzzle, err := FormatIPuz(puzzle)
	if err != nil {
		t.Fatalf("FormatIPuz failed: %v", err)
	}

	// Convert to JSON
	jsonBytes, err := json.MarshalIndent(ipuzPuzzle, "", "  ")
	if err != nil {
		t.Fatalf("JSON marshal failed: %v", err)
	}

	// Print the output for verification
	fmt.Println("Sample ipuz output:")
	fmt.Println(string(jsonBytes))

	// Verify it's valid JSON
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("Output is not valid JSON: %v", err)
	}

	// Verify required ipuz fields
	requiredFields := []string{"version", "kind", "dimensions", "puzzle", "solution", "clues"}
	for _, field := range requiredFields {
		if _, ok := parsed[field]; !ok {
			t.Errorf("Required field '%s' is missing from ipuz output", field)
		}
	}

	// Verify version
	if parsed["version"] != "http://ipuz.org/v2" {
		t.Errorf("Expected version 'http://ipuz.org/v2', got '%v'", parsed["version"])
	}

	// Verify kind
	kind, ok := parsed["kind"].([]interface{})
	if !ok || len(kind) == 0 {
		t.Fatal("Expected kind to be a non-empty array")
	}
	if kind[0] != "http://ipuz.org/crossword#1" {
		t.Errorf("Expected kind[0] to be 'http://ipuz.org/crossword#1', got '%v'", kind[0])
	}

	t.Log("ipuz format validation successful!")
}
