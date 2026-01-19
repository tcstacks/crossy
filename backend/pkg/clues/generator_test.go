package clues

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/crossplay/backend/pkg/grid"
	_ "github.com/mattn/go-sqlite3"
)

// mockLLMClient is a mock implementation of the LLMClient interface for testing
type mockLLMClient struct {
	response string
	err      error
	callCount int
}

func (m *mockLLMClient) Complete(ctx context.Context, prompt string) (string, error) {
	m.callCount++
	if m.err != nil {
		return "", m.err
	}
	return m.response, nil
}

// Helper function to create a test entry with filled cells
func createTestEntry(number int, direction grid.Direction, word string) *grid.Entry {
	cells := make([]*grid.Cell, len(word))
	for i, letter := range word {
		cells[i] = &grid.Cell{
			Row:     0,
			Col:     i,
			IsBlack: false,
			Letter:  letter,
			Number:  0,
		}
	}

	return &grid.Entry{
		Number:    number,
		Direction: direction,
		StartRow:  0,
		StartCol:  0,
		Length:    len(word),
		Cells:     cells,
	}
}

func TestNewGenerator(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, _ := NewClueCache(db)
	mockClient := &mockLLMClient{}

	gen := NewGenerator(cache, mockClient, DifficultyMedium)

	if gen == nil {
		t.Fatal("Expected non-nil generator")
	}

	if gen.cache != cache {
		t.Error("Cache not set correctly")
	}

	if gen.llmClient != mockClient {
		t.Error("LLM client not set correctly")
	}

	if gen.difficulty != DifficultyMedium {
		t.Errorf("Difficulty not set correctly, got %s", gen.difficulty)
	}
}

func TestGenerateClues_EmptyEntries(t *testing.T) {
	gen := NewGenerator(nil, nil, DifficultyEasy)

	result, err := gen.GenerateClues(context.Background(), []*grid.Entry{})

	if err != nil {
		t.Errorf("Expected no error for empty entries, got: %v", err)
	}

	if len(result) != 0 {
		t.Errorf("Expected empty result, got %d entries", len(result))
	}
}

func TestGenerateClues_AllFromCache(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, _ := NewClueCache(db)

	// Pre-populate cache
	cache.SaveClue("CAT", "Feline pet", "easy")
	cache.SaveClue("DOG", "Man's best friend", "easy")

	mockClient := &mockLLMClient{}
	gen := NewGenerator(cache, mockClient, DifficultyEasy)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
		createTestEntry(2, grid.DOWN, "DOG"),
	}

	result, err := gen.GenerateClues(context.Background(), entries)

	if err != nil {
		t.Fatalf("GenerateClues failed: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("Expected 2 clues, got %d", len(result))
	}

	if result["1-across"] != "Feline pet" {
		t.Errorf("Expected 'Feline pet' for 1-across, got: %s", result["1-across"])
	}

	if result["2-down"] != "Man's best friend" {
		t.Errorf("Expected 'Man's best friend' for 2-down, got: %s", result["2-down"])
	}

	// LLM should not have been called
	if mockClient.callCount != 0 {
		t.Errorf("Expected 0 LLM calls, got %d", mockClient.callCount)
	}
}

func TestGenerateClues_CacheMissWithLLM(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, _ := NewClueCache(db)

	// Mock LLM response
	mockClient := &mockLLMClient{
		response: `{"clues": {"CAT": "Purring companion", "DOG": "Loyal animal"}}`,
	}
	gen := NewGenerator(cache, mockClient, DifficultyMedium)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
		createTestEntry(2, grid.DOWN, "DOG"),
	}

	result, err := gen.GenerateClues(context.Background(), entries)

	if err != nil {
		t.Fatalf("GenerateClues failed: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("Expected 2 clues, got %d", len(result))
	}

	if result["1-across"] != "Purring companion" {
		t.Errorf("Expected 'Purring companion' for 1-across, got: %s", result["1-across"])
	}

	if result["2-down"] != "Loyal animal" {
		t.Errorf("Expected 'Loyal animal' for 2-down, got: %s", result["2-down"])
	}

	// LLM should have been called once
	if mockClient.callCount != 1 {
		t.Errorf("Expected 1 LLM call, got %d", mockClient.callCount)
	}

	// Verify clues were saved to cache
	cachedCat, found := cache.GetClue("CAT", "medium")
	if !found {
		t.Error("Expected CAT to be cached")
	}
	if cachedCat != "Purring companion" {
		t.Errorf("Expected cached clue 'Purring companion', got: %s", cachedCat)
	}

	cachedDog, found := cache.GetClue("DOG", "medium")
	if !found {
		t.Error("Expected DOG to be cached")
	}
	if cachedDog != "Loyal animal" {
		t.Errorf("Expected cached clue 'Loyal animal', got: %s", cachedDog)
	}
}

