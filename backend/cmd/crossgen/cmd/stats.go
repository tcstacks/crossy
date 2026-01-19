package cmd

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"github.com/spf13/cobra"
)

var (
	statsDB string
)

var statsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Display clue cache statistics",
	Long: `Display statistics about the clue cache database.

Shows information about:
  - Total cached clues by difficulty level
  - Cache hit rate (if available)
  - Most frequently cached words
  - Least frequently cached words
  - Database size and growth

Examples:
  # Show stats for default cache location
  crossgen stats

  # Show stats for custom cache database
  crossgen stats --db /path/to/cache.db`,
	RunE: runStats,
}

func init() {
	rootCmd.AddCommand(statsCmd)

	statsCmd.Flags().StringVarP(&statsDB, "db", "d", "", "path to clue cache database (default: ./clue_cache.db)")
}

func runStats(cmd *cobra.Command, args []string) error {
	dbPath := statsDB
	if dbPath == "" {
		dbPath = "./clue_cache.db"
	}

	if verbosity > 0 {
		fmt.Printf("Reading cache database: %s\n", dbPath)
	}

	// Check if database file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return fmt.Errorf("cache database not found at %s", dbPath)
	}

	// Open database connection
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	// Display statistics
	fmt.Printf("\nClue Cache Statistics\n")
	fmt.Printf("=====================\n")
	fmt.Printf("Database: %s\n\n", dbPath)

	// Total cached clues by difficulty
	if err := displayCluesByDifficulty(db); err != nil {
		return err
	}

	// Most common cached words
	if err := displayMostCommonWords(db); err != nil {
		return err
	}

	// Least common cached words
	if err := displayLeastCommonWords(db); err != nil {
		return err
	}

	return nil
}

func displayCluesByDifficulty(db *sql.DB) error {
	fmt.Println("Total Cached Clues by Difficulty:")
	fmt.Println("----------------------------------")

	rows, err := db.Query(`
		SELECT difficulty, COUNT(*) as count
		FROM clue_cache
		GROUP BY difficulty
		ORDER BY
			CASE difficulty
				WHEN 'easy' THEN 1
				WHEN 'medium' THEN 2
				WHEN 'hard' THEN 3
			END
	`)
	if err != nil {
		return fmt.Errorf("failed to query clues by difficulty: %w", err)
	}
	defer rows.Close()

	total := 0
	hasRows := false
	for rows.Next() {
		hasRows = true
		var difficulty string
		var count int
		if err := rows.Scan(&difficulty, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}
		fmt.Printf("  %-10s: %d\n", difficulty, count)
		total += count
	}

	if !hasRows {
		fmt.Println("  No cached clues found")
	} else {
		fmt.Printf("  %-10s: %d\n", "TOTAL", total)
	}
	fmt.Println()

	return rows.Err()
}

func displayMostCommonWords(db *sql.DB) error {
	fmt.Println("Most Common Cached Words:")
	fmt.Println("-------------------------")

	rows, err := db.Query(`
		SELECT word, COUNT(*) as count
		FROM clue_cache
		GROUP BY word
		ORDER BY count DESC, word
		LIMIT 10
	`)
	if err != nil {
		return fmt.Errorf("failed to query most common words: %w", err)
	}
	defer rows.Close()

	hasRows := false
	for rows.Next() {
		hasRows = true
		var word string
		var count int
		if err := rows.Scan(&word, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}
		fmt.Printf("  %-20s: %d clue(s)\n", word, count)
	}

	if !hasRows {
		fmt.Println("  No cached words found")
	}
	fmt.Println()

	return rows.Err()
}

func displayLeastCommonWords(db *sql.DB) error {
	fmt.Println("Least Common Cached Words:")
	fmt.Println("--------------------------")

	rows, err := db.Query(`
		SELECT word, COUNT(*) as count
		FROM clue_cache
		GROUP BY word
		ORDER BY count ASC, word
		LIMIT 10
	`)
	if err != nil {
		return fmt.Errorf("failed to query least common words: %w", err)
	}
	defer rows.Close()

	hasRows := false
	for rows.Next() {
		hasRows = true
		var word string
		var count int
		if err := rows.Scan(&word, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}
		fmt.Printf("  %-20s: %d clue(s)\n", word, count)
	}

	if !hasRows {
		fmt.Println("  No cached words found")
	}
	fmt.Println()

	return rows.Err()
}
