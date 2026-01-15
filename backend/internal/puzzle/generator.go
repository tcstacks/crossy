package puzzle

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/crossplay/backend/internal/models"
	"github.com/google/uuid"
)

// Generator handles puzzle generation using CSP algorithm and dictionary definitions
type Generator struct {
	wordList      *WordListService
	gridFiller    *GridFiller
	clueGenerator *ClueGenerator
}

// NewGenerator creates a new puzzle generator
func NewGenerator(apiKey string) *Generator {
	// apiKey is kept for backward compatibility but no longer used
	wordList := NewWordListService()
	return &Generator{
		wordList:      wordList,
		gridFiller:    NewGridFiller(wordList),
		clueGenerator: NewClueGeneratorWithWordList(wordList),
	}
}

// NewGeneratorWithWordList creates a generator with a specific word list
func NewGeneratorWithWordList(wordList *WordListService) *Generator {
	return &Generator{
		wordList:      wordList,
		gridFiller:    NewGridFiller(wordList),
		clueGenerator: NewClueGeneratorWithWordList(wordList),
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

// GeneratedPuzzle represents the generated puzzle before validation
type GeneratedPuzzle struct {
	Title       string     `json:"title"`
	Grid        [][]string `json:"grid"` // "." for black squares, letters otherwise
	CluesAcross []ClueData `json:"cluesAcross"`
	CluesDown   []ClueData `json:"cluesDown"`
	Theme       string     `json:"theme,omitempty"`
}

type ClueData struct {
	Number int    `json:"number"`
	Clue   string `json:"clue"`
	Answer string `json:"answer"`
}

// Generate creates a new puzzle using CSP algorithm
func (g *Generator) Generate(req *GenerationRequest) (*models.Puzzle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Determine black square density based on grid size
	density := 0.15
	if req.GridWidth <= 5 {
		density = 0.0 // Mini puzzles often have no black squares
	} else if req.GridWidth <= 11 {
		density = 0.14
	} else {
		density = 0.16
	}

	// Generate symmetric black squares
	blackSquares := g.gridFiller.GenerateSymmetricBlackSquares(req.GridWidth, req.GridHeight, density)

	// Create grid spec
	gridSpec := &GridSpec{
		Width:        req.GridWidth,
		Height:       req.GridHeight,
		BlackSquares: blackSquares,
		MinWordScore: 30,
	}

	// Fill the grid using CSP algorithm
	filledGrid, err := g.gridFiller.FillGrid(gridSpec)
	if err != nil {
		return nil, fmt.Errorf("failed to fill grid: %w", err)
	}

	// Check context
	select {
	case <-ctx.Done():
		return nil, fmt.Errorf("generation timed out")
	default:
	}

	// Extract answers from filled grid
	answers := make([]string, len(filledGrid.Slots))
	for i, slot := range filledGrid.Slots {
		answers[i] = slot.Word
	}

	// Map difficulty to day
	difficulty := g.difficultyToDay(req.Difficulty)

	// Generate clues for all answers
	clueMap, err := g.clueGenerator.GenerateBatchClues(answers, difficulty, req.Theme)
	if err != nil {
		return nil, fmt.Errorf("failed to generate clues: %w", err)
	}

	// Build puzzle model
	puzzle := g.buildPuzzle(filledGrid, clueMap, req)

	return puzzle, nil
}

func (g *Generator) difficultyToDay(diff models.Difficulty) DayDifficulty {
	switch diff {
	case models.DifficultyEasy:
		return DayMonday
	case models.DifficultyMedium:
		return DayWednesday
	case models.DifficultyHard:
		return DayFriday
	default:
		return DayWednesday
	}
}

func (g *Generator) buildPuzzle(grid *FilledGrid, clueMap map[string][]GeneratedClue, req *GenerationRequest) *models.Puzzle {
	// Convert grid cells
	modelGrid := make([][]models.GridCell, grid.Height)
	for y := 0; y < grid.Height; y++ {
		modelGrid[y] = make([]models.GridCell, grid.Width)
		for x := 0; x < grid.Width; x++ {
			char := grid.Cells[y][x]
			if char == 0 {
				modelGrid[y][x] = models.GridCell{Letter: nil}
			} else {
				letter := string(char)
				modelGrid[y][x] = models.GridCell{Letter: &letter}
			}
		}
	}

	// Number cells and build clues
	clueNumber := 1
	var cluesAcross []models.Clue
	var cluesDown []models.Clue

	for y := 0; y < grid.Height; y++ {
		for x := 0; x < grid.Width; x++ {
			if modelGrid[y][x].Letter == nil {
				continue
			}

			startsAcross := (x == 0 || modelGrid[y][x-1].Letter == nil) &&
				(x+1 < grid.Width && modelGrid[y][x+1].Letter != nil)
			startsDown := (y == 0 || modelGrid[y-1][x].Letter == nil) &&
				(y+1 < grid.Height && modelGrid[y+1][x].Letter != nil)

			if startsAcross || startsDown {
				num := clueNumber
				modelGrid[y][x].Number = &num

				// Find the corresponding slots and create clues
				for _, slot := range grid.Slots {
					if slot.Slot.StartPos.X == x && slot.Slot.StartPos.Y == y {
						clue := g.buildClue(slot, num, clueMap)
						if slot.Slot.Direction == "across" {
							cluesAcross = append(cluesAcross, clue)
						} else {
							cluesDown = append(cluesDown, clue)
						}
					}
				}

				clueNumber++
			}
		}
	}

	// Build title
	title := "Crossword Puzzle"
	if req.Theme != "" {
		title = req.Theme
	}

	puzzle := &models.Puzzle{
		ID:          uuid.New().String(),
		Title:       title,
		Author:      "CrossPlay",
		Difficulty:  req.Difficulty,
		GridWidth:   grid.Width,
		GridHeight:  grid.Height,
		Grid:        modelGrid,
		CluesAcross: cluesAcross,
		CluesDown:   cluesDown,
		Status:      "draft",
		CreatedAt:   time.Now(),
	}

	if req.Theme != "" {
		puzzle.Theme = &req.Theme
	}

	return puzzle
}

func (g *Generator) buildClue(slot FilledSlot, number int, clueMap map[string][]GeneratedClue) models.Clue {
	answer := slot.Word

	// Get best clue from generated candidates
	var clueText string
	if candidates, ok := clueMap[answer]; ok && len(candidates) > 0 {
		best := g.clueGenerator.SelectBestClue(candidates, answer)
		if best != nil {
			clueText = best.Text
		}
	}

	// Fallback if no clue was generated
	if clueText == "" {
		clueText = fmt.Sprintf("[%s]", answer)
	}

	return models.Clue{
		Number:    number,
		Text:      clueText,
		Answer:    strings.ToUpper(answer),
		PositionX: slot.Slot.StartPos.X,
		PositionY: slot.Slot.StartPos.Y,
		Length:    slot.Slot.Length,
		Direction: slot.Slot.Direction,
	}
}

// Validator validates puzzle correctness
type Validator struct{}

// NewValidator creates a new puzzle validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidationResult contains validation results
type ValidationResult struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors"`
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
