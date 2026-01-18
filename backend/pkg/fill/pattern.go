package fill

import (
	"sort"

	"github.com/crossplay/backend/pkg/grid"
)

// WordCandidate represents a word with its score for fill quality control
type WordCandidate struct {
	Word  string
	Score int
}

// Wordlist interface for pattern matching with score support
type Wordlist interface {
	Match(pattern string) []string
	MatchWithScores(pattern string, minScore int) []WordCandidate
}

// ConstraintInfo holds constraint data for sorting entries
type ConstraintInfo struct {
	Entry              *grid.Entry
	CrossingCount      int
	PatternSpecificity int
	IsCornerOrEdge     bool
}

// sortByConstraint orders entries by constraint level for efficient backtracking.
// Sorting priority:
//  1. Corner/edge entries (highest priority)
//  2. Number of crossing words (descending - more constrained first)
//  3. Pattern specificity (ascending - fewest matching words first)
//
// Parameters:
//   - entries: The list of entries to sort
//   - g: The grid containing the entries
//   - wordlist: Wordlist for pattern matching to determine specificity
//
// Returns:
//   - A sorted slice of entries
func sortByConstraint(entries []*grid.Entry, g *grid.Grid, wordlist Wordlist) []*grid.Entry {
	if len(entries) == 0 {
		return entries
	}

	// Build constraint info for each entry
	constraints := make([]ConstraintInfo, len(entries))
	for i, entry := range entries {
		constraints[i] = ConstraintInfo{
			Entry:              entry,
			CrossingCount:      countCrossings(entry, g),
			PatternSpecificity: getPatternSpecificity(entry, wordlist),
			IsCornerOrEdge:     isCornerOrEdge(entry, g),
		}
	}

	// Sort by constraint priority
	sort.SliceStable(constraints, func(i, j int) bool {
		// 1. Corner/edge entries first
		if constraints[i].IsCornerOrEdge != constraints[j].IsCornerOrEdge {
			return constraints[i].IsCornerOrEdge
		}

		// 2. More crossings first (descending)
		if constraints[i].CrossingCount != constraints[j].CrossingCount {
			return constraints[i].CrossingCount > constraints[j].CrossingCount
		}

		// 3. Fewer matching words first (ascending)
		return constraints[i].PatternSpecificity < constraints[j].PatternSpecificity
	})

	// Extract sorted entries
	result := make([]*grid.Entry, len(entries))
	for i, c := range constraints {
		result[i] = c.Entry
	}

	return result
}

// countCrossings counts the number of perpendicular entries that cross this entry
func countCrossings(entry *grid.Entry, g *grid.Grid) int {
	if entry == nil || g == nil {
		return 0
	}

	count := 0
	crossDirection := grid.DOWN
	if entry.Direction == grid.DOWN {
		crossDirection = grid.ACROSS
	}

	// Check each cell in the entry for crossings
	for _, cell := range entry.Cells {
		// Look for an entry in the perpendicular direction that includes this cell
		for _, other := range g.Entries {
			if other.Direction != crossDirection {
				continue
			}

			// Check if this entry crosses at this cell
			for _, otherCell := range other.Cells {
				if otherCell == cell {
					count++
					break
				}
			}
		}
	}

	return count
}

// getPatternSpecificity returns the number of words matching the current pattern.
// Fewer matches means more constrained/specific.
func getPatternSpecificity(entry *grid.Entry, wordlist Wordlist) int {
	if entry == nil || wordlist == nil {
		return 0
	}

	pattern := getPattern(entry)
	matches := wordlist.Match(pattern)
	return len(matches)
}

// isCornerOrEdge determines if an entry is at a corner or edge of the grid
func isCornerOrEdge(entry *grid.Entry, g *grid.Grid) bool {
	if entry == nil || g == nil || len(entry.Cells) == 0 {
		return false
	}

	startRow := entry.StartRow
	startCol := entry.StartCol

	// Check if starting position is at an edge
	isTopEdge := startRow == 0
	isBottomEdge := startRow == g.Size-1
	isLeftEdge := startCol == 0
	isRightEdge := startCol == g.Size-1

	// Corner: at two edges
	isCorner := (isTopEdge || isBottomEdge) && (isLeftEdge || isRightEdge)

	// Edge: at one edge
	isEdge := isTopEdge || isBottomEdge || isLeftEdge || isRightEdge

	return isCorner || isEdge
}

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