func TestGenerateClues_MixedCacheAndLLM(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cache, _ := NewClueCache(db)

	// Pre-populate cache with one word
	cache.SaveClue("CAT", "Feline pet", "hard")

	// Mock LLM response for the other word
	mockClient := &mockLLMClient{
		response: `{"clues": {"DOG": "Canine companion"}}`,
	}
	gen := NewGenerator(cache, mockClient, DifficultyHard)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
		createTestEntry(2, grid.DOWN, "DOG"),
	}

	result, err := gen.GenerateClues(context.Background(), entries)

	if err != nil {
		t.Fatalf("GenerateClues failed: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("Expected 2 clues, got %d", len(result))
	}

	if result["1-across"] != "Feline pet" {
		t.Errorf("Expected 'Feline pet' for 1-across (from cache), got: %s", result["1-across"])
	}

	if result["2-down"] != "Canine companion" {
		t.Errorf("Expected 'Canine companion' for 2-down (from LLM), got: %s", result["2-down"])
	}

	// LLM should have been called once for the cache miss
	if mockClient.callCount != 1 {
		t.Errorf("Expected 1 LLM call, got %d", mockClient.callCount)
	}
}

func TestGenerateClues_Batching(t *testing.T) {
	mockClient := &mockLLMClient{
		response: `{"clues": {
			"WORD1": "Clue 1", "WORD2": "Clue 2", "WORD3": "Clue 3",
			"WORD4": "Clue 4", "WORD5": "Clue 5", "WORD6": "Clue 6",
			"WORD7": "Clue 7", "WORD8": "Clue 8", "WORD9": "Clue 9",
			"WORD10": "Clue 10", "WORD11": "Clue 11", "WORD12": "Clue 12",
			"WORD13": "Clue 13", "WORD14": "Clue 14", "WORD15": "Clue 15",
			"WORD16": "Clue 16", "WORD17": "Clue 17", "WORD18": "Clue 18",
			"WORD19": "Clue 19", "WORD20": "Clue 20", "WORD21": "Clue 21",
			"WORD22": "Clue 22"
		}}`,
	}
	gen := NewGenerator(nil, mockClient, DifficultyMedium)

	// Create 22 entries (should require 2 batches with max 20 per batch)
	entries := make([]*grid.Entry, 22)
	for i := 0; i < 22; i++ {
		entries[i] = createTestEntry(i+1, grid.ACROSS, fmt.Sprintf("WORD%d", i+1))
	}

	result, err := gen.GenerateClues(context.Background(), entries)

	if err != nil {
		t.Fatalf("GenerateClues failed: %v", err)
	}

	if len(result) != 22 {
		t.Errorf("Expected 22 clues, got %d", len(result))
	}

	// Should have made 2 LLM calls (batches of 20 and 2)
	if mockClient.callCount != 2 {
		t.Errorf("Expected 2 LLM calls for batching, got %d", mockClient.callCount)
	}
}

func TestGenerateClues_NoCacheNoLLM(t *testing.T) {
	gen := NewGenerator(nil, nil, DifficultyEasy)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
	}

	_, err := gen.GenerateClues(context.Background(), entries)

	if err == nil {
		t.Error("Expected error when no cache and no LLM available")
	}
}

func TestGenerateClues_LLMError(t *testing.T) {
	mockClient := &mockLLMClient{
		err: errors.New("LLM API error"),
	}
	gen := NewGenerator(nil, mockClient, DifficultyEasy)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
	}

	_, err := gen.GenerateClues(context.Background(), entries)

	if err == nil {
		t.Error("Expected error when LLM fails")
	}
}

