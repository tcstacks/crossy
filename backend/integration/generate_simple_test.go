package integration

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/pkg/clues"
	"github.com/crossplay/backend/pkg/grid"
	"github.com/crossplay/backend/pkg/output"
	"github.com/crossplay/backend/pkg/puzzle"
	"github.com/crossplay/backend/pkg/wordlist"
	_ "github.com/mattn/go-sqlite3"
)

// TestGenerate10EasyPuzzlesSimple is a simpler version that uses environment variable
// to point to a real wordlist file. This test demonstrates the full pipeline works.
func TestGenerate10EasyPuzzlesSimple(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Check for wordlist file - skip if not available
	wordlistPath := os.Getenv("CROSSGEN_WORDLIST")
	if wordlistPath == "" {
		t.Skip("CROSSGEN_WORDLIST environment variable not set - skipping integration test")
	}

	if _, err := os.Stat(wordlistPath); os.IsNotExist(err) {
		t.Skipf("Wordlist file not found at %s - skipping integration test", wordlistPath)
	}

	// Create a temporary directory for test outputs
	tmpDir := t.TempDir()

	// Load wordlist
	t.Logf("Loading wordlist from: %s", wordlistPath)
	wl, err := wordlist.LoadBrodaWordlist(wordlistPath)
	if err != nil {
		t.Fatalf("Failed to load wordlist: %v", err)
	}
	t.Logf("Loaded %d words", wl.Size())

	// Set up clue cache database
	cacheDBPath := filepath.Join(tmpDir, "test_clue_cache.db")
	cacheDB, err := sql.Open("sqlite3", cacheDBPath)
	if err != nil {
		t.Fatalf("Failed to open cache database: %v", err)
	}
	defer cacheDB.Close()

	// Initialize database schema
	if err := clues.InitDB(cacheDB); err != nil {
		t.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Create clue cache
	cache, err := clues.NewClueCache(cacheDB)
	if err != nil {
		t.Fatalf("Failed to create clue cache: %v", err)
	}

	// Populate cache with minimal test clues
	if err := populateMinimalTestCache(cache); err != nil {
		t.Logf("Warning: Failed to populate test cache: %v (continuing with empty cache)", err)
	}

	// Create clue generator with cache-only mode (no LLM)
	clueGen := clues.NewGenerator(cache, nil, clues.DifficultyEasy)

	// Create puzzle generator
	puzzleGen := puzzle.NewGenerator(wl, clueGen)

	// Generate 10 easy puzzles
	const puzzleCount = 10
	ctx := context.Background()

	generatedPuzzles := make([]*puzzle.Puzzle, 0, puzzleCount)

	for i := 1; i <= puzzleCount; i++ {
		t.Logf("Generating puzzle %d/%d...", i, puzzleCount)

		// Configure puzzle generation
		puzzleConfig := puzzle.Config{
			Size:       15,
			Difficulty: grid.Easy,
			Seed:       int64(i * 12345), // Fixed seed per puzzle for reproducibility
			MinScore:   50,
			MaxRetries: 100,
			Title:      "Integration Test Puzzle",
			Author:     "Test Suite",
			Theme:      "",
		}

		// Generate puzzle
		puz, err := puzzleGen.GeneratePuzzle(ctx, puzzleConfig)
		if err != nil {
			t.Fatalf("Failed to generate puzzle %d: %v", i, err)
		}

		if puz == nil {
			t.Fatalf("Generated puzzle %d is nil", i)
		}

		generatedPuzzles = append(generatedPuzzles, puz)
		t.Logf("Successfully generated puzzle %d/%d", i, puzzleCount)
	}

	// Validate all puzzles pass validation
	t.Run("ValidateAllPuzzles", func(t *testing.T) {
		for i, puz := range generatedPuzzles {
			testName := "Puzzle_" + string(rune('0'+i+1))
			t.Run(testName, func(t *testing.T) {
				// Validate grid structure
				if puz.Grid == nil {
					t.Errorf("Puzzle %d has nil grid", i+1)
					return
				}

				if puz.Grid.Size != 15 {
					t.Errorf("Puzzle %d has incorrect size: expected 15, got %d", i+1, puz.Grid.Size)
				}

				// Validate entries exist
				if len(puz.Grid.Entries) == 0 {
					t.Errorf("Puzzle %d has no entries", i+1)
				}

				// Validate metadata
				if puz.Metadata.ID == "" {
					t.Errorf("Puzzle %d has empty ID", i+1)
				}
				if puz.Metadata.Title == "" {
					t.Errorf("Puzzle %d has empty title", i+1)
				}
			})
		}
	})

	// Test output file creation in expected formats
	t.Run("OutputFileCreation", func(t *testing.T) {
		outputDir := filepath.Join(tmpDir, "output")
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			t.Fatalf("Failed to create output directory: %v", err)
		}

		// Test each format for the first puzzle
		testPuzzle := generatedPuzzles[0]
		modelsPuzzle := puzzle.ToModelsPuzzle(testPuzzle)

		formats := []struct {
			name      string
			extension string
			formatter func(*models.Puzzle) ([]byte, error)
		}{
			{"JSON", ".json", output.ToJSON},
			{"PUZ", ".puz", output.FormatPuz},
			{"IPUZ", ".ipuz", output.ToIPuz},
		}

		for _, format := range formats {
			t.Run(format.name, func(t *testing.T) {
				// Format puzzle
				data, err := format.formatter(modelsPuzzle)
				if err != nil {
					t.Fatalf("Failed to format puzzle as %s: %v", format.name, err)
				}

				if len(data) == 0 {
					t.Errorf("Formatted %s data is empty", format.name)
				}

				// Write to file
				filePath := filepath.Join(outputDir, "test_puzzle"+format.extension)
				if err := os.WriteFile(filePath, data, 0644); err != nil {
					t.Fatalf("Failed to write %s file: %v", format.name, err)
				}

				// Verify file exists and has content
				fileInfo, err := os.Stat(filePath)
				if err != nil {
					t.Errorf("Output file %s does not exist: %v", filePath, err)
				} else if fileInfo.Size() == 0 {
					t.Errorf("Output file %s is empty", filePath)
				}
			})
		}
	})

	// Ensure no panics occurred (this test passes if we reach here)
	t.Run("NoPanicsOrErrors", func(t *testing.T) {
		t.Log("All puzzles generated successfully without panics or unexpected errors")
	})
}

// populateMinimalTestCache populates the cache with a minimal set of clues
// This is a best-effort function - it's okay if it fails
func populateMinimalTestCache(cache *clues.ClueCache) error {
	// Just add a few common words - the cache-only mode will use empty clues for others
	commonWords := []struct {
		word string
		clue string
	}{
		{"THE", "Definite article"},
		{"AND", "Plus"},
		{"FOR", "In favor of"},
		{"ARE", "Exist"},
		{"BUT", "However"},
		{"NOT", "Negation"},
		{"YOU", "Second person"},
		{"ALL", "Everything"},
		{"CAN", "Able to"},
		{"HER", "She"},
		{"WAS", "Past tense of is"},
		{"ONE", "Single unit"},
		{"OUR", "Belonging to us"},
		{"OUT", "Not in"},
		{"DAY", "24 hours"},
		{"GET", "Obtain"},
		{"HAS", "Possesses"},
		{"HIM", "He"},
		{"HIS", "Belonging to him"},
		{"HOW", "In what way"},
	}

	for _, w := range commonWords {
		// Ignore errors - cache population is optional
		_ = cache.SaveClue(w.word, w.clue, "easy")
	}

	return nil
}
