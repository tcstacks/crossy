package clues

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBuildPrompt(t *testing.T) {
	tests := []struct {
		name         string
		words        []string
		difficulty   Difficulty
		wantErr      bool
		wantContains []string
	}{
		{
			name:       "valid easy difficulty single word",
			words:      []string{"CAT"},
			difficulty: DifficultyEasy,
			wantErr:    false,
			wantContains: []string{
				"CAT",
				"easy",
				"straightforward definitions",
				"JSON",
				"clues",
			},
		},
		{
			name:       "valid medium difficulty multiple words",
			words:      []string{"DOG", "HOUSE", "TREE"},
			difficulty: DifficultyMedium,
			wantErr:    false,
			wantContains: []string{
				"DOG",
				"HOUSE",
				"TREE",
				"medium",
				"moderate wordplay",
			},
		},
		{
			name:       "valid hard difficulty max batch size",
			words:      []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"},
			difficulty: DifficultyHard,
			wantErr:    false,
			wantContains: []string{
				"hard",
				"advanced wordplay",
				"cryptic techniques",
			},
		},
		{
			name:       "empty words slice",
			words:      []string{},
			difficulty: DifficultyEasy,
			wantErr:    true,
		},
		{
			name:       "too many words",
			words:      make([]string, MaxWordsPerBatch+1),
			difficulty: DifficultyEasy,
			wantErr:    true,
		},
		{
			name:       "invalid difficulty",
			words:      []string{"CAT"},
			difficulty: Difficulty("invalid"),
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prompt, err := buildPrompt(tt.words, tt.difficulty)

			if (err != nil) != tt.wantErr {
				t.Errorf("buildPrompt() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				return
			}

			// Check that prompt contains expected strings
			for _, want := range tt.wantContains {
				if !strings.Contains(prompt, want) {
					t.Errorf("buildPrompt() prompt missing expected string: %q", want)
				}
			}

			// Verify prompt structure
			if !strings.Contains(prompt, "JSON") {
				t.Error("buildPrompt() prompt should mention JSON format")
			}

			if !strings.Contains(prompt, "clues") {
				t.Error("buildPrompt() prompt should mention clues")
			}
		})
	}
}

func TestBuildPrompt_BatchSize(t *testing.T) {
	// Test exactly at the max batch size
	words := make([]string, MaxWordsPerBatch)
	for i := 0; i < MaxWordsPerBatch; i++ {
		words[i] = string(rune('A' + i))
	}

	prompt, err := buildPrompt(words, DifficultyEasy)
	if err != nil {
		t.Errorf("buildPrompt() with max batch size should not error, got: %v", err)
	}

	if prompt == "" {
		t.Error("buildPrompt() returned empty prompt")
	}

	// Verify all words are in the prompt
	for _, word := range words {
		if !strings.Contains(prompt, word) {
			t.Errorf("buildPrompt() missing word %q in prompt", word)
		}
	}
}

func TestGetDifficultyGuidelines(t *testing.T) {
	tests := []struct {
		name         string
		difficulty   Difficulty
		wantContains []string
	}{
		{
			name:       "easy guidelines",
			difficulty: DifficultyEasy,
			wantContains: []string{
				"straightforward",
				"simple",
				"common knowledge",
			},
		},
		{
			name:       "medium guidelines",
			difficulty: DifficultyMedium,
			wantContains: []string{
				"moderate",
				"wordplay",
				"cultural references",
			},
		},
		{
			name:       "hard guidelines",
			difficulty: DifficultyHard,
			wantContains: []string{
				"advanced",
				"cryptic",
				"anagrams",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			guidelines := getDifficultyGuidelines(tt.difficulty)

			if guidelines == "" {
				t.Error("getDifficultyGuidelines() returned empty string")
			}

			for _, want := range tt.wantContains {
				if !strings.Contains(strings.ToLower(guidelines), strings.ToLower(want)) {
					t.Errorf("getDifficultyGuidelines() missing expected string: %q", want)
				}
			}
		})
	}
}

