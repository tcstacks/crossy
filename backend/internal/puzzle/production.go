package puzzle

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/crossplay/backend/internal/models"
	"github.com/google/uuid"
)

// ProductionPipeline manages the automated puzzle generation workflow
type ProductionPipeline struct {
	wordList      *WordListService
	gridFiller    *GridFiller
	clueGenerator *ClueGenerator
	qualityScorer *QualityScorer
	apiKey        string
	config        PipelineConfig
}

// PipelineConfig configures the production pipeline
type PipelineConfig struct {
	// Generation settings
	CandidatesPerBatch  int           // Number of candidate puzzles to generate
	ClueCandidates      int           // Number of clue candidates per answer
	GenerationTimeout   time.Duration // Timeout for single puzzle generation

	// Quality thresholds
	Thresholds QualityThresholds

	// Grid specifications by size
	GridSpecs map[string]GridSizeSpec

	// Content filtering
	FilterOffensive   bool
	CustomBannedWords []string
}

// GridSizeSpec defines specifications for a grid size
type GridSizeSpec struct {
	Width          int
	Height         int
	MaxWords       int
	MaxBlackSquares int
	TargetDensity  float64
}

// BatchResult contains the results of a batch generation
type BatchResult struct {
	Generated   []*GeneratedPuzzleResult
	BestPuzzle  *GeneratedPuzzleResult
	TotalTime   time.Duration
	SuccessRate float64
	Errors      []string
}

// GeneratedPuzzleResult contains a generated puzzle with its quality report
type GeneratedPuzzleResult struct {
	Puzzle        *models.Puzzle
	QualityReport *QualityReport
	GeneratedAt   time.Time
}

// DefaultPipelineConfig returns default pipeline configuration
func DefaultPipelineConfig() PipelineConfig {
	return PipelineConfig{
		CandidatesPerBatch: 5,
		ClueCandidates:     3,
		GenerationTimeout:  60 * time.Second,
		Thresholds:         DefaultThresholds(),
		FilterOffensive:    true,
		GridSpecs: map[string]GridSizeSpec{
			"mini": {
				Width:          5,
				Height:         5,
				MaxWords:       12,
				MaxBlackSquares: 4,
				TargetDensity:  0.12,
			},
			"midi": {
				Width:          11,
				Height:         11,
				MaxWords:       45,
				MaxBlackSquares: 20,
				TargetDensity:  0.14,
			},
			"daily": {
				Width:          15,
				Height:         15,
				MaxWords:       78,
				MaxBlackSquares: 38,
				TargetDensity:  0.16,
			},
			"sunday": {
				Width:          21,
				Height:         21,
				MaxWords:       140,
				MaxBlackSquares: 70,
				TargetDensity:  0.15,
			},
		},
	}
}

// NewProductionPipeline creates a new production pipeline
func NewProductionPipeline(apiKey string, config PipelineConfig) *ProductionPipeline {
	wordList := NewWordListService()
	return &ProductionPipeline{
		wordList:      wordList,
		gridFiller:    NewGridFiller(wordList),
		clueGenerator: NewClueGenerator(apiKey, wordList),
		qualityScorer: NewQualityScorer(wordList),
		apiKey:        apiKey,
		config:        config,
	}
}

// GenerateBatch generates multiple puzzle candidates and returns the best ones
func (pp *ProductionPipeline) GenerateBatch(ctx context.Context, req *BatchGenerationRequest) (*BatchResult, error) {
	startTime := time.Now()
	result := &BatchResult{
		Generated: make([]*GeneratedPuzzleResult, 0),
		Errors:    make([]string, 0),
	}

	// Get grid spec
	spec, ok := pp.config.GridSpecs[req.Size]
	if !ok {
		return nil, fmt.Errorf("unknown grid size: %s", req.Size)
	}

	// Generate candidates in parallel
	var wg sync.WaitGroup
	var mu sync.Mutex
	successCount := 0

	for i := 0; i < pp.config.CandidatesPerBatch; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			// Check context
			select {
			case <-ctx.Done():
				return
			default:
			}

			puzzleResult, err := pp.generateSinglePuzzle(ctx, req, spec, idx)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Candidate %d: %v", idx, err))
				return
			}

			result.Generated = append(result.Generated, puzzleResult)
			successCount++
		}(i)
	}

	wg.Wait()

	// Calculate success rate
	result.SuccessRate = float64(successCount) / float64(pp.config.CandidatesPerBatch)

	// Sort by quality score and pick best
	if len(result.Generated) > 0 {
		sort.Slice(result.Generated, func(i, j int) bool {
			return result.Generated[i].QualityReport.OverallScore > result.Generated[j].QualityReport.OverallScore
		})
		result.BestPuzzle = result.Generated[0]
	}

	result.TotalTime = time.Since(startTime)
	return result, nil
}

