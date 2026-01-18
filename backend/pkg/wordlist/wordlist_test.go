package wordlist

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadBrodaWordlist_Success(t *testing.T) {
	// Create a temporary test file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	content := `JAZZ;95
PUZZLE;85
CAT;70
QUIZ;92
DOG;65
APPLE;80
ART;60
QUIZZES;88
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	// Test words are grouped by length
	// 3-letter: CAT, DOG, ART
	// 4-letter: JAZZ, QUIZ
	// 5-letter: APPLE
	// 6-letter: PUZZLE
	// 7-letter: QUIZZES
	if len(wl.ByLength) != 5 {
		t.Errorf("expected 5 different word lengths, got %d", len(wl.ByLength))
	}

	// Test 3-letter words
	threeLetters := wl.GetWordsOfLength(3)
	if len(threeLetters) != 3 {
		t.Errorf("expected 3 words of length 3, got %d", len(threeLetters))
	}

	// Test 4-letter words
	fourLetters := wl.GetWordsOfLength(4)
	if len(fourLetters) != 2 {
		t.Errorf("expected 2 words of length 4, got %d", len(fourLetters))
	}

	// Test sorting by score (descending)
	if fourLetters[0].Text != "JAZZ" || fourLetters[0].Score != 95 {
		t.Errorf("expected JAZZ with score 95 first, got %s with score %d", fourLetters[0].Text, fourLetters[0].Score)
	}
	if fourLetters[1].Text != "QUIZ" || fourLetters[1].Score != 92 {
		t.Errorf("expected QUIZ with score 92 second, got %s with score %d", fourLetters[1].Text, fourLetters[1].Score)
	}

	// Test uppercase conversion
	if threeLetters[0].Text != "CAT" && threeLetters[0].Text != "DOG" && threeLetters[0].Text != "ART" {
		t.Errorf("expected uppercase word, got %s", threeLetters[0].Text)
	}
}

func TestLoadBrodaWordlist_UppercaseConversion(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	content := `jazz;95
puzzle;85
cat;70
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	// Verify all words are uppercase
	fourLetters := wl.GetWordsOfLength(4)
	if len(fourLetters) != 1 {
		t.Fatalf("expected 1 word of length 4, got %d", len(fourLetters))
	}
	if fourLetters[0].Text != "JAZZ" {
		t.Errorf("expected uppercase 'JAZZ', got '%s'", fourLetters[0].Text)
	}

	sixLetters := wl.GetWordsOfLength(6)
	if len(sixLetters) != 1 {
		t.Fatalf("expected 1 word of length 6, got %d", len(sixLetters))
	}
	if sixLetters[0].Text != "PUZZLE" {
		t.Errorf("expected uppercase 'PUZZLE', got '%s'", sixLetters[0].Text)
	}

	threeLetters := wl.GetWordsOfLength(3)
	if len(threeLetters) != 1 {
		t.Fatalf("expected 1 word of length 3, got %d", len(threeLetters))
	}
	if threeLetters[0].Text != "CAT" {
		t.Errorf("expected uppercase 'CAT', got '%s'", threeLetters[0].Text)
	}
}

func TestLoadBrodaWordlist_SortedByScore(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	// Test with words intentionally out of order
	content := `WORD;50
TEST;90
CODE;70
BEST;60
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	words := wl.GetWordsOfLength(4)
	if len(words) != 4 {
		t.Fatalf("expected 4 words, got %d", len(words))
	}

	// Verify descending order by score
	if words[0].Score != 90 {
		t.Errorf("expected highest score 90, got %d", words[0].Score)
	}
	if words[1].Score != 70 {
		t.Errorf("expected second score 70, got %d", words[1].Score)
	}
	if words[2].Score != 60 {
		t.Errorf("expected third score 60, got %d", words[2].Score)
	}
	if words[3].Score != 50 {
		t.Errorf("expected lowest score 50, got %d", words[3].Score)
	}

	// Verify corresponding words
	if words[0].Text != "TEST" {
		t.Errorf("expected TEST first, got %s", words[0].Text)
	}
	if words[3].Text != "WORD" {
		t.Errorf("expected WORD last, got %s", words[3].Text)
	}
}

func TestLoadBrodaWordlist_EmptyLines(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	content := `JAZZ;95

PUZZLE;85

CAT;70
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	// Should successfully skip empty lines
	if wl.Size() != 3 {
		t.Errorf("expected 3 words total, got %d", wl.Size())
	}
}

func TestLoadBrodaWordlist_MissingFile(t *testing.T) {
	_, err := LoadBrodaWordlist("/nonexistent/path/to/wordlist.txt")
	if err == nil {
		t.Error("expected error for missing file, got nil")
	}
}

func TestLoadBrodaWordlist_MalformedFormat(t *testing.T) {
	tests := []struct {
		name    string
		content string
		errMsg  string
	}{
		{
			name:    "missing semicolon",
			content: "WORD 95\n",
			errMsg:  "malformed line",
		},
		{
			name:    "too many semicolons",
			content: "WORD;95;extra\n",
			errMsg:  "malformed line",
		},
		{
			name:    "invalid score",
			content: "WORD;abc\n",
			errMsg:  "invalid score",
		},
		{
			name:    "empty word",
			content: ";95\n",
			errMsg:  "empty word",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			testFile := filepath.Join(tmpDir, "test_wordlist.txt")

			if err := os.WriteFile(testFile, []byte(tt.content), 0644); err != nil {
				t.Fatalf("failed to create test file: %v", err)
			}

			_, err := LoadBrodaWordlist(testFile)
			if err == nil {
				t.Errorf("expected error containing '%s', got nil", tt.errMsg)
			}
		})
	}
}

func TestGetWordsOfLength_NonExistentLength(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	content := `JAZZ;95
CAT;70
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	// Request a length that doesn't exist
	words := wl.GetWordsOfLength(10)
	if len(words) != 0 {
		t.Errorf("expected empty slice for non-existent length, got %d words", len(words))
	}
}

func TestWordlist_Size(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	content := `JAZZ;95
PUZZLE;85
CAT;70
QUIZ;92
DOG;65
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	if wl.Size() != 5 {
		t.Errorf("expected size 5, got %d", wl.Size())
	}
}

func TestLoadBrodaWordlist_WhitespaceHandling(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test_wordlist.txt")

	// Test with extra whitespace
	content := `  JAZZ  ;  95
PUZZLE ; 85
  CAT;70
`

	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	wl, err := LoadBrodaWordlist(testFile)
	if err != nil {
		t.Fatalf("LoadBrodaWordlist failed: %v", err)
	}

	// Verify whitespace was trimmed correctly
	fourLetters := wl.GetWordsOfLength(4)
	if len(fourLetters) != 1 {
		t.Fatalf("expected 1 word of length 4, got %d", len(fourLetters))
	}
	if fourLetters[0].Text != "JAZZ" {
		t.Errorf("expected 'JAZZ', got '%s'", fourLetters[0].Text)
	}
	if fourLetters[0].Score != 95 {
		t.Errorf("expected score 95, got %d", fourLetters[0].Score)
	}
}
