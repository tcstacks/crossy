package puzzle

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// ClueGenerator generates crossword clues using AI with difficulty calibration
type ClueGenerator struct {
	llmClient *LLMClient
	wordList  *WordListService
}

// ClueStyle represents different clue writing styles
type ClueStyle string

const (
	ClueStyleDefinite    ClueStyle = "definite"    // "The capital of France"
	ClueStyleCopular     ClueStyle = "copular"     // "It's found in kitchens"
	ClueStyleBareNoun    ClueStyle = "bare_noun"   // "Kitchen appliance"
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
	// Use the new LLM client with environment configuration
	config := DefaultLLMConfig()
	// If apiKey is provided explicitly, use it (for backward compatibility)
	if apiKey != "" && config.APIKey == "" {
		config.APIKey = apiKey
	}
	return &ClueGenerator{
		llmClient: NewLLMClient(config),
		wordList:  wordList,
	}
}

// NewClueGeneratorWithClient creates a clue generator with a specific LLM client
func NewClueGeneratorWithClient(client *LLMClient, wordList *WordListService) *ClueGenerator {
	return &ClueGenerator{
		llmClient: client,
		wordList:  wordList,
	}
}

// GenerateClues generates multiple candidate clues for an answer
func (cg *ClueGenerator) GenerateClues(req *ClueRequest) ([]GeneratedClue, error) {
	if req.NumCandidates <= 0 {
		req.NumCandidates = 3
	}

	prompt := cg.buildCluePrompt(req)

	response, err := cg.callAPI(prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call API: %w", err)
	}

	clues, err := cg.parseClueResponse(response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Score and sort clues
	for i := range clues {
		clues[i].Score = cg.scoreClue(clues[i], req)
	}

	sort.Slice(clues, func(i, j int) bool {
		return clues[i].Score > clues[j].Score
	})

	return clues, nil
}

func (cg *ClueGenerator) buildCluePrompt(req *ClueRequest) string {
	difficultyDesc := cg.getDifficultyDescription(req.Difficulty)
	styleGuidance := cg.getStyleGuidance(req.Style)
	themeContext := ""
	if req.Theme != "" {
		themeContext = fmt.Sprintf("\nTheme context: The puzzle has a theme of \"%s\". If possible, subtly connect the clue to this theme.", req.Theme)
	}

	crossingContext := ""
	if len(req.CrossingClues) > 0 {
		crossingContext = fmt.Sprintf("\nCrossing clues context: %s", strings.Join(req.CrossingClues, "; "))
	}

	examples := cg.getExamplesForDifficulty(req.Difficulty, req.Answer)

	return fmt.Sprintf(`You are an expert crossword constructor creating clues for a %s-level difficulty puzzle.

ANSWER: %s

DIFFICULTY REQUIREMENTS:
%s

STYLE GUIDANCE:
%s
%s%s

STRICT RULES:
1. NEVER include the answer word or any part of it (including prefixes/suffixes) in the clue
2. Keep clues under 10 words when possible
3. Maintain grammatical agreement (plural answers need plural clues)
4. Match parts of speech appropriately
5. For abbreviations in answers, signal with "Abbr." or use an abbreviation in the clue
6. Question marks indicate wordplay or misdirection

%s

Generate exactly %d different clues for "%s". Return ONLY a JSON array:
[
  {"text": "clue text here", "style": "definite|copular|bare_noun|unconstrained", "difficulty": 0.0-1.0},
  ...
]`,
		req.Difficulty,
		strings.ToUpper(req.Answer),
		difficultyDesc,
		styleGuidance,
		themeContext,
		crossingContext,
		examples,
		req.NumCandidates,
		strings.ToUpper(req.Answer))
}

func (cg *ClueGenerator) getDifficultyDescription(day DayDifficulty) string {
	descriptions := map[DayDifficulty]string{
		DayMonday: `MONDAY (Easiest):
- Use straightforward definitions
- Common vocabulary only
- No wordplay or misdirection
- Clear, direct connections
- Example: For APPLE - "Fruit that fell on Newton's head"`,

		DayTuesday: `TUESDAY (Easy):
- Mostly direct definitions
- Common knowledge references
- Simple wordplay acceptable
- Example: For PIANO - "Keys found in a music room"`,

		DayWednesday: `WEDNESDAY (Medium):
- Mix of definitions and light wordplay
- Some trivia and pop culture
- Modest misdirection allowed
- Example: For STREAM - "Netflix or a brook"`,

		DayThursday: `THURSDAY (Medium-Hard):
- Wordplay, puns, and misdirection welcome
- May include theme tricks
- Cultural references expected
- Example: For OREO - "Twist-and-lick treat"`,

		DayFriday: `FRIDAY (Hard):
- Maximum misdirection
- Obscure vocabulary acceptable
- Multi-layer wordplay
- Less common cultural references
- Example: For OREO - "It has 12 flowers on each side"`,

		DaySaturday: `SATURDAY (Hardest):
- Cryptic-style clues acceptable
- Obscure references
- Complex wordplay and double meanings
- Requires specialized knowledge
- Example: For OREO - "Hydrox competitor since 1912"`,

		DaySunday: `SUNDAY (Medium, larger grid):
- Similar to Wednesday/Thursday difficulty
- Theme-focused when applicable
- Broader range of topics
- Example: For OREO - "Cookie that's often dunked"`,
	}

	if desc, ok := descriptions[day]; ok {
		return desc
	}
	return descriptions[DayWednesday]
}

func (cg *ClueGenerator) getStyleGuidance(style ClueStyle) string {
	switch style {
	case ClueStyleDefinite:
		return "Use definite determiner phrases starting with 'The' - e.g., 'The capital of France'"
	case ClueStyleCopular:
		return "Use copular sentences with 'It's' or similar - e.g., 'It's found in kitchens'"
	case ClueStyleBareNoun:
		return "Use bare noun phrases without articles - e.g., 'Kitchen appliance'"
	default:
		return "Use any appropriate clue style. Vary between definite phrases, copular sentences, and bare nouns."
	}
}

func (cg *ClueGenerator) getExamplesForDifficulty(day DayDifficulty, answer string) string {
	// Provide contextual examples based on the answer's characteristics
	answerLen := len(answer)

	var examples strings.Builder
	examples.WriteString("EXAMPLES:\n")

	if answerLen <= 4 {
		examples.WriteString("Short word clues should be especially precise:\n")
		switch day {
		case DayMonday, DayTuesday:
			examples.WriteString("- ACE: \"Perfect serve in tennis\"\n")
			examples.WriteString("- CAT: \"Pet that purrs\"\n")
		case DayWednesday, DayThursday:
			examples.WriteString("- ACE: \"Card up one's sleeve, maybe\"\n")
			examples.WriteString("- CAT: \"Curiosity's victim, proverbially\"\n")
		case DayFriday, DaySaturday:
			examples.WriteString("- ACE: \"Blackjack's best or worst card\"\n")
			examples.WriteString("- CAT: \"Cheshire grin wearer\"\n")
		}
	} else if answerLen >= 7 {
		examples.WriteString("Longer word clues can be more elaborate:\n")
		switch day {
		case DayMonday, DayTuesday:
			examples.WriteString("- ELEPHANT: \"Largest land mammal\"\n")
			examples.WriteString("- COMPUTER: \"Desktop or laptop device\"\n")
		case DayWednesday, DayThursday:
			examples.WriteString("- ELEPHANT: \"It never forgets, they say\"\n")
			examples.WriteString("- COMPUTER: \"Mouse's partner\"\n")
		case DayFriday, DaySaturday:
			examples.WriteString("- ELEPHANT: \"Dumbo, for one\"\n")
			examples.WriteString("- COMPUTER: \"Pascal or Babbage creation\"\n")
		}
	}

	return examples.String()
}

func (cg *ClueGenerator) callAPI(prompt string) (string, error) {
	return cg.llmClient.Complete(prompt)
}

func (cg *ClueGenerator) parseClueResponse(response string) ([]GeneratedClue, error) {
	// Clean up response using utility function
	response = CleanJSONResponse(response)

	var clues []GeneratedClue
	if err := json.Unmarshal([]byte(response), &clues); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return clues, nil
}

func (cg *ClueGenerator) scoreClue(clue GeneratedClue, req *ClueRequest) float64 {
	score := 0.5 // Base score

	// Penalize if answer appears in clue
	if strings.Contains(strings.ToUpper(clue.Text), strings.ToUpper(req.Answer)) {
		return 0.0 // Immediate disqualification
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

	// Check for proper punctuation
	if strings.HasSuffix(clue.Text, "?") {
		// Question marks are good for wordplay difficulties
		if req.Difficulty == DayThursday || req.Difficulty == DayFriday || req.Difficulty == DaySaturday {
			score += 0.1
		}
	}

	// Penalize quotes (usually indicates a fill-in-the-blank which can be lazy)
	if strings.Contains(clue.Text, "\"") || strings.Contains(clue.Text, "'") {
		score -= 0.05
	}

	// Difficulty alignment
	difficultyTarget := cg.getDifficultyTarget(req.Difficulty)
	difficultyDiff := abs(clue.Difficulty - difficultyTarget)
	score -= difficultyDiff * 0.2

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

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// GenerateBatchClues generates clues for multiple answers efficiently
func (cg *ClueGenerator) GenerateBatchClues(answers []string, difficulty DayDifficulty, theme string) (map[string][]GeneratedClue, error) {
	results := make(map[string][]GeneratedClue)

	// Generate clues in batches to reduce API calls
	batchSize := 5
	for i := 0; i < len(answers); i += batchSize {
		end := i + batchSize
		if end > len(answers) {
			end = len(answers)
		}
		batch := answers[i:end]

		batchResults, err := cg.generateBatch(batch, difficulty, theme)
		if err != nil {
			// Fall back to individual generation
			for _, answer := range batch {
				clues, err := cg.GenerateClues(&ClueRequest{
					Answer:        answer,
					Difficulty:    difficulty,
					Theme:         theme,
					NumCandidates: 3,
				})
				if err != nil {
					continue
				}
				results[answer] = clues
			}
		} else {
			for k, v := range batchResults {
				results[k] = v
			}
		}
	}

	return results, nil
}

func (cg *ClueGenerator) generateBatch(answers []string, difficulty DayDifficulty, theme string) (map[string][]GeneratedClue, error) {
	difficultyDesc := cg.getDifficultyDescription(difficulty)
	themeContext := ""
	if theme != "" {
		themeContext = fmt.Sprintf("\nTheme: %s", theme)
	}

	answersStr := strings.Join(answers, ", ")

	prompt := fmt.Sprintf(`You are an expert crossword constructor. Generate 3 candidate clues for EACH of the following answers.

DIFFICULTY: %s
%s
%s

ANSWERS: %s

STRICT RULES:
1. NEVER include the answer or any part of it in the clue
2. Keep clues under 10 words
3. Match grammatical number and tense
4. Question marks indicate wordplay

Return a JSON object with answers as keys:
{
  "ANSWER1": [{"text": "clue", "style": "style", "difficulty": 0.0-1.0}, ...],
  "ANSWER2": [{"text": "clue", "style": "style", "difficulty": 0.0-1.0}, ...],
  ...
}`,
		difficulty,
		difficultyDesc,
		themeContext,
		answersStr)

	response, err := cg.callAPI(prompt)
	if err != nil {
		return nil, err
	}

	// Parse response using utility function
	response = CleanJSONResponse(response)

	var results map[string][]GeneratedClue
	if err := json.Unmarshal([]byte(response), &results); err != nil {
		return nil, fmt.Errorf("failed to parse batch response: %w", err)
	}

	return results, nil
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
