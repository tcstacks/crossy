package fill

import "github.com/crossplay/backend/pkg/grid"

// getPattern extracts the current pattern from a grid entry.
// It returns a string where filled cells show the letter and unfilled cells show '_'.
// The pattern includes letters from crossing perpendicular words.
//
// Parameters:
//   - entry: The entry to extract the pattern from
//
// Returns:
//   - A string with letters and underscores representing the current state of the entry
func getPattern(entry *grid.Entry) string {
	if entry == nil || len(entry.Cells) == 0 {
		return ""
	}

	pattern := make([]rune, len(entry.Cells))
	for i, cell := range entry.Cells {
		if cell.Letter == 0 {
			// Unfilled cell - use underscore
			pattern[i] = '_'
		} else {
			// Filled cell - use the letter
			pattern[i] = cell.Letter
		}
	}

	return string(pattern)
}
