package clues

import (
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}

	err = InitDB(db)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	return db
}

func TestNewClueCache(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	if cache == nil {
		t.Error("Expected non-nil cache")
	}

	if cache.db != db {
		t.Error("Cache database not set correctly")
	}
}

func TestNewClueCache_NilDatabase(t *testing.T) {
	cache, err := NewClueCache(nil)
	if err == nil {
		t.Error("Expected error for nil database, got nil")
	}

	if cache != nil {
		t.Error("Expected nil cache for nil database")
	}

	expectedMsg := "database connection is nil"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestClueCache_SaveClue(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Test saving a valid clue
	err = cache.SaveClue("APPLE", "Fruit that keeps the doctor away", "easy")
	if err != nil {
		t.Errorf("SaveClue failed: %v", err)
	}

	// Verify the clue was saved
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM clue_cache WHERE word = ?", "APPLE").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query saved clue: %v", err)
	}

	if count != 1 {
		t.Errorf("Expected 1 saved clue, got %d", count)
	}
}

func TestClueCache_SaveClue_EmptyWord(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	err = cache.SaveClue("", "Test clue", "easy")
	if err == nil {
		t.Error("Expected error for empty word, got nil")
	}

	expectedMsg := "word cannot be empty"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestClueCache_SaveClue_EmptyClue(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	err = cache.SaveClue("APPLE", "", "easy")
	if err == nil {
		t.Error("Expected error for empty clue, got nil")
	}

	expectedMsg := "clue cannot be empty"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestClueCache_SaveClue_EmptyDifficulty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	err = cache.SaveClue("APPLE", "Test clue", "")
	if err == nil {
		t.Error("Expected error for empty difficulty, got nil")
	}

	expectedMsg := "difficulty cannot be empty"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestClueCache_SaveClue_InvalidDifficulty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Should fail due to CHECK constraint in database
	err = cache.SaveClue("APPLE", "Test clue", "invalid")
	if err == nil {
		t.Error("Expected error for invalid difficulty, got nil")
	}
}

func TestClueCache_GetClue_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Try to get a clue that doesn't exist
	clue, found := cache.GetClue("NONEXISTENT", "easy")
	if found {
		t.Error("Expected found=false for nonexistent clue")
	}

	if clue != "" {
		t.Errorf("Expected empty string for nonexistent clue, got '%s'", clue)
	}
}

func TestClueCache_GetClue_Found(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Save a clue
	expectedClue := "Fruit that keeps the doctor away"
	err = cache.SaveClue("APPLE", expectedClue, "easy")
	if err != nil {
		t.Fatalf("SaveClue failed: %v", err)
	}

	// Retrieve the clue
	clue, found := cache.GetClue("APPLE", "easy")
	if !found {
		t.Error("Expected found=true for existing clue")
	}

	if clue != expectedClue {
		t.Errorf("Expected clue '%s', got '%s'", expectedClue, clue)
	}
}

func TestClueCache_GetClue_DifficultyMismatch(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Save a clue with "easy" difficulty
	err = cache.SaveClue("APPLE", "Fruit that keeps the doctor away", "easy")
	if err != nil {
		t.Fatalf("SaveClue failed: %v", err)
	}

	// Try to get with different difficulty
	clue, found := cache.GetClue("APPLE", "hard")
	if found {
		t.Error("Expected found=false for difficulty mismatch")
	}

	if clue != "" {
		t.Errorf("Expected empty string for mismatched difficulty, got '%s'", clue)
	}
}

func TestClueCache_GetClue_RandomSelection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Save multiple clues for the same word and difficulty
	clues := []string{
		"Flowing body of water",
		"Stream's bigger sibling",
		"Where salmon swim upstream",
	}

	for _, clue := range clues {
		err = cache.SaveClue("RIVER", clue, "medium")
		if err != nil {
			t.Fatalf("SaveClue failed: %v", err)
		}
	}

	// Retrieve multiple times and verify we get valid clues
	// (randomness is hard to test, but we can verify we get one of the saved clues)
	for i := 0; i < 10; i++ {
		clue, found := cache.GetClue("RIVER", "medium")
		if !found {
			t.Error("Expected found=true for existing clues")
		}

		// Verify the returned clue is one of the saved clues
		validClue := false
		for _, expectedClue := range clues {
			if clue == expectedClue {
				validClue = true
				break
			}
		}

		if !validClue {
			t.Errorf("Retrieved clue '%s' not in expected clues", clue)
		}
	}
}

func TestClueCache_GetClue_NilDatabase(t *testing.T) {
	cache := &ClueCache{db: nil}

	clue, found := cache.GetClue("APPLE", "easy")
	if found {
		t.Error("Expected found=false for nil database")
	}

	if clue != "" {
		t.Errorf("Expected empty string for nil database, got '%s'", clue)
	}
}

func TestClueCache_SaveClue_NilDatabase(t *testing.T) {
	cache := &ClueCache{db: nil}

	err := cache.SaveClue("APPLE", "Test clue", "easy")
	if err == nil {
		t.Error("Expected error for nil database, got nil")
	}

	expectedMsg := "database connection is nil"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestClueCache_MultipleWords(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Save clues for multiple words
	testCases := []struct {
		word       string
		clue       string
		difficulty string
	}{
		{"APPLE", "Fruit that keeps the doctor away", "easy"},
		{"BANANA", "Yellow tropical fruit", "easy"},
		{"RIVER", "Flowing body of water", "medium"},
		{"MOUNTAIN", "Tall natural elevation", "hard"},
	}

	for _, tc := range testCases {
		err = cache.SaveClue(tc.word, tc.clue, tc.difficulty)
		if err != nil {
			t.Errorf("SaveClue failed for %s: %v", tc.word, err)
		}
	}

	// Verify each clue can be retrieved
	for _, tc := range testCases {
		clue, found := cache.GetClue(tc.word, tc.difficulty)
		if !found {
			t.Errorf("Expected to find clue for %s", tc.word)
		}

		if clue != tc.clue {
			t.Errorf("Expected clue '%s' for %s, got '%s'", tc.clue, tc.word, clue)
		}
	}
}

func TestClueCache_AllDifficulties(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, err := NewClueCache(db)
	if err != nil {
		t.Fatalf("NewClueCache failed: %v", err)
	}

	// Save the same word with different difficulties
	word := "APPLE"
	difficulties := []struct {
		difficulty string
		clue       string
	}{
		{"easy", "Red or green fruit"},
		{"medium", "Fruit from a tree in the rose family"},
		{"hard", "Pomaceous fruit of genus Malus"},
	}

	for _, d := range difficulties {
		err = cache.SaveClue(word, d.clue, d.difficulty)
		if err != nil {
			t.Errorf("SaveClue failed for difficulty %s: %v", d.difficulty, err)
		}
	}

	// Verify each difficulty returns the correct clue
	for _, d := range difficulties {
		clue, found := cache.GetClue(word, d.difficulty)
		if !found {
			t.Errorf("Expected to find clue for difficulty %s", d.difficulty)
		}

		if clue != d.clue {
			t.Errorf("Expected clue '%s' for difficulty %s, got '%s'", d.clue, d.difficulty, clue)
		}
	}
}
