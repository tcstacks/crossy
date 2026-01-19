package clues

import (
	"database/sql"
	"fmt"
)

// ClueCache provides methods for saving and retrieving cached clues
type ClueCache struct {
	db *sql.DB
}

// NewClueCache creates a new ClueCache instance
func NewClueCache(db *sql.DB) (*ClueCache, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}
	return &ClueCache{db: db}, nil
}

// GetClue retrieves a random cached clue for the given word and difficulty
// Returns (clue, true) if found, ("", false) if not found
// Handles database errors gracefully by returning ("", false)
func (c *ClueCache) GetClue(word, difficulty string) (string, bool) {
	if c.db == nil {
		return "", false
	}

	// Query for a random clue matching word and difficulty
	// ORDER BY RANDOM() gives us a random selection when multiple clues exist
	var clue string
	err := c.db.QueryRow(`
		SELECT clue FROM clue_cache
		WHERE word = ? AND difficulty = ?
		ORDER BY RANDOM()
		LIMIT 1
	`, word, difficulty).Scan(&clue)

	if err != nil {
		// Return false for both sql.ErrNoRows and other database errors
		return "", false
	}

	return clue, true
}

// SaveClue inserts a new clue into the database
// Returns an error if the database operation fails
func (c *ClueCache) SaveClue(word, clue, difficulty string) error {
	if c.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	if word == "" {
		return fmt.Errorf("word cannot be empty")
	}

	if clue == "" {
		return fmt.Errorf("clue cannot be empty")
	}

	if difficulty == "" {
		return fmt.Errorf("difficulty cannot be empty")
	}

	// Insert the clue into the cache
	_, err := c.db.Exec(`
		INSERT INTO clue_cache (word, clue, difficulty)
		VALUES (?, ?, ?)
	`, word, clue, difficulty)

	if err != nil {
		return fmt.Errorf("failed to save clue: %w", err)
	}

	return nil
}
