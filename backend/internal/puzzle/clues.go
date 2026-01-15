package puzzle

import (
	"fmt"
	"sort"
	"strings"
	"sync"
)

// ClueGenerator generates crossword clues using dictionary definitions
type ClueGenerator struct {
	wordList *WordListService
}

// ClueStyle represents different clue writing styles
type ClueStyle string

const (
	ClueStyleDefinition    ClueStyle = "definition"    // Dictionary definition
	ClueStyleSynonym       ClueStyle = "synonym"       // Synonym-based clue
	ClueStyleFillInBlank   ClueStyle = "fill_in_blank" // Fill in the blank
	ClueStyleUnconstrained ClueStyle = "unconstrained" // Any style
)

// DayDifficulty represents the day-based difficulty calibration
type DayDifficulty string

const (
	DayMonday    DayDifficulty = "monday"    // Easiest - direct definitions
	DayTuesday   DayDifficulty = "tuesday"   // Easy - direct definitions
	DayWednesday DayDifficulty = "wednesday" // Medium - some wordplay
	DayThursday  DayDifficulty = "thursday"  // Medium-Hard - tricks, rebuses
	DayFriday    DayDifficulty = "friday"    // Hard - misdirection
	DaySaturday  DayDifficulty = "saturday"  // Hardest - cryptic, obscure
	DaySunday    DayDifficulty = "sunday"    // Medium with large grid
)

// ClueRequest contains parameters for clue generation
type ClueRequest struct {
	Answer        string        // The word to create a clue for
	Difficulty    DayDifficulty // Day-based difficulty
	Theme         string        // Optional theme context
	Style         ClueStyle     // Preferred clue style
	NumCandidates int           // Number of candidate clues to generate
	CrossingClues []string      // Context from crossing clues
}

// GeneratedClue represents a generated clue with metadata
type GeneratedClue struct {
	Text       string    `json:"text"`
	Style      ClueStyle `json:"style"`
	Difficulty float64   `json:"difficulty"` // 0.0 (easy) to 1.0 (hard)
	Score      float64   `json:"score"`      // Quality score
}

// NewClueGenerator creates a new clue generator
func NewClueGenerator(apiKey string, wordList *WordListService) *ClueGenerator {
	// apiKey is kept for backward compatibility but no longer used
	return &ClueGenerator{
		wordList: wordList,
	}
}

// NewClueGeneratorWithWordList creates a clue generator with just a word list
func NewClueGeneratorWithWordList(wordList *WordListService) *ClueGenerator {
	return &ClueGenerator{
		wordList: wordList,
	}
}

// GenerateClues generates multiple candidate clues for an answer using dictionary definitions
func (cg *ClueGenerator) GenerateClues(req *ClueRequest) ([]GeneratedClue, error) {
	if req.NumCandidates <= 0 {
		req.NumCandidates = 3
	}

	var clues []GeneratedClue

	// Try to get dictionary definition
	if cg.wordList != nil {
		def, err := cg.wordList.GetDefinition(req.Answer)
		if err == nil && def != "" {
			clue := cg.createClueFromDefinition(req.Answer, def)
			if clue != nil {
				clues = append(clues, *clue)
			}
		}

		// Try to get synonyms for alternative clues
		synonyms, err := cg.wordList.FindSynonyms(req.Answer, 5)
		if err == nil && len(synonyms) > 0 {
			for _, syn := range synonyms {
				if strings.ToUpper(syn) != strings.ToUpper(req.Answer) {
					clue := cg.createSynonymClue(req.Answer, syn)
					if clue != nil {
						clues = append(clues, *clue)
					}
				}
			}
		}
	}

	// Add generic fallback if we don't have enough clues
	if len(clues) < req.NumCandidates {
		fallback := cg.createFallbackClue(req.Answer)
		clues = append(clues, fallback)
	}

	// Score and sort clues
	for i := range clues {
		clues[i].Score = cg.scoreClue(clues[i], req)
	}

	sort.Slice(clues, func(i, j int) bool {
		return clues[i].Score > clues[j].Score
	})

	// Limit to requested number
	if len(clues) > req.NumCandidates {
		clues = clues[:req.NumCandidates]
	}

	return clues, nil
}

