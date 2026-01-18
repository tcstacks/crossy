package fill

import (
	"errors"

	"github.com/crossplay/backend/pkg/grid"
)

var (
	// ErrNoValidFill is returned when the fill algorithm cannot find a valid solution
	ErrNoValidFill = errors.New("no valid fill found")
)

// FillConfig holds configuration parameters for the fill algorithm
type FillConfig struct {
	MinScore   int // Minimum word quality score (default 50)
	MaxRetries int // Maximum number of retries before giving up (default 100)
}

// fillRecursive is the core backtracking algorithm that recursively fills entries.
// It fills entries in constraint-sorted order, trying candidates that match the
// current pattern and meet the MinScore threshold.
//
// Parameters:
//   - entries: The list of entries to fill (should be constraint-sorted)
//   - index: The current index in the entries list
//   - g: The grid being filled
//   - wordlist: Wordlist for finding candidate words
//   - config: Configuration for minimum score threshold
//   - usedWords: Set of words already used in the puzzle (prevents duplicates)
//
// Returns:
//   - nil on successful fill
//   - ErrNoValidFill if no valid fill can be found
func fillRecursive(entries []*grid.Entry, index int, g *grid.Grid, wordlist Wordlist, config FillConfig, usedWords map[string]bool) error {
	// Base case: all entries have been filled successfully
	if index >= len(entries) {
		return nil
	}

	// Get the current entry to fill
	entry := entries[index]

	// Get the current pattern for this entry
	pattern := getPattern(entry)

	// Get candidate words matching the pattern with score filtering
	candidates := wordlist.MatchWithScores(pattern, config.MinScore)

	// Try each candidate word
	for _, candidate := range candidates {
		word := candidate.Word

		// Skip words that don't meet the minimum score threshold
		if candidate.Score < config.MinScore {
			continue
		}

		// Skip words that have already been used (prevent duplicates)
		if usedWords[word] {
			continue
		}

		// Check if this word conflicts with existing filled cells
		if conflictsWithFilled(entry, word) {
			continue
		}

		// Try placing this word
		err := placeWord(entry, word)
		if err != nil {
			// Should not happen if our logic is correct, but handle it
			continue
		}

		// Track this word as used
		usedWords[word] = true

		// Recursively try to fill the remaining entries
		err = fillRecursive(entries, index+1, g, wordlist, config, usedWords)
		if err == nil {
			// Success! The recursion completed successfully
			return nil
		}

		// Backtrack: remove the word and untrack it
		removeWord(entry, g)
		delete(usedWords, word)
	}

	// No valid candidate found for this entry
	return ErrNoValidFill
}

// Fill attempts to fill the grid with words using backtracking.
// It sorts entries by constraint before attempting to fill, and respects
// the MaxRetries limit. Enforces MinScore threshold and prevents duplicate words.
//
// Parameters:
//   - g: The grid to fill
//   - wordlist: Wordlist for finding candidate words
//   - config: Configuration for minimum score and max retries
//
// Returns:
//   - nil on successful fill
//   - ErrNoValidFill if no valid fill can be found after MaxRetries attempts
func Fill(g *grid.Grid, wordlist Wordlist, config FillConfig) error {
	if g == nil || wordlist == nil {
		return errors.New("grid and wordlist cannot be nil")
	}

	// Set default config values if not provided
	if config.MinScore == 0 {
		config.MinScore = 50
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 100
	}

	// Try filling the grid up to MaxRetries times
	for attempt := 0; attempt < config.MaxRetries; attempt++ {
		// Sort entries by constraint for efficient backtracking
		sortedEntries := sortByConstraint(g.Entries, g, wordlist)

		// Initialize used words tracking for this fill attempt
		usedWords := make(map[string]bool)

		// Attempt to fill recursively with quality controls
		err := fillRecursive(sortedEntries, 0, g, wordlist, config, usedWords)
		if err == nil {
			// Success!
			return nil
		}

		// Clear the grid for the next attempt
		for _, entry := range g.Entries {
			for _, cell := range entry.Cells {
				cell.Letter = 0
			}
		}
	}

	// Failed after MaxRetries attempts
	return ErrNoValidFill
}
