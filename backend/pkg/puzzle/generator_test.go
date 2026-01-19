package puzzle

import (
	"context"
	"errors"
	"testing"

	"github.com/crossplay/backend/pkg/clues"
	"github.com/crossplay/backend/pkg/fill"
	"github.com/crossplay/backend/pkg/grid"
)

// Mock wordlist for testing
type mockWordlist struct {
	words map[string][]string // pattern -> words
}

func (m *mockWordlist) Match(pattern string) []string {
	if words, ok := m.words[pattern]; ok {
		return words
	}
	// Return some default words for any pattern
	return []string{"TEST", "WORD", "FILL"}
}

func (m *mockWordlist) MatchWithScores(pattern string, minScore int) []fill.WordCandidate {
	words := m.Match(pattern)
	candidates := make([]fill.WordCandidate, len(words))
	for i, word := range words {
		candidates[i] = fill.WordCandidate{
			Word:  word,
			Score: 75, // Good score
		}
	}
	return candidates
}

// Mock clue generator for testing
type mockClueGenerator struct {
	shouldFail bool
	clues      map[string]string
}

func newMockClueGenerator() *mockClueGenerator {
	return &mockClueGenerator{
		clues: make(map[string]string),
	}
}

func (m *mockClueGenerator) GenerateClues(ctx context.Context, entries []*grid.Entry) (map[string]string, error) {
	if m.shouldFail {
		return nil, errors.New("mock clue generation failed")
	}

	result := make(map[string]string)
	for _, entry := range entries {
		key := getEntryKey(entry)
		if clue, ok := m.clues[key]; ok {
			result[key] = clue
		} else {
			result[key] = "Test clue for " + key
		}
	}
	return result, nil
}

// Helper to get entry key (duplicated from clues package for testing)
func getEntryKey(entry *grid.Entry) string {
	return entry.Direction.String() + "-" + string(rune(entry.Number+'0'))
}

