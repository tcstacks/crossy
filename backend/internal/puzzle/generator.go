package puzzle

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/crossplay/backend/internal/models"
	"github.com/google/uuid"
)

// Generator handles puzzle generation using AI
type Generator struct {
	apiKey     string
	apiURL     string
	httpClient *http.Client
}

// NewGenerator creates a new puzzle generator
func NewGenerator(apiKey string) *Generator {
	return &Generator{
		apiKey:     apiKey,
		apiURL:     "https://api.anthropic.com/v1/messages",
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

// GenerationRequest contains parameters for puzzle generation
type GenerationRequest struct {
	Difficulty models.Difficulty `json:"difficulty"`
	GridWidth  int               `json:"gridWidth"`
	GridHeight int               `json:"gridHeight"`
	Theme      string            `json:"theme,omitempty"`
	DayOfWeek  string            `json:"dayOfWeek,omitempty"`
}

// GeneratedPuzzle represents the AI-generated puzzle before validation
type GeneratedPuzzle struct {
	Title       string      `json:"title"`
	Grid        [][]string  `json:"grid"` // "." for black squares, letters otherwise
	CluesAcross []ClueData  `json:"cluesAcross"`
	CluesDown   []ClueData  `json:"cluesDown"`
	Theme       string      `json:"theme,omitempty"`
}

type ClueData struct {
	Number int    `json:"number"`
	Clue   string `json:"clue"`
	Answer string `json:"answer"`
}

// Generate creates a new puzzle using AI
func (g *Generator) Generate(req *GenerationRequest) (*models.Puzzle, error) {
	prompt := g.buildPrompt(req)

	// Call Claude API
	response, err := g.callClaudeAPI(prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call Claude API: %w", err)
	}

	// Parse the response
	generated, err := g.parseResponse(response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Convert to puzzle model
	puzzle, err := g.convertToPuzzle(generated, req)
	if err != nil {
		return nil, fmt.Errorf("failed to convert to puzzle: %w", err)
	}

	return puzzle, nil
}

func (g *Generator) buildPrompt(req *GenerationRequest) string {
	difficultyDesc := map[models.Difficulty]string{
		models.DifficultyEasy:   "straightforward definitions, common vocabulary, no wordplay",
		models.DifficultyMedium: "mix of definitions and light wordplay, some trivia",
		models.DifficultyHard:   "challenging wordplay, misdirection, less common vocabulary",
	}

	themeInstr := ""
	if req.Theme != "" {
		themeInstr = fmt.Sprintf("The puzzle should have a theme: %s. Include themed answers that relate to this topic.", req.Theme)
	}

	return fmt.Sprintf(`Generate a crossword puzzle with the following specifications:

Grid Size: %dx%d
Difficulty: %s (%s)
%s

Requirements:
1. The grid must have rotational symmetry (180-degree)
2. No 2-letter words allowed
3. All letters must be part of both an across and down word (fully crossed)
4. Use standard American crossword conventions
5. Clues should be fair and solvable
6. No offensive or exclusionary content
7. Mix of clue types: definitions, wordplay, trivia, pop culture

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Puzzle Title",
  "grid": [
    ["A", "B", "C", ".", "D"],
    ...
  ],
  "cluesAcross": [
    {"number": 1, "clue": "Clue text", "answer": "ANSWER"},
    ...
  ],
  "cluesDown": [
    {"number": 1, "clue": "Clue text", "answer": "ANSWER"},
    ...
  ],
  "theme": "Theme description if applicable"
}

Use "." for black squares. Answers must match the grid exactly.
Ensure the puzzle is complete, valid, and solvable.`,
		req.GridWidth, req.GridHeight, req.Difficulty, difficultyDesc[req.Difficulty], themeInstr)
}

type claudeRequest struct {
	Model     string           `json:"model"`
	MaxTokens int              `json:"max_tokens"`
	Messages  []claudeMessage  `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func (g *Generator) callClaudeAPI(prompt string) (string, error) {
	reqBody := claudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 4096,
		Messages: []claudeMessage{
			{Role: "user", Content: prompt},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", g.apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", g.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s", string(body))
	}

	var claudeResp claudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return "", err
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("empty response from API")
	}

	return claudeResp.Content[0].Text, nil
}

func (g *Generator) parseResponse(response string) (*GeneratedPuzzle, error) {
	// Extract JSON from response (handle potential markdown formatting)
	response = strings.TrimSpace(response)
	if strings.HasPrefix(response, "```json") {
		response = strings.TrimPrefix(response, "```json")
		response = strings.TrimSuffix(response, "```")
	} else if strings.HasPrefix(response, "```") {
		response = strings.TrimPrefix(response, "```")
		response = strings.TrimSuffix(response, "```")
	}
	response = strings.TrimSpace(response)

	var generated GeneratedPuzzle
	if err := json.Unmarshal([]byte(response), &generated); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return &generated, nil
}

func (g *Generator) convertToPuzzle(generated *GeneratedPuzzle, req *GenerationRequest) (*models.Puzzle, error) {
	gridHeight := len(generated.Grid)
	if gridHeight == 0 {
		return nil, fmt.Errorf("empty grid")
	}
	gridWidth := len(generated.Grid[0])

	// Convert grid
	grid := make([][]models.GridCell, gridHeight)
	for y := 0; y < gridHeight; y++ {
		grid[y] = make([]models.GridCell, gridWidth)
		for x := 0; x < len(generated.Grid[y]); x++ {
			cell := generated.Grid[y][x]
			if cell == "." {
				grid[y][x] = models.GridCell{Letter: nil}
			} else {
				letter := strings.ToUpper(cell)
				grid[y][x] = models.GridCell{Letter: &letter}
			}
		}
	}

	// Number the cells and build clues
	clueNumber := 1
	numberMap := make(map[string]int) // "y,x" -> number

	for y := 0; y < gridHeight; y++ {
		for x := 0; x < gridWidth; x++ {
			if grid[y][x].Letter == nil {
				continue
			}

			startsAcross := x == 0 || grid[y][x-1].Letter == nil
			startsDown := y == 0 || grid[y-1][x].Letter == nil

			// Check if there's a word in that direction
			if startsAcross {
				hasWord := x+1 < gridWidth && grid[y][x+1].Letter != nil
				if !hasWord {
					startsAcross = false
				}
			}
			if startsDown {
				hasWord := y+1 < gridHeight && grid[y+1][x].Letter != nil
				if !hasWord {
					startsDown = false
				}
			}

			if startsAcross || startsDown {
				num := clueNumber
				grid[y][x].Number = &num
				numberMap[fmt.Sprintf("%d,%d", y, x)] = clueNumber
				clueNumber++
			}
		}
	}

	// Build clues with positions
	cluesAcross := make([]models.Clue, 0, len(generated.CluesAcross))
	for _, c := range generated.CluesAcross {
		pos := findCluePosition(grid, c.Number, "across")
		if pos != nil {
			cluesAcross = append(cluesAcross, models.Clue{
				Number:    c.Number,
				Text:      c.Clue,
				Answer:    strings.ToUpper(c.Answer),
				PositionX: pos[1],
				PositionY: pos[0],
				Length:    len(c.Answer),
				Direction: "across",
			})
		}
	}

	cluesDown := make([]models.Clue, 0, len(generated.CluesDown))
	for _, c := range generated.CluesDown {
		pos := findCluePosition(grid, c.Number, "down")
		if pos != nil {
			cluesDown = append(cluesDown, models.Clue{
				Number:    c.Number,
				Text:      c.Clue,
				Answer:    strings.ToUpper(c.Answer),
				PositionX: pos[1],
				PositionY: pos[0],
				Length:    len(c.Answer),
				Direction: "down",
			})
		}
	}

	theme := generated.Theme
	if theme == "" && req.Theme != "" {
		theme = req.Theme
	}

	puzzle := &models.Puzzle{
		ID:          uuid.New().String(),
		Title:       generated.Title,
		Author:      "CrossPlay AI",
		Difficulty:  req.Difficulty,
		GridWidth:   gridWidth,
		GridHeight:  gridHeight,
		Grid:        grid,
		CluesAcross: cluesAcross,
		CluesDown:   cluesDown,
		Theme:       &theme,
		Status:      "draft",
		CreatedAt:   time.Now(),
	}

	return puzzle, nil
}

func findCluePosition(grid [][]models.GridCell, number int, direction string) []int {
	for y := 0; y < len(grid); y++ {
		for x := 0; x < len(grid[y]); x++ {
			if grid[y][x].Number != nil && *grid[y][x].Number == number {
				return []int{y, x}
			}
		}
	}
	return nil
}

// Validator validates puzzle correctness
type Validator struct{}

// NewValidator creates a new puzzle validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidationResult contains validation results
type ValidationResult struct {
	Valid   bool     `json:"valid"`
	Errors  []string `json:"errors"`
	Warnings []string `json:"warnings"`
}

// Validate checks a puzzle for correctness
func (v *Validator) Validate(puzzle *models.Puzzle) *ValidationResult {
	result := &ValidationResult{Valid: true}

	// Check grid dimensions
	if puzzle.GridHeight == 0 || puzzle.GridWidth == 0 {
		result.Errors = append(result.Errors, "grid has zero dimensions")
		result.Valid = false
	}

	// Check rotational symmetry
	if !v.checkSymmetry(puzzle) {
		result.Errors = append(result.Errors, "grid lacks rotational symmetry")
		result.Valid = false
	}

	// Check for 2-letter words
	shortWords := v.findShortWords(puzzle)
	if len(shortWords) > 0 {
		result.Errors = append(result.Errors, fmt.Sprintf("found 2-letter words: %v", shortWords))
		result.Valid = false
	}

	// Check all letters are crossed
	uncrossed := v.findUncrossedLetters(puzzle)
	if len(uncrossed) > 0 {
		result.Errors = append(result.Errors, fmt.Sprintf("found uncrossed letters at: %v", uncrossed))
		result.Valid = false
	}

	// Check clue-answer consistency
	v.validateClues(puzzle, result)

	return result
}

func (v *Validator) checkSymmetry(puzzle *models.Puzzle) bool {
	h := puzzle.GridHeight
	w := puzzle.GridWidth

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			isBlack := puzzle.Grid[y][x].Letter == nil
			mirrorY := h - 1 - y
			mirrorX := w - 1 - x
			isMirrorBlack := puzzle.Grid[mirrorY][mirrorX].Letter == nil

			if isBlack != isMirrorBlack {
				return false
			}
		}
	}

	return true
}