// BatchGenerationRequest contains parameters for batch generation
type BatchGenerationRequest struct {
	Size        string        // "mini", "midi", "daily", "sunday"
	Difficulty  DayDifficulty // Day-based difficulty
	Theme       string        // Optional theme
	TargetDate  *time.Time    // Target publication date
	ThemeWords  []string      // Optional theme entries to include
}

func (pp *ProductionPipeline) generateSinglePuzzle(
	ctx context.Context,
	req *BatchGenerationRequest,
	spec GridSizeSpec,
	idx int,
) (*GeneratedPuzzleResult, error) {

	// Create a timeout context
	timeoutCtx, cancel := context.WithTimeout(ctx, pp.config.GenerationTimeout)
	defer cancel()

	// Generate grid pattern
	blackSquares := pp.gridFiller.GenerateSymmetricBlackSquares(spec.Width, spec.Height, spec.TargetDensity)

	// Create theme entries if provided
	var themeEntries []ThemeEntry
	// Theme entry placement would go here

	gridSpec := &GridSpec{
		Width:        spec.Width,
		Height:       spec.Height,
		BlackSquares: blackSquares,
		ThemeEntries: themeEntries,
		MinWordScore: 30,
	}

	// Fill grid using CSP
	filledGrid, err := pp.gridFiller.FillGrid(gridSpec)
	if err != nil {
		return nil, fmt.Errorf("grid filling failed: %w", err)
	}

	// Check timeout
	select {
	case <-timeoutCtx.Done():
		return nil, fmt.Errorf("generation timed out")
	default:
	}

	// Extract answers from filled grid
	answers := make([]string, len(filledGrid.Slots))
	for i, slot := range filledGrid.Slots {
		answers[i] = slot.Word
	}

	// Generate clues for all answers
	clueMap, err := pp.clueGenerator.GenerateBatchClues(answers, req.Difficulty, req.Theme)
	if err != nil {
		return nil, fmt.Errorf("clue generation failed: %w", err)
	}

	// Build puzzle model
	puzzle := pp.buildPuzzleFromGrid(filledGrid, clueMap, req)

	// Score puzzle
	qualityReport := pp.qualityScorer.ScorePuzzle(puzzle)

	// Content filtering
	if pp.config.FilterOffensive {
		if issues := pp.filterContent(puzzle); len(issues) > 0 {
			return nil, fmt.Errorf("content filter failed: %v", issues)
		}
	}

	return &GeneratedPuzzleResult{
		Puzzle:        puzzle,
		QualityReport: qualityReport,
		GeneratedAt:   time.Now(),
	}, nil
}

