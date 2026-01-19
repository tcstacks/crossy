package clues

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Difficulty represents the difficulty level for clue generation
type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

const (
	// MaxWordsPerBatch is the maximum number of words to include in a single prompt
	MaxWordsPerBatch = 20
)

// ClueResponse represents the expected JSON response format from the LLM
type ClueResponse struct {
	Clues map[string]string `json:"clues"`
}

// buildPrompt constructs an LLM prompt for generating crossword clues
// It accepts a batch of words (up to MaxWordsPerBatch) and a difficulty level
func buildPrompt(words []string, difficulty Difficulty) (string, error) {
	if len(words) == 0 {
		return "", fmt.Errorf("words slice cannot be empty")
	}

	if len(words) > MaxWordsPerBatch {
		return "", fmt.Errorf("too many words: %d (max %d)", len(words), MaxWordsPerBatch)
	}

	// Validate difficulty
	if difficulty != DifficultyEasy && difficulty != DifficultyMedium && difficulty != DifficultyHard {
		return "", fmt.Errorf("invalid difficulty: %s (must be easy, medium, or hard)", difficulty)
	}

	guidelines := getDifficultyGuidelines(difficulty)

	wordList := strings.Join(words, ", ")

	// Create example JSON structure
	exampleJSON := map[string]interface{}{
		"clues": map[string]string{
			words[0]: "Example clue for " + words[0],
		},
	}
	exampleBytes, _ := json.MarshalIndent(exampleJSON, "", "  ")

	prompt := fmt.Sprintf(`You are a crossword puzzle clue writer. Generate crossword clues for the following words.

Difficulty: %s
%s

Words: %s

Requirements:
- Generate exactly one clue for each word
- Clues should be cryptic, clever, and appropriate for the difficulty level
- Keep clues concise (typically 3-10 words)
- Avoid using the answer word or obvious derivatives in the clue
- Use wordplay, misdirection, and cultural references appropriately

Respond with a JSON object in the following format:
%s

Return ONLY the JSON object with all clues filled in. Do not include any explanatory text before or after the JSON.`,
		difficulty,
		guidelines,
		wordList,
		string(exampleBytes))

	return prompt, nil
}

// getDifficultyGuidelines returns specific guidelines for each difficulty level
func getDifficultyGuidelines(difficulty Difficulty) string {
	switch difficulty {
	case DifficultyEasy:
		return `Guidelines for EASY clues:
- Use straightforward definitions
- Avoid obscure references
- Keep wordplay simple and accessible
- Focus on common knowledge and everyday vocabulary
- Example: "Feline pet" for CAT`

	case DifficultyMedium:
		return `Guidelines for MEDIUM clues:
- Use moderate wordplay and misdirection
- Include some cultural references (books, movies, common knowledge)
- Mix definitions with clever hints
- Can use simple cryptic techniques
- Example: "Purring companion" for CAT`

	case DifficultyHard:
		return `Guidelines for HARD clues:
- Use advanced wordplay and cryptic techniques
- Include obscure references and specialized knowledge
- Employ misdirection and double meanings
- Can use anagrams, hidden words, and complex constructions
- Example: "Tomcat's kin scattered? Absurd!" for CAT (anagram of "cat's")`

	default:
		return ""
	}
}

// ParseClueResponse parses the LLM JSON response into a map of word to clue
// It validates that all requested words have corresponding clues in the response
func ParseClueResponse(responseText string, requestedWords []string) (map[string]string, error) {
	// Clean up the response - sometimes LLMs include markdown code blocks
	responseText = strings.TrimSpace(responseText)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)

	var response ClueResponse
	if err := json.Unmarshal([]byte(responseText), &response); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	if response.Clues == nil || len(response.Clues) == 0 {
		return nil, fmt.Errorf("response contains no clues")
	}

	// Validate that all requested words have clues
	if len(requestedWords) > 0 {
		var missingWords []string
		for _, word := range requestedWords {
			if _, ok := response.Clues[word]; !ok {
				missingWords = append(missingWords, word)
			}
		}
		if len(missingWords) > 0 {
			return nil, fmt.Errorf("missing clues for words: %s", strings.Join(missingWords, ", "))
		}
	}

	return response.Clues, nil
}