func (v *Validator) findShortWords(puzzle *models.Puzzle) []string {
	var shortWords []string

	// Check across words
	for y := 0; y < puzzle.GridHeight; y++ {
		wordLen := 0
		startX := 0
		for x := 0; x <= puzzle.GridWidth; x++ {
			if x < puzzle.GridWidth && puzzle.Grid[y][x].Letter != nil {
				if wordLen == 0 {
					startX = x
				}
				wordLen++
			} else {
				if wordLen == 2 {
					shortWords = append(shortWords, fmt.Sprintf("across at (%d,%d)", startX, y))
				}
				wordLen = 0
			}
		}
	}

	// Check down words
	for x := 0; x < puzzle.GridWidth; x++ {
		wordLen := 0
		startY := 0
		for y := 0; y <= puzzle.GridHeight; y++ {
			if y < puzzle.GridHeight && puzzle.Grid[y][x].Letter != nil {
				if wordLen == 0 {
					startY = y
				}
				wordLen++
			} else {
				if wordLen == 2 {
					shortWords = append(shortWords, fmt.Sprintf("down at (%d,%d)", x, startY))
				}
				wordLen = 0
			}
		}
	}

	return shortWords
}

func (v *Validator) findUncrossedLetters(puzzle *models.Puzzle) []string {
	var uncrossed []string

	for y := 0; y < puzzle.GridHeight; y++ {
		for x := 0; x < puzzle.GridWidth; x++ {
			if puzzle.Grid[y][x].Letter == nil {
				continue
			}

			hasAcross := false
			hasDown := false

			// Check across
			if (x > 0 && puzzle.Grid[y][x-1].Letter != nil) ||
				(x < puzzle.GridWidth-1 && puzzle.Grid[y][x+1].Letter != nil) {
				hasAcross = true
			}

			// Check down
			if (y > 0 && puzzle.Grid[y-1][x].Letter != nil) ||
				(y < puzzle.GridHeight-1 && puzzle.Grid[y+1][x].Letter != nil) {
				hasDown = true
			}

			if !hasAcross || !hasDown {
				uncrossed = append(uncrossed, fmt.Sprintf("(%d,%d)", x, y))
			}
		}
	}

	return uncrossed
}