func (pp *ProductionPipeline) buildPuzzleFromGrid(
	grid *FilledGrid,
	clueMap map[string][]GeneratedClue,
	req *BatchGenerationRequest,
) *models.Puzzle {

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
						clue := pp.buildClue(slot, num, clueMap)
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
	title := pp.generateTitle(req)

	puzzle := &models.Puzzle{
		ID:          uuid.New().String(),
		Title:       title,
		Author:      "CrossPlay AI",
		Difficulty:  pp.difficultyToModel(req.Difficulty),
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

	if req.TargetDate != nil {
		dateStr := req.TargetDate.Format("2006-01-02")
		puzzle.Date = &dateStr
	}

	return puzzle
}

func (pp *ProductionPipeline) buildClue(slot FilledSlot, number int, clueMap map[string][]GeneratedClue) models.Clue {
	answer := slot.Word

	// Get best clue from generated candidates
	var clueText string
	if candidates, ok := clueMap[answer]; ok && len(candidates) > 0 {
		best := pp.clueGenerator.SelectBestClue(candidates, answer)
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

func (pp *ProductionPipeline) generateTitle(req *BatchGenerationRequest) string {
	if req.Theme != "" {
		return req.Theme
	}

	// Generate a title based on date and difficulty
	day := strings.Title(string(req.Difficulty))
	if req.TargetDate != nil {
		return fmt.Sprintf("%s Puzzle", day)
	}

	return fmt.Sprintf("%s Crossword", day)
}

func (pp *ProductionPipeline) difficultyToModel(day DayDifficulty) models.Difficulty {
	switch day {
	case DayMonday, DayTuesday:
		return models.DifficultyEasy
	case DayWednesday, DayThursday, DaySunday:
		return models.DifficultyMedium
	case DayFriday, DaySaturday:
		return models.DifficultyHard
	default:
		return models.DifficultyMedium
	}
}

func (pp *ProductionPipeline) filterContent(puzzle *models.Puzzle) []string {
	var issues []string

	// Check answers for offensive content
	bannedPatterns := []string{
		// Add patterns for offensive content
		// This is a simplified check - production should use a proper content filter
	}

	for _, clue := range puzzle.CluesAcross {
		for _, pattern := range bannedPatterns {
			if strings.Contains(strings.ToUpper(clue.Answer), pattern) {
				issues = append(issues, fmt.Sprintf("banned pattern in answer: %s", clue.Answer))
			}
		}
	}

	for _, clue := range puzzle.CluesDown {
		for _, pattern := range bannedPatterns {
			if strings.Contains(strings.ToUpper(clue.Answer), pattern) {
				issues = append(issues, fmt.Sprintf("banned pattern in answer: %s", clue.Answer))
			}
		}
	}

	// Check custom banned words
	for _, banned := range pp.config.CustomBannedWords {
		bannedUpper := strings.ToUpper(banned)
		for _, clue := range puzzle.CluesAcross {
			if strings.ToUpper(clue.Answer) == bannedUpper {
				issues = append(issues, fmt.Sprintf("banned word: %s", clue.Answer))
			}
		}
		for _, clue := range puzzle.CluesDown {
			if strings.ToUpper(clue.Answer) == bannedUpper {
				issues = append(issues, fmt.Sprintf("banned word: %s", clue.Answer))
			}
		}
	}

	return issues
}

// DailyProductionSchedule manages daily puzzle production
type DailyProductionSchedule struct {
	pipeline *ProductionPipeline
	mu       sync.Mutex
	archive  map[string][]*GeneratedPuzzleResult // Date -> puzzles
}

// NewDailyProductionSchedule creates a new production schedule
func NewDailyProductionSchedule(pipeline *ProductionPipeline) *DailyProductionSchedule {
	return &DailyProductionSchedule{
		pipeline: pipeline,
		archive:  make(map[string][]*GeneratedPuzzleResult),
	}
}

// GenerateWeek generates puzzles for an entire week
func (dps *DailyProductionSchedule) GenerateWeek(ctx context.Context, startDate time.Time) (map[string]*BatchResult, error) {
	results := make(map[string]*BatchResult)

	days := []DayDifficulty{
		DayMonday, DayTuesday, DayWednesday,
		DayThursday, DayFriday, DaySaturday, DaySunday,
	}

	for i, day := range days {
		targetDate := startDate.AddDate(0, 0, i)
		dateStr := targetDate.Format("2006-01-02")

		log.Printf("Generating puzzle for %s (%s)...", dateStr, day)

		// Choose size based on day
		size := "daily"
		if day == DaySunday {
			size = "sunday"
		}

		req := &BatchGenerationRequest{
			Size:       size,
			Difficulty: day,
			TargetDate: &targetDate,
		}

		result, err := dps.pipeline.GenerateBatch(ctx, req)
		if err != nil {
			log.Printf("Failed to generate puzzle for %s: %v", dateStr, err)
			continue
		}

		results[dateStr] = result

		// Archive the best puzzle
		if result.BestPuzzle != nil {
			dps.mu.Lock()
			dps.archive[dateStr] = append(dps.archive[dateStr], result.BestPuzzle)
			dps.mu.Unlock()
		}

		log.Printf("Generated %d candidates for %s (best score: %.1f)",
			len(result.Generated), dateStr,
			result.BestPuzzle.QualityReport.OverallScore)
	}

	return results, nil
}

// GetBestPuzzleForDate returns the highest-scoring puzzle for a date
func (dps *DailyProductionSchedule) GetBestPuzzleForDate(date string) *GeneratedPuzzleResult {
	dps.mu.Lock()
	defer dps.mu.Unlock()

	puzzles, ok := dps.archive[date]
	if !ok || len(puzzles) == 0 {
		return nil
	}

	// Sort by score
	sort.Slice(puzzles, func(i, j int) bool {
		return puzzles[i].QualityReport.OverallScore > puzzles[j].QualityReport.OverallScore
	})

	return puzzles[0]
}

// ArchiveStats returns statistics about the puzzle archive
type ArchiveStats struct {
	TotalPuzzles     int     `json:"totalPuzzles"`
	AverageScore     float64 `json:"averageScore"`
	DatesWithPuzzles int     `json:"datesWithPuzzles"`
	HighestScore     float64 `json:"highestScore"`
	LowestScore      float64 `json:"lowestScore"`
}

func (dps *DailyProductionSchedule) GetArchiveStats() ArchiveStats {
	dps.mu.Lock()
	defer dps.mu.Unlock()

	stats := ArchiveStats{
		LowestScore: 100,
	}

	var totalScore float64

	for _, puzzles := range dps.archive {
		stats.DatesWithPuzzles++
		for _, p := range puzzles {
			stats.TotalPuzzles++
			score := p.QualityReport.OverallScore
			totalScore += score
			if score > stats.HighestScore {
				stats.HighestScore = score
			}
			if score < stats.LowestScore {
				stats.LowestScore = score
			}
		}
	}

	if stats.TotalPuzzles > 0 {
		stats.AverageScore = totalScore / float64(stats.TotalPuzzles)
	}

	return stats
}
