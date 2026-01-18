package wordlist

import (
	"testing"
)

func TestNewTrie(t *testing.T) {
	trie := NewTrie()
	if trie == nil {
		t.Fatal("NewTrie() returned nil")
	}
	if trie.root == nil {
		t.Fatal("NewTrie() root is nil")
	}
}

func TestTrie_Insert(t *testing.T) {
	tests := []struct {
		name  string
		word  string
		score int
	}{
		{
			name:  "insert simple word",
			word:  "CAT",
			score: 80,
		},
		{
			name:  "insert longer word",
			word:  "HOUSE",
			score: 75,
		},
		{
			name:  "insert word with low score",
			word:  "OREO",
			score: 20,
		},
		{
			name:  "insert single letter",
			word:  "A",
			score: 50,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			trie := NewTrie()
			trie.Insert(tt.word, tt.score)

			// Verify word can be found via exact match
			results := trie.Match(tt.word)
			if len(results) != 1 {
				t.Fatalf("Match(%q) returned %d results, want 1", tt.word, len(results))
			}
			if results[0].Word != tt.word {
				t.Errorf("Match(%q) word = %q, want %q", tt.word, results[0].Word, tt.word)
			}
			if results[0].Score != tt.score {
				t.Errorf("Match(%q) score = %d, want %d", tt.word, results[0].Score, tt.score)
			}
		})
	}
}

func TestTrie_InsertEmpty(t *testing.T) {
	trie := NewTrie()
	trie.Insert("", 50)

	// Empty string should not be inserted
	results := trie.Match("")
	if len(results) != 0 {
		t.Errorf("Match(\"\") returned %d results, want 0", len(results))
	}
}

func TestTrie_Match_ExactMatch(t *testing.T) {
	trie := NewTrie()
	trie.Insert("JAZZ", 90)
	trie.Insert("JAVA", 85)
	trie.Insert("JUNK", 70)

	results := trie.Match("JAZZ")
	if len(results) != 1 {
		t.Fatalf("Match(JAZZ) returned %d results, want 1", len(results))
	}
	if results[0].Word != "JAZZ" {
		t.Errorf("Match(JAZZ) word = %q, want JAZZ", results[0].Word)
	}
	if results[0].Score != 90 {
		t.Errorf("Match(JAZZ) score = %d, want 90", results[0].Score)
	}
}

func TestTrie_Match_WithUnderscore(t *testing.T) {
	trie := NewTrie()
	trie.Insert("JAZZ", 90)
	trie.Insert("JAVA", 85)
	trie.Insert("JUNK", 70)
	trie.Insert("JUNE", 75)

	tests := []struct {
		name         string
		pattern      string
		wantWords    []string
		wantMinCount int
	}{
		{
			name:      "single underscore at end",
			pattern:   "JAZ_",
			wantWords: []string{"JAZZ"},
		},
		{
			name:         "multiple underscores",
			pattern:      "J___",
			wantWords:    []string{"JAZZ", "JAVA", "JUNK", "JUNE"},
			wantMinCount: 4,
		},
		{
			name:      "underscore in middle",
			pattern:   "J_ZZ",
			wantWords: []string{"JAZZ"},
		},
		{
			name:      "underscore at start",
			pattern:   "_UNK",
			wantWords: []string{"JUNK"},
		},
		{
			name:      "multiple specific underscores",
			pattern:   "J_N_",
			wantWords: []string{"JUNK", "JUNE"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := trie.Match(tt.pattern)

			if tt.wantMinCount > 0 && len(results) < tt.wantMinCount {
				t.Errorf("Match(%q) returned %d results, want at least %d", tt.pattern, len(results), tt.wantMinCount)
			}

			if len(tt.wantWords) > 0 {
				gotWords := make(map[string]bool)
				for _, r := range results {
					gotWords[r.Word] = true
				}

				for _, want := range tt.wantWords {
					if !gotWords[want] {
						t.Errorf("Match(%q) missing word %q", tt.pattern, want)
					}
				}
			}
		})
	}
}

func TestTrie_Match_SortedByScore(t *testing.T) {
	trie := NewTrie()
	trie.Insert("JAZZ", 90)
	trie.Insert("JAVA", 85)
	trie.Insert("JUNK", 70)
	trie.Insert("JUNE", 75)

	results := trie.Match("J___")

	if len(results) != 4 {
		t.Fatalf("Match(J___) returned %d results, want 4", len(results))
	}

	// Verify results are sorted by score descending
	expectedOrder := []struct {
		word  string
		score int
	}{
		{"JAZZ", 90},
		{"JAVA", 85},
		{"JUNE", 75},
		{"JUNK", 70},
	}

	for i, expected := range expectedOrder {
		if results[i].Word != expected.word {
			t.Errorf("results[%d].Word = %q, want %q", i, results[i].Word, expected.word)
		}
		if results[i].Score != expected.score {
			t.Errorf("results[%d].Score = %d, want %d", i, results[i].Score, expected.score)
		}
	}
}