func (v *Validator) validateClues(puzzle *models.Puzzle, result *ValidationResult) {
	// Check across clues
	for _, clue := range puzzle.CluesAcross {
		word := v.extractWord(puzzle, clue.PositionX, clue.PositionY, "across")
		if word != clue.Answer {
			result.Errors = append(result.Errors,
				fmt.Sprintf("across clue %d: answer '%s' doesn't match grid '%s'", clue.Number, clue.Answer, word))
			result.Valid = false
		}
	}

	// Check down clues
	for _, clue := range puzzle.CluesDown {
		word := v.extractWord(puzzle, clue.PositionX, clue.PositionY, "down")
		if word != clue.Answer {
			result.Errors = append(result.Errors,
				fmt.Sprintf("down clue %d: answer '%s' doesn't match grid '%s'", clue.Number, clue.Answer, word))
			result.Valid = false
		}
	}
}

func (v *Validator) extractWord(puzzle *models.Puzzle, startX, startY int, direction string) string {
	var letters []string

	x, y := startX, startY
	for {
		if y >= puzzle.GridHeight || x >= puzzle.GridWidth {
			break
		}
		if puzzle.Grid[y][x].Letter == nil {
			break
		}
		letters = append(letters, *puzzle.Grid[y][x].Letter)

		if direction == "across" {
			x++
		} else {
			y++
		}
	}

	return strings.Join(letters, "")
}