func TestGenerateClues_DuplicateWords(t *testing.T) {
	mockClient := &mockLLMClient{
		response: `{"clues": {"CAT": "Feline pet"}}`,
	}
	gen := NewGenerator(nil, mockClient, DifficultyEasy)

	// Multiple entries with the same word
	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
		createTestEntry(2, grid.DOWN, "CAT"),
		createTestEntry(3, grid.ACROSS, "CAT"),
	}

	result, err := gen.GenerateClues(context.Background(), entries)

	if err != nil {
		t.Fatalf("GenerateClues failed: %v", err)
	}

	if len(result) != 3 {
		t.Errorf("Expected 3 clues, got %d", len(result))
	}

	// All should have the same clue
	if result["1-across"] != "Feline pet" {
		t.Errorf("Expected 'Feline pet' for 1-across, got: %s", result["1-across"])
	}
	if result["2-down"] != "Feline pet" {
		t.Errorf("Expected 'Feline pet' for 2-down, got: %s", result["2-down"])
	}
	if result["3-across"] != "Feline pet" {
		t.Errorf("Expected 'Feline pet' for 3-across, got: %s", result["3-across"])
	}

	// LLM should have been called only once despite 3 entries with same word
	if mockClient.callCount != 1 {
		t.Errorf("Expected 1 LLM call for duplicate words, got %d", mockClient.callCount)
	}
}

func TestGenerateClues_UnfilledEntry(t *testing.T) {
	// Create an entry with unfilled cells (Letter = 0)
	cells := []*grid.Cell{
		{Row: 0, Col: 0, Letter: 0},
		{Row: 0, Col: 1, Letter: 0},
		{Row: 0, Col: 2, Letter: 0},
	}
	unfilledEntry := &grid.Entry{
		Number:    1,
		Direction: grid.ACROSS,
		Cells:     cells,
	}

	gen := NewGenerator(nil, nil, DifficultyEasy)

	result, err := gen.GenerateClues(context.Background(), []*grid.Entry{unfilledEntry})

	// Should return empty result, not error
	if err != nil {
		t.Errorf("Expected no error for unfilled entry, got: %v", err)
	}

	if len(result) != 0 {
		t.Errorf("Expected empty result for unfilled entry, got %d clues", len(result))
	}
}

func TestExtractWord(t *testing.T) {
	tests := []struct {
		name     string
		entry    *grid.Entry
		expected string
	}{
		{
			name:     "Simple word",
			entry:    createTestEntry(1, grid.ACROSS, "CAT"),
			expected: "CAT",
		},
		{
			name:     "Longer word",
			entry:    createTestEntry(1, grid.ACROSS, "HELLO"),
			expected: "HELLO",
		},
		{
			name: "Unfilled entry",
			entry: &grid.Entry{
				Cells: []*grid.Cell{
					{Letter: 0},
					{Letter: 0},
				},
			},
			expected: "",
		},
		{
			name: "Partially filled",
			entry: &grid.Entry{
				Cells: []*grid.Cell{
					{Letter: 'C'},
					{Letter: 0},
					{Letter: 'T'},
				},
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractWord(tt.entry)
			if result != tt.expected {
				t.Errorf("extractWord() = %q, expected %q", result, tt.expected)
			}
		})
	}
}

func TestGetEntryKey(t *testing.T) {
	tests := []struct {
		name     string
		entry    *grid.Entry
		expected string
	}{
		{
			name: "Across entry",
			entry: &grid.Entry{
				Number:    1,
				Direction: grid.ACROSS,
			},
			expected: "1-across",
		},
		{
			name: "Down entry",
			entry: &grid.Entry{
				Number:    15,
				Direction: grid.DOWN,
			},
			expected: "15-down",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getEntryKey(tt.entry)
			if result != tt.expected {
				t.Errorf("getEntryKey() = %q, expected %q", result, tt.expected)
			}
		})
	}
}

func TestGenerateWithLLM_ParseError(t *testing.T) {
	mockClient := &mockLLMClient{
		response: `invalid json`,
	}
	gen := NewGenerator(nil, mockClient, DifficultyEasy)

	entries := []*grid.Entry{
		createTestEntry(1, grid.ACROSS, "CAT"),
	}

	_, err := gen.GenerateClues(context.Background(), entries)

	if err == nil {
		t.Error("Expected error for invalid JSON response")
	}
}
