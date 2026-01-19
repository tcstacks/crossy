package clues

import (
	"database/sql"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestInitDB(t *testing.T) {
	// Create an in-memory SQLite database for testing
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Test successful initialization
	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Verify table exists by querying it
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM clue_cache").Scan(&count)
	if err != nil {
		t.Errorf("Failed to query clue_cache table: %v", err)
	}

	if count != 0 {
		t.Errorf("Expected empty table, got %d rows", count)
	}
}

func TestInitDB_NilDatabase(t *testing.T) {
	err := InitDB(nil)
	if err == nil {
		t.Error("Expected error for nil database, got nil")
	}

	expectedMsg := "database connection is nil"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

func TestInitDB_Idempotent(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Initialize multiple times - should not error due to IF NOT EXISTS
	for i := 0; i < 3; i++ {
		err = InitDB(db)
		if err != nil {
			t.Errorf("InitDB failed on iteration %d: %v", i+1, err)
		}
	}
}

func TestClueCache_TableStructure(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Test inserting a valid row
	_, err = db.Exec(
		"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
		"APPLE", "Fruit that keeps the doctor away", "easy",
	)
	if err != nil {
		t.Errorf("Failed to insert valid row: %v", err)
	}

	// Verify the row was inserted
	var word, clue, difficulty string
	var createdAt time.Time
	err = db.QueryRow(
		"SELECT word, clue, difficulty, created_at FROM clue_cache WHERE word = ?",
		"APPLE",
	).Scan(&word, &clue, &difficulty, &createdAt)

	if err != nil {
		t.Fatalf("Failed to query inserted row: %v", err)
	}

	if word != "APPLE" {
		t.Errorf("Expected word 'APPLE', got '%s'", word)
	}
	if clue != "Fruit that keeps the doctor away" {
		t.Errorf("Expected clue 'Fruit that keeps the doctor away', got '%s'", clue)
	}
	if difficulty != "easy" {
		t.Errorf("Expected difficulty 'easy', got '%s'", difficulty)
	}
	if createdAt.IsZero() {
		t.Error("Expected created_at to be set, got zero time")
	}
}

func TestClueCache_DifficultyConstraint(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Test valid difficulties
	validDifficulties := []string{"easy", "medium", "hard"}
	for _, diff := range validDifficulties {
		_, err = db.Exec(
			"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
			"WORD", "Test clue", diff,
		)
		if err != nil {
			t.Errorf("Failed to insert with valid difficulty '%s': %v", diff, err)
		}
	}

	// Test invalid difficulty (should fail due to constraint)
	_, err = db.Exec(
		"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
		"WORD", "Test clue", "invalid",
	)
	if err == nil {
		t.Error("Expected error for invalid difficulty, got nil")
	}
}

func TestClueCache_MultipleCluesPerWordDifficulty(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Insert multiple clues for the same word and difficulty
	word := "RIVER"
	difficulty := "medium"
	clues := []string{
		"Flowing body of water",
		"Stream's bigger sibling",
		"Where salmon swim upstream",
	}

	for _, clue := range clues {
		_, err = db.Exec(
			"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
			word, clue, difficulty,
		)
		if err != nil {
			t.Errorf("Failed to insert clue '%s': %v", clue, err)
		}
	}

	// Query and verify all clues were stored
	rows, err := db.Query(
		"SELECT clue FROM clue_cache WHERE word = ? AND difficulty = ?",
		word, difficulty,
	)
	if err != nil {
		t.Fatalf("Failed to query clues: %v", err)
	}
	defer rows.Close()

	var retrievedClues []string
	for rows.Next() {
		var clue string
		if err := rows.Scan(&clue); err != nil {
			t.Errorf("Failed to scan clue: %v", err)
		}
		retrievedClues = append(retrievedClues, clue)
	}

	if len(retrievedClues) != len(clues) {
		t.Errorf("Expected %d clues, got %d", len(clues), len(retrievedClues))
	}
}

func TestClueCache_Index(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Verify the index exists
	var indexName string
	err = db.QueryRow(`
		SELECT name FROM sqlite_master
		WHERE type='index' AND name='idx_clue_cache_word_difficulty'
	`).Scan(&indexName)

	if err != nil {
		t.Fatalf("Index not found: %v", err)
	}

	if indexName != "idx_clue_cache_word_difficulty" {
		t.Errorf("Expected index name 'idx_clue_cache_word_difficulty', got '%s'", indexName)
	}
}

func TestClueCache_AutoIncrement(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Insert multiple rows and verify IDs auto-increment
	for i := 1; i <= 3; i++ {
		result, err := db.Exec(
			"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
			"WORD", "Test clue", "easy",
		)
		if err != nil {
			t.Errorf("Failed to insert row %d: %v", i, err)
		}

		lastID, err := result.LastInsertId()
		if err != nil {
			t.Errorf("Failed to get last insert ID: %v", err)
		}

		if lastID != int64(i) {
			t.Errorf("Expected ID %d, got %d", i, lastID)
		}
	}
}

func TestClueCache_CreatedAtDefault(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	err = InitDB(db)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	// Insert without specifying created_at
	beforeInsert := time.Now().Add(-1 * time.Second)
	_, err = db.Exec(
		"INSERT INTO clue_cache (word, clue, difficulty) VALUES (?, ?, ?)",
		"TEST", "Test clue", "easy",
	)
	if err != nil {
		t.Fatalf("Failed to insert row: %v", err)
	}
	afterInsert := time.Now().Add(1 * time.Second)

	// Verify created_at was set automatically
	var createdAt time.Time
	err = db.QueryRow(
		"SELECT created_at FROM clue_cache WHERE word = ?",
		"TEST",
	).Scan(&createdAt)

	if err != nil {
		t.Fatalf("Failed to query created_at: %v", err)
	}

	if createdAt.Before(beforeInsert) || createdAt.After(afterInsert) {
		t.Errorf("created_at %v is not within expected range [%v, %v]",
			createdAt, beforeInsert, afterInsert)
	}
}