func TestParseClueResponse(t *testing.T) {
	tests := []struct {
		name           string
		responseText   string
		requestedWords []string
		wantClues      map[string]string
		wantErr        bool
	}{
		{
			name: "valid JSON response",
			responseText: `{
				"clues": {
					"CAT": "Feline pet",
					"DOG": "Canine companion"
				}
			}`,
			requestedWords: []string{"CAT", "DOG"},
			wantClues: map[string]string{
				"CAT": "Feline pet",
				"DOG": "Canine companion",
			},
			wantErr: false,
		},
		{
			name: "valid JSON with markdown code blocks",
			responseText: "```json\n" + `{
				"clues": {
					"HOUSE": "Place to live"
				}
			}` + "\n```",
			requestedWords: []string{"HOUSE"},
			wantClues: map[string]string{
				"HOUSE": "Place to live",
			},
			wantErr: false,
		},
		{
			name: "valid JSON with extra whitespace",
			responseText: "\n\n  " + `{
				"clues": {
					"TREE": "Wooden giant"
				}
			}` + "  \n\n",
			requestedWords: []string{"TREE"},
			wantClues: map[string]string{
				"TREE": "Wooden giant",
			},
			wantErr: false,
		},
		{
			name:           "invalid JSON",
			responseText:   `{"clues": {invalid json}}`,
			requestedWords: []string{},
			wantErr:        true,
		},
		{
			name:           "empty response",
			responseText:   "",
			requestedWords: []string{},
			wantErr:        true,
		},
		{
			name:           "no clues field",
			responseText:   `{"other": "field"}`,
			requestedWords: []string{},
			wantErr:        true,
		},
		{
			name:           "empty clues object",
			responseText:   `{"clues": {}}`,
			requestedWords: []string{},
			wantErr:        true,
		},
		{
			name: "single clue",
			responseText: `{
				"clues": {
					"WORD": "A clue"
				}
			}`,
			requestedWords: []string{"WORD"},
			wantClues: map[string]string{
				"WORD": "A clue",
			},
			wantErr: false,
		},
		{
			name: "missing requested word",
			responseText: `{
				"clues": {
					"CAT": "Feline pet"
				}
			}`,
			requestedWords: []string{"CAT", "DOG"},
			wantErr:        true,
		},
		{
			name: "missing multiple requested words",
			responseText: `{
				"clues": {
					"CAT": "Feline pet"
				}
			}`,
			requestedWords: []string{"CAT", "DOG", "BIRD"},
			wantErr:        true,
		},
		{
			name: "response with extra words not requested",
			responseText: `{
				"clues": {
					"CAT": "Feline pet",
					"DOG": "Canine companion",
					"BIRD": "Flying creature"
				}
			}`,
			requestedWords: []string{"CAT", "DOG"},
			wantClues: map[string]string{
				"CAT":  "Feline pet",
				"DOG":  "Canine companion",
				"BIRD": "Flying creature",
			},
			wantErr: false,
		},
		{
			name: "no requested words validation",
			responseText: `{
				"clues": {
					"TEST": "A test"
				}
			}`,
			requestedWords: []string{},
			wantClues: map[string]string{
				"TEST": "A test",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clues, err := ParseClueResponse(tt.responseText, tt.requestedWords)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseClueResponse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				return
			}

			if len(clues) != len(tt.wantClues) {
				t.Errorf("ParseClueResponse() got %d clues, want %d", len(clues), len(tt.wantClues))
			}

			for word, expectedClue := range tt.wantClues {
				gotClue, ok := clues[word]
				if !ok {
					t.Errorf("ParseClueResponse() missing clue for word %q", word)
					continue
				}
				if gotClue != expectedClue {
					t.Errorf("ParseClueResponse() clue for %q = %q, want %q", word, gotClue, expectedClue)
				}
			}
		})
	}
}

func TestParseClueResponse_MarkdownVariations(t *testing.T) {
	baseJSON := `{
		"clues": {
			"TEST": "A test clue"
		}
	}`

	variations := []string{
		baseJSON,
		"```json\n" + baseJSON + "\n```",
		"```\n" + baseJSON + "\n```",
		"  \n\n" + baseJSON + "\n\n  ",
		"```json\n  " + baseJSON + "  \n```",
	}

	requestedWords := []string{"TEST"}

	for i, variation := range variations {
		t.Run(string(rune('A'+i)), func(t *testing.T) {
			clues, err := ParseClueResponse(variation, requestedWords)
			if err != nil {
				t.Errorf("ParseClueResponse() variation %d error = %v", i, err)
				return
			}

			if len(clues) != 1 {
				t.Errorf("ParseClueResponse() variation %d got %d clues, want 1", i, len(clues))
			}

			if clue, ok := clues["TEST"]; !ok || clue != "A test clue" {
				t.Errorf("ParseClueResponse() variation %d got unexpected clues: %v", i, clues)
			}
		})
	}
}

func TestDifficultyConstants(t *testing.T) {
	difficulties := []Difficulty{DifficultyEasy, DifficultyMedium, DifficultyHard}

	// Ensure all difficulties are unique
	seen := make(map[Difficulty]bool)
	for _, d := range difficulties {
		if seen[d] {
			t.Errorf("Duplicate difficulty constant: %s", d)
		}
		seen[d] = true

		if d == "" {
			t.Error("Difficulty constant should not be empty")
		}
	}
}

func TestMaxWordsPerBatch(t *testing.T) {
	if MaxWordsPerBatch != 20 {
		t.Errorf("MaxWordsPerBatch = %d, want 20", MaxWordsPerBatch)
	}
}