// createClueFromDefinition creates a clue from a dictionary definition
func (cg *ClueGenerator) createClueFromDefinition(answer, definition string) *GeneratedClue {
	// Clean up the definition
	def := strings.TrimSpace(definition)

	// Remove part of speech prefix if present (e.g., "(n) " or "noun: ")
	if idx := strings.Index(def, ") "); idx > 0 && idx < 10 {
		def = strings.TrimSpace(def[idx+2:])
	}
	if idx := strings.Index(def, ": "); idx > 0 && idx < 15 {
		def = strings.TrimSpace(def[idx+2:])
	}

	// Make sure the answer doesn't appear in the definition
	if strings.Contains(strings.ToUpper(def), strings.ToUpper(answer)) {
		return nil
	}

	// Truncate if too long
	if len(def) > 80 {
		// Try to truncate at a word boundary
		truncated := def[:80]
		if lastSpace := strings.LastIndex(truncated, " "); lastSpace > 40 {
			def = truncated[:lastSpace]
		} else {
			def = truncated
		}
	}

	// Capitalize first letter
	if len(def) > 0 {
		def = strings.ToUpper(def[:1]) + def[1:]
	}

	return &GeneratedClue{
		Text:       def,
		Style:      ClueStyleDefinition,
		Difficulty: 0.3,
	}
}

// createSynonymClue creates a clue based on a synonym
func (cg *ClueGenerator) createSynonymClue(answer, synonym string) *GeneratedClue {
	// Clean up the synonym
	syn := strings.TrimSpace(synonym)

	// Skip if synonym contains the answer
	if strings.Contains(strings.ToUpper(syn), strings.ToUpper(answer)) {
		return nil
	}

	// Skip multi-word synonyms for simple clues
	if strings.Contains(syn, " ") {
		return nil
	}

	// Capitalize
	syn = strings.ToUpper(syn[:1]) + strings.ToLower(syn[1:])

	return &GeneratedClue{
		Text:       syn,
		Style:      ClueStyleSynonym,
		Difficulty: 0.2,
	}
}

// createFallbackClue creates a generic fallback clue
func (cg *ClueGenerator) createFallbackClue(answer string) GeneratedClue {
	length := len(answer)
	return GeneratedClue{
		Text:       fmt.Sprintf("%d-letter word", length),
		Style:      "placeholder",
		Difficulty: 0.1,
	}
}

func (cg *ClueGenerator) scoreClue(clue GeneratedClue, req *ClueRequest) float64 {
	score := 0.5 // Base score

	// Penalize if answer appears in clue
	if strings.Contains(strings.ToUpper(clue.Text), strings.ToUpper(req.Answer)) {
		return 0.0 // Immediate disqualification
	}

	// Prefer definition clues
	if clue.Style == ClueStyleDefinition {
		score += 0.2
	} else if clue.Style == ClueStyleSynonym {
		score += 0.1
	}

	// Check length - prefer concise clues
	wordCount := len(strings.Fields(clue.Text))
	if wordCount <= 5 {
		score += 0.1
	} else if wordCount <= 8 {
		score += 0.05
	} else if wordCount > 12 {
		score -= 0.1
	}

	// Penalize placeholder clues
	if clue.Style == "placeholder" {
		score -= 0.3
	}

	// Normalize score
	if score < 0 {
		score = 0
	}
	if score > 1 {
		score = 1
	}

	return score
}

