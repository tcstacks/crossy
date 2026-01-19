package clues

import (
	"database/sql"
	"fmt"
)

// Schema defines the SQL schema for the clue cache database
const Schema = `
-- clue_cache table for caching generated clues
CREATE TABLE IF NOT EXISTS clue_cache (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	word TEXT NOT NULL,
	clue TEXT NOT NULL,
	difficulty TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- Index for fast lookups by word and difficulty
CREATE INDEX IF NOT EXISTS idx_clue_cache_word_difficulty
ON clue_cache(word, difficulty);
`

// InitDB initializes the database schema
// This function should be called when setting up the clue cache database
func InitDB(db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// Execute the schema creation
	_, err := db.Exec(Schema)
	if err != nil {
		return fmt.Errorf("failed to initialize database schema: %w", err)
	}

	return nil
}
