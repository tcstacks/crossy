package wordlist

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/crossplay/backend/pkg/fill"
)

// Word represents a word with its score
type Word struct {
	Text  string // The word itself
	Score int    // Quality score for this word
}

// Wordlist represents a collection of words organized by length
type Wordlist struct {
	ByLength map[int][]Word // Words grouped by length, sorted by score descending
}

// LoadBrodaWordlist loads a wordlist from a file in Peter Broda's format (WORD;SCORE).
// Each line should contain a word and its score separated by a semicolon.
// Words are converted to uppercase, grouped by length, and sorted by score (descending).
// Returns an error if the file is missing or malformed.
func LoadBrodaWordlist(path string) (*Wordlist, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open wordlist file: %w", err)
	}
	defer file.Close()

	wl := &Wordlist{
		ByLength: make(map[int][]Word),
	}

	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines
		if line == "" {
			continue
		}

		// Parse WORD;SCORE format
		parts := strings.Split(line, ";")
		if len(parts) != 2 {
			return nil, fmt.Errorf("malformed line %d: expected format 'WORD;SCORE', got '%s'", lineNum, line)
		}

		text := strings.ToUpper(strings.TrimSpace(parts[0]))
		scoreStr := strings.TrimSpace(parts[1])

		if text == "" {
			return nil, fmt.Errorf("malformed line %d: empty word", lineNum)
		}

		score, err := strconv.Atoi(scoreStr)
		if err != nil {
			return nil, fmt.Errorf("malformed line %d: invalid score '%s': %w", lineNum, scoreStr, err)
		}

		// Group words by length
		length := len(text)
		wl.ByLength[length] = append(wl.ByLength[length], Word{
			Text:  text,
			Score: score,
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading wordlist file: %w", err)
	}

	// Sort each length bucket by score descending
	for length := range wl.ByLength {
		sort.Slice(wl.ByLength[length], func(i, j int) bool {
			return wl.ByLength[length][i].Score > wl.ByLength[length][j].Score
		})
	}

	return wl, nil
}

// GetWordsOfLength returns all words of a specific length, sorted by score descending.
// Returns an empty slice if no words of that length exist.
func (wl *Wordlist) GetWordsOfLength(length int) []Word {
	words, exists := wl.ByLength[length]
	if !exists {
		return []Word{}
	}
	return words
}

// Size returns the total number of words in the wordlist.
func (wl *Wordlist) Size() int {
	count := 0
	for _, words := range wl.ByLength {
		count += len(words)
	}
	return count
}

// Match finds all words matching a pattern (e.g., "J__Z" matches JAZZ, JIZZ, etc.)
// Underscore '_' matches any letter. Returns words sorted by score descending.
func (wl *Wordlist) Match(pattern string) []string {
	patternLen := len(pattern)
	candidates, exists := wl.ByLength[patternLen]
	if !exists {
		return []string{}
	}

	var matches []string
	for _, word := range candidates {
		if matchesPattern(word.Text, pattern) {
			matches = append(matches, word.Text)
		}
	}

	return matches
}

// MatchWithScores finds all words matching a pattern with scores above minScore
// Returns WordCandidate structs sorted by score descending
func (wl *Wordlist) MatchWithScores(pattern string, minScore int) []fill.WordCandidate {
	patternLen := len(pattern)
	candidates, exists := wl.ByLength[patternLen]
	if !exists {
		return []fill.WordCandidate{}
	}

	var matches []fill.WordCandidate
	for _, word := range candidates {
		if word.Score >= minScore && matchesPattern(word.Text, pattern) {
			matches = append(matches, fill.WordCandidate{
				Word:  word.Text,
				Score: word.Score,
			})
		}
	}

	return matches
}

// matchesPattern checks if a word matches a pattern where '_' matches any letter
func matchesPattern(word, pattern string) bool {
	if len(word) != len(pattern) {
		return false
	}

	for i := 0; i < len(word); i++ {
		if pattern[i] != '_' && pattern[i] != word[i] {
			return false
		}
	}

	return true
}