func (cg *ClueGenerator) getDifficultyTarget(day DayDifficulty) float64 {
	targets := map[DayDifficulty]float64{
		DayMonday:    0.1,
		DayTuesday:   0.2,
		DayWednesday: 0.4,
		DayThursday:  0.6,
		DayFriday:    0.8,
		DaySaturday:  0.9,
		DaySunday:    0.5,
	}
	if target, ok := targets[day]; ok {
		return target
	}
	return 0.5
}

// GenerateBatchClues generates clues for multiple answers efficiently
func (cg *ClueGenerator) GenerateBatchClues(answers []string, difficulty DayDifficulty, theme string) (map[string][]GeneratedClue, error) {
	results := make(map[string][]GeneratedClue)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Process answers concurrently for faster generation
	semaphore := make(chan struct{}, 10) // Limit concurrent API calls

	for _, answer := range answers {
		wg.Add(1)
		go func(ans string) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire
			defer func() { <-semaphore }() // Release

			clues, err := cg.GenerateClues(&ClueRequest{
				Answer:        ans,
				Difficulty:    difficulty,
				Theme:         theme,
				NumCandidates: 3,
			})

			mu.Lock()
			if err == nil && len(clues) > 0 {
				results[ans] = clues
			} else {
				// Use fallback
				results[ans] = []GeneratedClue{cg.createFallbackClue(ans)}
			}
			mu.Unlock()
		}(answer)
	}

	wg.Wait()

	// Post-process: filter invalid clues
	for answer, clues := range results {
		validClues := cg.filterValidClues(clues, answer)
		if len(validClues) == 0 {
			validClues = []GeneratedClue{cg.createFallbackClue(answer)}
		}
		results[answer] = validClues
	}

	return results, nil
}

// filterValidClues removes clues that contain the answer
func (cg *ClueGenerator) filterValidClues(clues []GeneratedClue, answer string) []GeneratedClue {
	answerUpper := strings.ToUpper(answer)
	var valid []GeneratedClue
	for _, clue := range clues {
		clueUpper := strings.ToUpper(clue.Text)
		if !strings.Contains(clueUpper, answerUpper) {
			valid = append(valid, clue)
		}
	}
	return valid
}

// ValidateClue checks if a clue is valid for the given answer
func (cg *ClueGenerator) ValidateClue(clue string, answer string) []string {
	var issues []string
	answer = strings.ToUpper(answer)
	clueUpper := strings.ToUpper(clue)

	// Check if answer appears in clue
	if strings.Contains(clueUpper, answer) {
		issues = append(issues, fmt.Sprintf("answer '%s' appears in clue", answer))
	}

	// Check for partial matches (answer substrings)
	if len(answer) >= 4 {
		for i := 0; i <= len(answer)-4; i++ {
			substr := answer[i : i+4]
			if strings.Contains(clueUpper, substr) {
				issues = append(issues, fmt.Sprintf("answer substring '%s' appears in clue", substr))
				break
			}
		}
	}

	// Check clue length
	if len(clue) < 5 {
		issues = append(issues, "clue is too short")
	}
	if len(clue) > 100 {
		issues = append(issues, "clue is too long")
	}

	// Check for empty or whitespace-only
	if strings.TrimSpace(clue) == "" {
		issues = append(issues, "clue is empty")
	}

	return issues
}

// SelectBestClue picks the best clue from candidates
func (cg *ClueGenerator) SelectBestClue(candidates []GeneratedClue, answer string) *GeneratedClue {
	if len(candidates) == 0 {
		return nil
	}

	// Filter out invalid clues
	var valid []GeneratedClue
	for _, c := range candidates {
		issues := cg.ValidateClue(c.Text, answer)
		if len(issues) == 0 {
			valid = append(valid, c)
		}
	}

	if len(valid) == 0 {
		// Return best invalid clue with a warning
		return &candidates[0]
	}

	// Sort by score and return best
	sort.Slice(valid, func(i, j int) bool {
		return valid[i].Score > valid[j].Score
	})

	return &valid[0]
}
