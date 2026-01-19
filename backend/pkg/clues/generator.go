package clues

import (
	"context"
	"fmt"
	"strings"

	"github.com/crossplay/backend/pkg/clues/providers"
	"github.com/crossplay/backend/pkg/grid"
)

// Generator orchestrates clue generation with caching
type Generator struct {
	cache      *ClueCache
	llmClient  providers.LLMClient
	difficulty Difficulty
}

// NewGenerator creates a new clue generator
func NewGenerator(cache *ClueCache, llmClient providers.LLMClient, difficulty Difficulty) *Generator {
	return &Generator{
		cache:      cache,
		llmClient:  llmClient,
		difficulty: difficulty,
	}
}

// GenerateClues generates clues for all entries in the grid
// It checks the cache first, batches cache misses, calls the LLM, and saves new clues
// Returns a map of entry key (e.g., "1-across", "2-down") to clue text
func (g *Generator) GenerateClues(ctx context.Context, entries []*grid.Entry) (map[string]string, error) {
	if len(entries) == 0 {
		return map[string]string{}, nil
	}

	result := make(map[string]string)
	var wordsNeedingClues []string
	wordToEntryKeys := make(map[string][]string) // maps word to list of entry keys

	// Step 1: Check cache for all entries
	for _, entry := range entries {
		word := extractWord(entry)
		if word == "" {
			continue
		}

		entryKey := getEntryKey(entry)

		// Check cache
		if g.cache != nil {
			clue, found := g.cache.GetClue(word, string(g.difficulty))
			if found {
				result[entryKey] = clue
				continue
			}
		}

		// Track words that need LLM generation
		if _, exists := wordToEntryKeys[word]; !exists {
			wordsNeedingClues = append(wordsNeedingClues, word)
		}
		wordToEntryKeys[word] = append(wordToEntryKeys[word], entryKey)
	}

	// Step 2: If all clues were found in cache, return early
	if len(wordsNeedingClues) == 0 {
		return result, nil
	}

	// Step 3: If no LLM client, return error for cache misses
	if g.llmClient == nil {
		return nil, fmt.Errorf("no LLM client available and %d words not in cache", len(wordsNeedingClues))
	}

	// Step 4: Batch words and call LLM
	newClues, err := g.generateWithLLM(ctx, wordsNeedingClues)
	if err != nil {
		return nil, fmt.Errorf("failed to generate clues with LLM: %w", err)
	}

	// Step 5: Save new clues to cache and populate result
	for word, clue := range newClues {
		// Save to cache
		if g.cache != nil {
			if err := g.cache.SaveClue(word, clue, string(g.difficulty)); err != nil {
				// Log error but continue - cache save failure shouldn't stop generation
				// In production, you'd use a proper logger here
				_ = err
			}
		}

		// Populate result for all entry keys that use this word
		for _, entryKey := range wordToEntryKeys[word] {
			result[entryKey] = clue
		}
	}

	return result, nil
}

// generateWithLLM batches words and generates clues using the LLM client
func (g *Generator) generateWithLLM(ctx context.Context, words []string) (map[string]string, error) {
	allClues := make(map[string]string)

	// Process words in batches
	for i := 0; i < len(words); i += MaxWordsPerBatch {
		end := i + MaxWordsPerBatch
		if end > len(words) {
			end = len(words)
		}
		batch := words[i:end]

		// Build prompt for this batch
		prompt, err := buildPrompt(batch, g.difficulty)
		if err != nil {
			return nil, fmt.Errorf("failed to build prompt: %w", err)
		}

		// Call LLM
		response, err := g.llmClient.Complete(ctx, prompt)
		if err != nil {
			return nil, fmt.Errorf("LLM completion failed: %w", err)
		}

		// Parse response
		batchClues, err := ParseClueResponse(response, batch)
		if err != nil {
			return nil, fmt.Errorf("failed to parse LLM response: %w", err)
		}

		// Merge into result
		for word, clue := range batchClues {
			allClues[word] = clue
		}
	}

	return allClues, nil
}

// extractWord extracts the word from an entry's cells
func extractWord(entry *grid.Entry) string {
	var letters []rune
	for _, cell := range entry.Cells {
		if cell.Letter == 0 {
			return "" // Entry not filled
		}
		letters = append(letters, cell.Letter)
	}
	return strings.ToUpper(string(letters))
}

// getEntryKey generates a unique key for an entry (e.g., "1-across", "2-down")
func getEntryKey(entry *grid.Entry) string {
	return fmt.Sprintf("%d-%s", entry.Number, entry.Direction.String())
}