func TestTrie_Match_NoMatches(t *testing.T) {
	trie := NewTrie()
	trie.Insert("CAT", 80)
	trie.Insert("DOG", 75)

	tests := []struct {
		name    string
		pattern string
	}{
		{
			name:    "no matching word",
			pattern: "BIRD",
		},
		{
			name:    "pattern too long",
			pattern: "CATEGORY",
		},
		{
			name:    "wrong pattern",
			pattern: "C_G",
		},
		{
			name:    "pattern with no prefix match",
			pattern: "Z___",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := trie.Match(tt.pattern)
			if len(results) != 0 {
				t.Errorf("Match(%q) returned %d results, want 0", tt.pattern, len(results))
			}
		})
	}
}

func TestTrie_Match_EmptyPattern(t *testing.T) {
	trie := NewTrie()
	trie.Insert("CAT", 80)

	results := trie.Match("")
	if len(results) != 0 {
		t.Errorf("Match(\"\") returned %d results, want 0", len(results))
	}
}

func TestTrie_Match_AllUnderscores(t *testing.T) {
	trie := NewTrie()
	trie.Insert("CAT", 80)
	trie.Insert("DOG", 75)
	trie.Insert("BAT", 70)

	results := trie.Match("___")

	if len(results) != 3 {
		t.Fatalf("Match(___) returned %d results, want 3", len(results))
	}

	// Verify sorted by score
	if results[0].Word != "CAT" || results[0].Score != 80 {
		t.Errorf("results[0] = {%q, %d}, want {CAT, 80}", results[0].Word, results[0].Score)
	}
	if results[1].Word != "DOG" || results[1].Score != 75 {
		t.Errorf("results[1] = {%q, %d}, want {DOG, 75}", results[1].Word, results[1].Score)
	}
	if results[2].Word != "BAT" || results[2].Score != 70 {
		t.Errorf("results[2] = {%q, %d}, want {BAT, 70}", results[2].Word, results[2].Score)
	}
}

func TestTrie_MultipleInsertsSameWord(t *testing.T) {
	trie := NewTrie()
	trie.Insert("CAT", 80)
	trie.Insert("CAT", 90) // Update score

	results := trie.Match("CAT")
	if len(results) != 1 {
		t.Fatalf("Match(CAT) returned %d results, want 1", len(results))
	}

	// Should have the last inserted score
	if results[0].Score != 90 {
		t.Errorf("Match(CAT) score = %d, want 90", results[0].Score)
	}
}

func TestTrie_LargeDataset(t *testing.T) {
	trie := NewTrie()

	// Insert a variety of words
	words := []struct {
		word  string
		score int
	}{
		{"APPLE", 85},
		{"APPLY", 80},
		{"APPLICATION", 75},
		{"BANANA", 90},
		{"BAND", 70},
		{"BANDANA", 65},
		{"CAR", 95},
		{"CARD", 92},
		{"CARE", 88},
		{"CAREFUL", 86},
	}

	for _, w := range words {
		trie.Insert(w.word, w.score)
	}

	// Test pattern matching
	results := trie.Match("APP__")
	if len(results) != 2 {
		t.Fatalf("Match(APP__) returned %d results, want 2", len(results))
	}

	// Verify sorted by score
	if results[0].Word != "APPLE" {
		t.Errorf("results[0].Word = %q, want APPLE", results[0].Word)
	}
	if results[1].Word != "APPLY" {
		t.Errorf("results[1].Word = %q, want APPLY", results[1].Word)
	}
}

func TestTrie_CaseSensitive(t *testing.T) {
	trie := NewTrie()
	trie.Insert("CAT", 80)
	trie.Insert("cat", 70)

	// Should treat uppercase and lowercase as different
	resultsUpper := trie.Match("CAT")
	if len(resultsUpper) != 1 || resultsUpper[0].Word != "CAT" {
		t.Errorf("Match(CAT) = %+v, want [{CAT 80}]", resultsUpper)
	}

	resultsLower := trie.Match("cat")
	if len(resultsLower) != 1 || resultsLower[0].Word != "cat" {
		t.Errorf("Match(cat) = %+v, want [{cat 70}]", resultsLower)
	}
}
