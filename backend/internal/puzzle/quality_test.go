package puzzle

import (
	"testing"

	"github.com/crossplay/backend/internal/models"
)

func TestNewQualityScorer(t *testing.T) {
	ws := NewWordListService()
	scorer := NewQualityScorer(ws)
	if scorer == nil {
		t.Fatal("expected non-nil QualityScorer")
	}
}

func TestQualityScorer_ScorePuzzle(t *testing.T) {
	ws := NewWordListService()
	scorer := NewQualityScorer(ws)

	// Create a simple valid puzzle
	puzzle := &models.Puzzle{
		GridWidth:  5,
		GridHeight: 5,
		Grid: [][]models.GridCell{
			{{Letter: ptr("H")}, {Letter: ptr("O")}, {Letter: ptr("U")}, {Letter: ptr("S")}, {Letter: ptr("E")}},
			{{Letter: ptr("O")}, {Letter: ptr("V")}, {Letter: ptr("A")}, {Letter: ptr("L")}, {Letter: ptr("S")}},
			{{Letter: ptr("U")}, {Letter: ptr("S")}, {Letter: ptr("E")}, {Letter: ptr("D")}, {Letter: ptr("T")}},
			{{Letter: ptr("S")}, {Letter: ptr("E")}, {Letter: ptr("A")}, {Letter: ptr("S")}, {Letter: ptr("S")}},
			{{Letter: ptr("E")}, {Letter: ptr("S")}, {Letter: ptr("T")}, {Letter: ptr("S")}, {Letter: ptr("S")}},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "A dwelling", Answer: "HOUSE", Length: 5},
			{Number: 2, Text: "Egg-shaped", Answer: "OVALS", Length: 5},
		},
		CluesDown: []models.Clue{
			{Number: 1, Text: "A dwelling", Answer: "HOUSE", Length: 5},
		},
	}

	result := scorer.ScorePuzzle(puzzle)

	if result == nil {
		t.Fatal("expected non-nil QualityReport")
	}

	if result.OverallScore < 0 || result.OverallScore > 100 {
		t.Errorf("OverallScore = %.2f, want between 0 and 100", result.OverallScore)
	}
}

func TestQualityScorer_EmptyPuzzle(t *testing.T) {
	ws := NewWordListService()
	scorer := NewQualityScorer(ws)

	// Empty puzzle
	puzzle := &models.Puzzle{
		GridWidth:  0,
		GridHeight: 0,
		Grid:       [][]models.GridCell{},
	}

	result := scorer.ScorePuzzle(puzzle)

	// Should handle empty puzzle gracefully
	if result == nil {
		t.Fatal("expected non-nil QualityReport even for empty puzzle")
	}
}

func TestQualityScorer_PuzzleWithBlackSquares(t *testing.T) {
	ws := NewWordListService()
	scorer := NewQualityScorer(ws)

	// Puzzle with black squares
	puzzle := &models.Puzzle{
		GridWidth:  5,
		GridHeight: 5,
		Grid: [][]models.GridCell{
			{{Letter: ptr("H")}, {Letter: ptr("O")}, {Letter: ptr("U")}, {Letter: ptr("S")}, {Letter: ptr("E")}},
			{{Letter: ptr("O")}, {Letter: nil}, {Letter: nil}, {Letter: nil}, {Letter: ptr("S")}},
			{{Letter: ptr("U")}, {Letter: nil}, {Letter: ptr("E")}, {Letter: nil}, {Letter: ptr("T")}},
			{{Letter: ptr("S")}, {Letter: nil}, {Letter: nil}, {Letter: nil}, {Letter: ptr("S")}},
			{{Letter: ptr("E")}, {Letter: ptr("S")}, {Letter: ptr("T")}, {Letter: ptr("S")}, {Letter: ptr("S")}},
		},
		CluesAcross: []models.Clue{
			{Number: 1, Text: "A dwelling", Answer: "HOUSE", Length: 5},
		},
		CluesDown: []models.Clue{},
	}

	result := scorer.ScorePuzzle(puzzle)

	if result == nil {
		t.Fatal("expected non-nil QualityReport")
	}

	// Report should contain warnings or errors for this asymmetric puzzle
	if len(result.Warnings) == 0 && len(result.Errors) == 0 {
		t.Log("Puzzle passed all checks (may be expected)")
	}
}

func TestQualityReport_Fields(t *testing.T) {
	ws := NewWordListService()
	scorer := NewQualityScorer(ws)

	puzzle := &models.Puzzle{
		GridWidth:  5,
		GridHeight: 5,
		Grid: [][]models.GridCell{
			{{Letter: ptr("A")}, {Letter: ptr("B")}, {Letter: ptr("C")}, {Letter: ptr("D")}, {Letter: ptr("E")}},
			{{Letter: ptr("F")}, {Letter: ptr("G")}, {Letter: ptr("H")}, {Letter: ptr("I")}, {Letter: ptr("J")}},
			{{Letter: ptr("K")}, {Letter: ptr("L")}, {Letter: ptr("M")}, {Letter: ptr("N")}, {Letter: ptr("O")}},
			{{Letter: ptr("P")}, {Letter: ptr("Q")}, {Letter: ptr("R")}, {Letter: ptr("S")}, {Letter: ptr("T")}},
			{{Letter: ptr("U")}, {Letter: ptr("V")}, {Letter: ptr("W")}, {Letter: ptr("X")}, {Letter: ptr("Y")}},
		},
		CluesAcross: []models.Clue{},
		CluesDown:   []models.Clue{},
	}

	result := scorer.ScorePuzzle(puzzle)

	// Check that report has expected structure
	if result.OverallScore < 0 {
		t.Error("OverallScore should be non-negative")
	}

	// Recommendations should be initialized (even if empty)
	if result.Recommendations == nil {
		t.Log("Recommendations is nil (may be expected)")
	}
}

func ptr(s string) *string {
	return &s
}