func TestClueResponse_JSONSerialization(t *testing.T) {
	response := ClueResponse{
		Clues: map[string]string{
			"WORD1": "Clue 1",
			"WORD2": "Clue 2",
		},
	}

	// Test marshaling
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal ClueResponse: %v", err)
	}

	// Test unmarshaling
	var decoded ClueResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal ClueResponse: %v", err)
	}

	if len(decoded.Clues) != len(response.Clues) {
		t.Errorf("Unmarshaled ClueResponse has %d clues, want %d", len(decoded.Clues), len(response.Clues))
	}

	for word, clue := range response.Clues {
		if decoded.Clues[word] != clue {
			t.Errorf("Unmarshaled clue for %q = %q, want %q", word, decoded.Clues[word], clue)
		}
	}
}

func TestBuildPrompt_JSONExample(t *testing.T) {
	words := []string{"EXAMPLE", "TEST"}
	prompt, err := buildPrompt(words, DifficultyEasy)
	if err != nil {
		t.Fatalf("buildPrompt() failed: %v", err)
	}

	// Verify the prompt includes a valid JSON example
	if !strings.Contains(prompt, `"clues"`) {
		t.Error("buildPrompt() should include JSON example with 'clues' field")
	}

	// Verify the example uses one of the actual words
	if !strings.Contains(prompt, "EXAMPLE") {
		t.Error("buildPrompt() should include EXAMPLE in the prompt")
	}
}

func TestBuildPrompt_Requirements(t *testing.T) {
	words := []string{"TEST"}
	prompt, err := buildPrompt(words, DifficultyMedium)
	if err != nil {
		t.Fatalf("buildPrompt() failed: %v", err)
	}

	requiredPhrases := []string{
		"Requirements",
		"JSON",
		"clue",
		"Return ONLY the JSON",
	}

	for _, phrase := range requiredPhrases {
		if !strings.Contains(prompt, phrase) {
			t.Errorf("buildPrompt() missing required phrase: %q", phrase)
		}
	}
}

func TestParseClueResponse_WordValidation(t *testing.T) {
	tests := []struct {
		name           string
		responseText   string
		requestedWords []string
		wantErr        bool
		errContains    string
	}{
		{
			name: "all requested words present",
			responseText: `{
				"clues": {
					"APPLE": "A fruit",
					"BANANA": "Yellow fruit",
					"CHERRY": "Red fruit"
				}
			}`,
			requestedWords: []string{"APPLE", "BANANA", "CHERRY"},
			wantErr:        false,
		},
		{
			name: "one missing word",
			responseText: `{
				"clues": {
					"APPLE": "A fruit",
					"BANANA": "Yellow fruit"
				}
			}`,
			requestedWords: []string{"APPLE", "BANANA", "CHERRY"},
			wantErr:        true,
			errContains:    "CHERRY",
		},
		{
			name: "multiple missing words",
			responseText: `{
				"clues": {
					"APPLE": "A fruit"
				}
			}`,
			requestedWords: []string{"APPLE", "BANANA", "CHERRY", "DATE"},
			wantErr:        true,
			errContains:    "missing clues for words",
		},
		{
			name: "all words missing",
			responseText: `{
				"clues": {
					"WRONG": "Not requested"
				}
			}`,
			requestedWords: []string{"APPLE", "BANANA"},
			wantErr:        true,
			errContains:    "APPLE",
		},
		{
			name: "empty requested words list",
			responseText: `{
				"clues": {
					"APPLE": "A fruit"
				}
			}`,
			requestedWords: []string{},
			wantErr:        false,
		},
		{
			name: "nil requested words list",
			responseText: `{
				"clues": {
					"APPLE": "A fruit"
				}
			}`,
			requestedWords: nil,
			wantErr:        false,
		},
		{
			name: "response has more words than requested",
			responseText: `{
				"clues": {
					"APPLE": "A fruit",
					"BANANA": "Yellow fruit",
					"CHERRY": "Red fruit",
					"DATE": "Sweet fruit",
					"ELDERBERRY": "Dark fruit"
				}
			}`,
			requestedWords: []string{"APPLE", "BANANA"},
			wantErr:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clues, err := ParseClueResponse(tt.responseText, tt.requestedWords)

			if (err != nil) != tt.wantErr {
				t.Errorf("ParseClueResponse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if err == nil || !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("ParseClueResponse() error should contain %q, got %v", tt.errContains, err)
				}
			}

			if !tt.wantErr {
				// Verify all requested words are in the result
				for _, word := range tt.requestedWords {
					if _, ok := clues[word]; !ok {
						t.Errorf("ParseClueResponse() missing clue for requested word %q", word)
					}
				}
			}
		})
	}
}
