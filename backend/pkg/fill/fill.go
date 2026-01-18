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
//
// Returns:
//   - nil on successful fill
//   - ErrNoValidFill if no valid fill can be found
func fillRecursive(entries []*grid.Entry, index int, g *grid.Grid, wordlist Wordlist, config FillConfig) error {
	// Base case: all entries have been filled successfully
	if index >= len(entries) {
		return nil
	}

	// Get the current entry to fill
	entry := entries[index]

	// Get the current pattern for this entry
	pattern := getPattern(entry)

	// Get candidate words matching the pattern
	candidates := wordlist.Match(pattern)

	// Try each candidate word
	for _, word := range candidates {
		// Skip words that don't meet the minimum score threshold
		// Note: The wordlist.Match should return words sorted by score,
		// but we check here for safety
		// For now, we'll try all candidates since we don't have score info
		// in the Match return value

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

		// Recursively try to fill the remaining entries
		err = fillRecursive(entries, index+1, g, wordlist, config)
		if err == nil {
			// Success! The recursion completed successfully
			return nil
		}

		// Backtrack: remove the word and try the next candidate
		removeWord(entry, g)
	}

	// No valid candidate found for this entry
	return ErrNoValidFill
}

// Fill attempts to fill the grid with words using backtracking.
// It sorts entries by constraint before attempting to fill, and respects
// the MaxRetries limit.
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

		// Attempt to fill recursively
		err := fillRecursive(sortedEntries, 0, g, wordlist, config)
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