// SamplePuzzle creates a sample puzzle for testing
func SamplePuzzle() *models.Puzzle {
	// Simple 5x5 puzzle
	grid := [][]models.GridCell{
		{cell("H"), cell("E"), cell("L"), cell("L"), cell("O")},
		{cell("A"), black(), black(), cell("A"), cell("N")},
		{cell("T"), cell("O"), cell("P"), cell("S"), cell("E")},
		{cell("E"), cell("N"), black(), black(), cell("W")},
		{cell("S"), cell("E"), cell("W"), cell("E"), cell("D")},
	}

	// Set clue numbers
	one := 1
	two := 2
	three := 3
	four := 4
	five := 5
	six := 6
	seven := 7

	grid[0][0].Number = &one
	grid[0][3].Number = &two
	grid[1][0].Number = &three
	grid[2][0].Number = &four
	grid[2][1].Number = &five
	grid[3][0].Number = &six
	grid[4][0].Number = &seven

	cluesAcross := []models.Clue{
		{Number: 1, Text: "Greeting", Answer: "HELLO", PositionX: 0, PositionY: 0, Length: 5, Direction: "across"},
		{Number: 4, Text: "Spinning toys", Answer: "TOPS", PositionX: 0, PositionY: 2, Length: 4, Direction: "across"},
		{Number: 7, Text: "Stitched", Answer: "SEWED", PositionX: 0, PositionY: 4, Length: 5, Direction: "across"},
	}

	cluesDown := []models.Clue{
		{Number: 1, Text: "Dislikes strongly", Answer: "HATES", PositionX: 0, PositionY: 0, Length: 5, Direction: "down"},
		{Number: 2, Text: "Lane anagram", Answer: "LANE", PositionX: 3, PositionY: 0, Length: 4, Direction: "down"},
		{Number: 3, Text: "A single time", Answer: "ONCE", PositionX: 4, PositionY: 0, Length: 4, Direction: "down"},
		{Number: 5, Text: "Antique", Answer: "OLDEN", PositionX: 1, PositionY: 2, Length: 3, Direction: "down"},
	}

	now := time.Now()
	today := now.Format("2006-01-02")
	theme := "Greetings"

	return &models.Puzzle{
		ID:          uuid.New().String(),
		Date:        &today,
		Title:       "Hello World",
		Author:      "CrossPlay Team",
		Difficulty:  models.DifficultyEasy,
		GridWidth:   5,
		GridHeight:  5,
		Grid:        grid,
		CluesAcross: cluesAcross,
		CluesDown:   cluesDown,
		Theme:       &theme,
		Status:      "published",
		CreatedAt:   now,
		PublishedAt: &now,
	}
}

func cell(letter string) models.GridCell {
	return models.GridCell{Letter: &letter}
}

func black() models.GridCell {
	return models.GridCell{Letter: nil}
}