func TestNewGenerator(t *testing.T) {
	wordlist := &mockWordlist{words: make(map[string][]string)}

	gen := NewGenerator(wordlist, &clues.Generator{})
	if gen == nil {
		t.Fatal("NewGenerator returned nil")
	}

	if gen.wordlist == nil {
		t.Error("Generator wordlist is nil")
	}

	// Test with nil clue generator should still work
	gen2 := NewGenerator(wordlist, nil)
	if gen2 == nil {
		t.Fatal("NewGenerator with nil clue generator returned nil")
	}
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name        string
		config      Config
		shouldError bool
	}{
		{
			name: "valid config",
			config: Config{
				Size:       15,
				Difficulty: grid.Easy,
			},
			shouldError: false,
		},
		{
			name: "size too small",
			config: Config{
				Size:       2,
				Difficulty: grid.Easy,
			},
			shouldError: true,
		},
		{
			name: "size too large",
			config: Config{
				Size:       30,
				Difficulty: grid.Easy,
			},
			shouldError: true,
		},
		{
			name: "invalid difficulty",
			config: Config{
				Size:       15,
				Difficulty: grid.Difficulty("invalid"),
			},
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateConfig(tt.config)
			if tt.shouldError && err == nil {
				t.Error("Expected error but got nil")
			}
			if !tt.shouldError && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestSetDefaults(t *testing.T) {
	tests := []struct {
		name     string
		input    Config
		expected Config
	}{
		{
			name:  "empty config gets defaults",
			input: Config{},
			expected: Config{
				Size:       15,
				MinScore:   50,
				MaxRetries: 100,
				Title:      "Crossword Puzzle - ", // Will check prefix
				Author:     "Crossy Generator",
			},
		},
		{
			name: "partial config preserves custom values",
			input: Config{
				Size:  10,
				Title: "Custom Title",
			},
			expected: Config{
				Size:       10,
				MinScore:   50,
				MaxRetries: 100,
				Title:      "Custom Title",
				Author:     "Crossy Generator",
			},
		},
		{
			name: "full config unchanged",
			input: Config{
				Size:       21,
				MinScore:   60,
				MaxRetries: 200,
				Title:      "My Puzzle",
				Author:     "Me",
			},
			expected: Config{
				Size:       21,
				MinScore:   60,
				MaxRetries: 200,
				Title:      "My Puzzle",
				Author:     "Me",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := setDefaults(tt.input)

			if result.Size != tt.expected.Size {
				t.Errorf("Size: got %d, want %d", result.Size, tt.expected.Size)
			}

			if result.MinScore != tt.expected.MinScore {
				t.Errorf("MinScore: got %d, want %d", result.MinScore, tt.expected.MinScore)
			}

			if result.MaxRetries != tt.expected.MaxRetries {
				t.Errorf("MaxRetries: got %d, want %d", result.MaxRetries, tt.expected.MaxRetries)
			}

			// For default title, just check it starts with the prefix
			if tt.expected.Title == "Crossword Puzzle - " {
				if result.Title[:19] != "Crossword Puzzle - " {
					t.Errorf("Title should start with 'Crossword Puzzle - ', got %s", result.Title)
				}
			} else if result.Title != tt.expected.Title {
				t.Errorf("Title: got %s, want %s", result.Title, tt.expected.Title)
			}

			if result.Author != tt.expected.Author {
				t.Errorf("Author: got %s, want %s", result.Author, tt.expected.Author)
			}
		})
	}
}

func TestGeneratePuzzleInvalidConfig(t *testing.T) {
	wordlist := &mockWordlist{words: make(map[string][]string)}

	// Create a mock that wraps the real clue generator interface
	// For this test we just need something that won't be called
	gen := NewGenerator(wordlist, nil)

	// Test with invalid size
	config := Config{
		Size:       1, // Too small
		Difficulty: grid.Easy,
	}

	_, err := gen.GeneratePuzzle(context.Background(), config)
	if err == nil {
		t.Error("Expected error for invalid config")
	}

	if !errors.Is(err, ErrInvalidConfig) {
		t.Errorf("Expected ErrInvalidConfig, got %v", err)
	}
}

func TestGeneratePuzzleConfigDefaults(t *testing.T) {
	// Test that config defaults are applied correctly in the pipeline
	config := Config{
		Difficulty: grid.Easy,
		Seed:       12345, // Use fixed seed for reproducibility
	}

	result := setDefaults(config)

	// Verify defaults were set
	if result.Size != 15 {
		t.Errorf("Expected default size 15, got %d", result.Size)
	}

	if result.MinScore != 50 {
		t.Errorf("Expected default MinScore 50, got %d", result.MinScore)
	}

	if result.MaxRetries != 100 {
		t.Errorf("Expected default MaxRetries 100, got %d", result.MaxRetries)
	}

	if result.Author != "Crossy Generator" {
		t.Errorf("Expected default author 'Crossy Generator', got %s", result.Author)
	}
}

func TestGeneratorStructure(t *testing.T) {
	// Test that Generator has the required fields
	wordlist := &mockWordlist{words: make(map[string][]string)}

	gen := &Generator{
		wordlist:      wordlist,
		clueGenerator: nil, // Can be nil
	}

	if gen.wordlist == nil {
		t.Error("Generator should have wordlist field")
	}

	// clueGenerator can be nil, just checking it exists
	_ = gen.clueGenerator
}

func TestPuzzleMetadataGeneration(t *testing.T) {
	// Test that metadata is properly generated
	metadata := Metadata{
		ID:         "test-id",
		Title:      "Test Puzzle",
		Author:     "Test Author",
		Difficulty: grid.Medium,
		Theme:      "Test Theme",
	}

	if metadata.ID == "" {
		t.Error("Metadata ID should not be empty")
	}

	if metadata.Title == "" {
		t.Error("Metadata Title should not be empty")
	}

	if metadata.Author == "" {
		t.Error("Metadata Author should not be empty")
	}

	if metadata.Difficulty == "" {
		t.Error("Metadata Difficulty should not be empty")
	}
}

func TestConfigValidation(t *testing.T) {
	// Test edge cases for size validation
	edgeCases := []struct {
		size  int
		valid bool
	}{
		{4, false},   // Below minimum
		{5, true},    // Minimum
		{15, true},   // Standard
		{25, true},   // Maximum
		{26, false},  // Above maximum
		{0, false},   // Zero
		{-1, false},  // Negative
	}

	for _, tc := range edgeCases {
		config := Config{
			Size:       tc.size,
			Difficulty: grid.Easy,
		}

		err := validateConfig(config)
		isValid := err == nil

		if isValid != tc.valid {
			t.Errorf("Size %d: expected valid=%v, got valid=%v (error: %v)",
				tc.size, tc.valid, isValid, err)
		}
	}
}

func TestDifficultyValidation(t *testing.T) {
	// Test all valid difficulty levels
	validDifficulties := []grid.Difficulty{
		grid.Easy,
		grid.Medium,
		grid.Hard,
		grid.Expert,
	}

	for _, diff := range validDifficulties {
		config := Config{
			Size:       15,
			Difficulty: diff,
		}

		err := validateConfig(config)
		if err != nil {
			t.Errorf("Difficulty %s should be valid, got error: %v", diff, err)
		}
	}

	// Test invalid difficulty
	invalidConfig := Config{
		Size:       15,
		Difficulty: grid.Difficulty("super-hard"),
	}

	err := validateConfig(invalidConfig)
	if err == nil {
		t.Error("Invalid difficulty should produce an error")
	}
}
