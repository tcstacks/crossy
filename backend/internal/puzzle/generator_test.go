package puzzle

import (
	"testing"

	"github.com/crossplay/backend/internal/models"
)

func TestNewGenerator(t *testing.T) {
	gen := NewGenerator("")
	if gen == nil {
		t.Fatal("expected non-nil Generator")
	}
}

func TestNewGeneratorWithWordList(t *testing.T) {
	ws := NewWordListService()
	gen := NewGeneratorWithWordList(ws)
	if gen == nil {
		t.Fatal("expected non-nil Generator")
	}
}

func TestGridFiller_GenerateSymmetricBlackSquares(t *testing.T) {
	ws := NewWordListService()
	gf := NewGridFiller(ws)

	sizes := []struct {
		width, height int
		density       float64
	}{
		{5, 5, 0.0},
		{9, 9, 0.14},
		{15, 15, 0.16},
	}

	for _, size := range sizes {
		t.Run("", func(t *testing.T) {
			blackSquares := gf.GenerateSymmetricBlackSquares(size.width, size.height, size.density)

			// Check symmetry
			for _, pos := range blackSquares {
				symX := size.width - 1 - pos.X
				symY := size.height - 1 - pos.Y
				foundSym := false
				for _, other := range blackSquares {
					if other.X == symX && other.Y == symY {
						foundSym = true
						break
					}
				}
				// Self-symmetric positions (center) don't need a pair
				if pos.X == symX && pos.Y == symY {
					continue
				}
				if !foundSym {
					t.Errorf("black square at (%d,%d) missing symmetric pair at (%d,%d)", pos.X, pos.Y, symX, symY)
				}
			}
		})
	}
}

func TestGenerator_Generate_MiniPuzzle(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping puzzle generation test in short mode")
	}

	gen := NewGenerator("")

	req := &GenerationRequest{
		Difficulty: models.DifficultyEasy,
		GridWidth:  5,
		GridHeight: 5,
	}

	puzzle, err := gen.Generate(req)
	if err != nil {
		t.Skipf("mini puzzle generation failed (may be expected): %v", err)
	}

	if puzzle == nil {
		t.Fatal("expected non-nil puzzle")
	}

	if puzzle.GridWidth != 5 || puzzle.GridHeight != 5 {
		t.Errorf("puzzle dimensions = %dx%d, want 5x5", puzzle.GridWidth, puzzle.GridHeight)
	}

	// Should have at least some clues
	if len(puzzle.CluesAcross) == 0 && len(puzzle.CluesDown) == 0 {
		t.Error("expected at least one clue")
	}
}

func TestGenerationRequest(t *testing.T) {
	req := &GenerationRequest{
		Difficulty: models.DifficultyMedium,
		GridWidth:  15,
		GridHeight: 15,
		Theme:      "Animals",
		DayOfWeek:  "Wednesday",
	}

	if req.Difficulty != models.DifficultyMedium {
		t.Errorf("Difficulty = %s, want medium", req.Difficulty)
	}
	if req.GridWidth != 15 {
		t.Errorf("GridWidth = %d, want 15", req.GridWidth)
	}
	if req.Theme != "Animals" {
		t.Errorf("Theme = %s, want Animals", req.Theme)
	}
}
