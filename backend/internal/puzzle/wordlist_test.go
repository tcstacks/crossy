package puzzle

import (
	"testing"
)

func TestNewWordListService(t *testing.T) {
	ws := NewWordListService()
	if ws == nil {
		t.Fatal("expected non-nil WordListService")
	}
}

func TestWordListService_GetWordScore(t *testing.T) {
	ws := NewWordListService()

	tests := []struct {
		name     string
		word     string
		wantMin  int
		wantMax  int
	}{
		{
			name:    "common word has score",
			word:    "HOUSE",
			wantMin: 1,
			wantMax: 100,
		},
		{
			name:    "lowercase works",
			word:    "house",
			wantMin: 1,
			wantMax: 100,
		},
		{
			name:    "unknown word returns default score",
			word:    "XYZQW",
			wantMin: 0,
			wantMax: 100, // Unknown words may get a default score
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := ws.GetWordScore(tt.word)
			if score < tt.wantMin || score > tt.wantMax {
				t.Errorf("GetWordScore(%q) = %d, want between %d and %d", tt.word, score, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestWordListService_HasWord(t *testing.T) {
	ws := NewWordListService()

	tests := []struct {
		word string
		want bool
	}{
		{"HOUSE", true},
		{"CAT", true},
		{"XYZQW", false},
	}

	for _, tt := range tests {
		t.Run(tt.word, func(t *testing.T) {
			got := ws.HasWord(tt.word)
			if got != tt.want {
				t.Errorf("HasWord(%q) = %v, want %v", tt.word, got, tt.want)
			}
		})
	}
}

func TestWordListService_GetWordsForPattern(t *testing.T) {
	ws := NewWordListService()

	tests := []struct {
		name       string
		pattern    string
		minScore   int
		wantMinLen int
	}{
		{
			name:       "three letter pattern",
			pattern:    "C?T",
			minScore:   30,
			wantMinLen: 1, // Should find CAT at minimum
		},
		{
			name:       "longer pattern",
			pattern:    "H???E",
			minScore:   30,
			wantMinLen: 1, // Should find HOUSE, HORSE, etc.
		},
		{
			name:       "impossible pattern",
			pattern:    "QQQQQ",
			minScore:   0,
			wantMinLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			words := ws.GetWordsForPattern(tt.pattern, tt.minScore)
			if len(words) < tt.wantMinLen {
				t.Errorf("GetWordsForPattern(%q, %d) returned %d words, want >= %d", tt.pattern, tt.minScore, len(words), tt.wantMinLen)
			}
		})
	}
}

func TestWordListService_GetTopWords(t *testing.T) {
	ws := NewWordListService()

	// Test getting top words of various lengths
	for length := 3; length <= 8; length++ {
		words := ws.GetTopWords(length, 10)
		if len(words) == 0 {
			t.Errorf("GetTopWords(%d, 10) returned empty slice", length)
			continue
		}
		// Check that all returned words have the correct length
		for _, w := range words {
			if len(w.Word) != length {
				t.Errorf("GetTopWords(%d, 10) returned word of wrong length: %s", length, w.Word)
			}
		}
	}
}

func TestWordListService_IsCrosswordese(t *testing.T) {
	ws := NewWordListService()

	tests := []struct {
		word string
		want bool
	}{
		{"AREA", true},  // Common crosswordese
		{"OREO", true},  // Common crosswordese
		{"COMPUTER", false},
	}

	for _, tt := range tests {
		t.Run(tt.word, func(t *testing.T) {
			got := ws.IsCrosswordese(tt.word)
			if got != tt.want {
				t.Errorf("IsCrosswordese(%q) = %v, want %v", tt.word, got, tt.want)
			}
		})
	}
}

func TestWordListService_WordCount(t *testing.T) {
	ws := NewWordListService()

	count := ws.WordCount()
	if count < 1000 {
		t.Errorf("WordCount() = %d, want at least 1000", count)
	}
}

func TestWordListService_AddWord(t *testing.T) {
	ws := NewWordListService()

	// Add a new word
	ws.AddWord("TESTWORD", 75)

	// Verify it exists
	if !ws.HasWord("TESTWORD") {
		t.Error("AddWord did not add the word")
	}

	score := ws.GetWordScore("TESTWORD")
	if score != 75 {
		t.Errorf("GetWordScore(TESTWORD) = %d, want 75", score)
	}
}
