package puzzle

import (
	"fmt"
	"sort"
	"strings"
	"unicode"

	"github.com/crossplay/backend/internal/models"
)

// QualityScorer scores puzzles based on NYT-quality standards
type QualityScorer struct {
	wordList *WordListService
}

// QualityReport contains detailed quality metrics for a puzzle
type QualityReport struct {
	OverallScore      float64            `json:"overallScore"`      // 0-100
	Valid             bool               `json:"valid"`             // Passes all requirements
	Errors            []string           `json:"errors"`            // Blocking issues
	Warnings          []string           `json:"warnings"`          // Quality concerns
	Metrics           QualityMetrics     `json:"metrics"`           // Detailed metrics
	ClueAnalysis      []ClueQualityItem  `json:"clueAnalysis"`      // Per-clue analysis
	GridAnalysis      GridQualityReport  `json:"gridAnalysis"`      // Grid analysis
	Recommendations   []string           `json:"recommendations"`   // Improvement suggestions
}

// QualityMetrics contains numeric quality measurements
type QualityMetrics struct {
	AverageWordScore       float64 `json:"averageWordScore"`       // 0-100
	ThreeLetterWordPercent float64 `json:"threeLetterWordPercent"` // Percentage of 3-letter words
	CrosswordesePercent    float64 `json:"crosswordesePercent"`    // Percentage of crosswordese
	AverageWordLength      float64 `json:"averageWordLength"`      // Average word length
	BlackSquarePercent     float64 `json:"blackSquarePercent"`     // Black square density
	LongestWord            int     `json:"longestWord"`            // Length of longest word
	ShortestWord           int     `json:"shortestWord"`           // Length of shortest word
	TotalWords             int     `json:"totalWords"`             // Total word count
	UniqueLetters          int     `json:"uniqueLetters"`          // Number of unique letters used
	SymmetryType           string  `json:"symmetryType"`           // Type of symmetry
}

// ClueQualityItem contains quality info for a single clue
type ClueQualityItem struct {
	Number    int      `json:"number"`
	Direction string   `json:"direction"`
	Answer    string   `json:"answer"`
	Clue      string   `json:"clue"`
	Score     float64  `json:"score"`  // 0-100
	Issues    []string `json:"issues"` // Any problems found
}

// GridQualityReport contains grid-specific quality analysis
type GridQualityReport struct {
	HasRotationalSymmetry bool     `json:"hasRotationalSymmetry"`
	IsFullyConnected      bool     `json:"isFullyConnected"`
	AllCellsCrossed       bool     `json:"allCellsCrossed"`
	HasShortWords         bool     `json:"hasShortWords"`
	ShortWordLocations    []string `json:"shortWordLocations"`
	ObscureCrossings      []string `json:"obscureCrossings"` // Two obscure words crossing
}

// QualityThresholds defines acceptable quality levels
type QualityThresholds struct {
	MinOverallScore        float64 // Minimum overall score (0-100)
	MinAverageWordScore    float64 // Minimum average word score
	MaxThreeLetterPercent  float64 // Maximum 3-letter word percentage
	MaxCrosswordesePercent float64 // Maximum crosswordese percentage
	MaxBlackSquarePercent  float64 // Maximum black square density
	MinAverageWordLength   float64 // Minimum average word length
}

// DefaultThresholds returns standard quality thresholds
func DefaultThresholds() QualityThresholds {
	return QualityThresholds{
		MinOverallScore:        60.0,
		MinAverageWordScore:    40.0,
		MaxThreeLetterPercent:  20.0,
		MaxCrosswordesePercent: 5.0,
		MaxBlackSquarePercent:  17.0,
		MinAverageWordLength:   4.5,
	}
}

// HighQualityThresholds returns stricter thresholds for premium puzzles
func HighQualityThresholds() QualityThresholds {
	return QualityThresholds{
		MinOverallScore:        75.0,
		MinAverageWordScore:    50.0,
		MaxThreeLetterPercent:  15.0,
		MaxCrosswordesePercent: 2.0,
		MaxBlackSquarePercent:  16.0,
		MinAverageWordLength:   5.0,
	}
}

// NewQualityScorer creates a new quality scorer
func NewQualityScorer(wordList *WordListService) *QualityScorer {
	return &QualityScorer{
		wordList: wordList,
	}
}

// ScorePuzzle generates a comprehensive quality report for a puzzle
func (qs *QualityScorer) ScorePuzzle(puzzle *models.Puzzle) *QualityReport {
	report := &QualityReport{
		Valid:   true,
		Errors:  []string{},
		Warnings: []string{},
	}

	// Analyze grid
	report.GridAnalysis = qs.analyzeGrid(puzzle)
	if !report.GridAnalysis.HasRotationalSymmetry {
		report.Errors = append(report.Errors, "Grid lacks 180° rotational symmetry")
		report.Valid = false
	}
	if !report.GridAnalysis.IsFullyConnected {
		report.Errors = append(report.Errors, "Grid has isolated sections")
		report.Valid = false
	}
	if !report.GridAnalysis.AllCellsCrossed {
		report.Errors = append(report.Errors, "Some cells are not fully crossed")
		report.Valid = false
	}
	if report.GridAnalysis.HasShortWords {
		report.Errors = append(report.Errors, fmt.Sprintf("Grid contains 2-letter words: %v", report.GridAnalysis.ShortWordLocations))
		report.Valid = false
	}

	// Check for duplicate answers
	duplicates := qs.findDuplicateAnswers(puzzle)
	if len(duplicates) > 0 {
		report.Errors = append(report.Errors, fmt.Sprintf("Duplicate answers found: %v", duplicates))
		report.Valid = false
	}

	// Calculate metrics
	report.Metrics = qs.calculateMetrics(puzzle)

	// Check thresholds
	thresholds := DefaultThresholds()
	if report.Metrics.ThreeLetterWordPercent > thresholds.MaxThreeLetterPercent {
		report.Warnings = append(report.Warnings, fmt.Sprintf("High 3-letter word percentage: %.1f%% (max: %.1f%%)", report.Metrics.ThreeLetterWordPercent, thresholds.MaxThreeLetterPercent))
	}
	if report.Metrics.CrosswordesePercent > thresholds.MaxCrosswordesePercent {
		report.Warnings = append(report.Warnings, fmt.Sprintf("High crosswordese percentage: %.1f%% (max: %.1f%%)", report.Metrics.CrosswordesePercent, thresholds.MaxCrosswordesePercent))
	}
	if report.Metrics.BlackSquarePercent > thresholds.MaxBlackSquarePercent {
		report.Warnings = append(report.Warnings, fmt.Sprintf("High black square density: %.1f%% (max: %.1f%%)", report.Metrics.BlackSquarePercent, thresholds.MaxBlackSquarePercent))
	}
	if report.Metrics.AverageWordLength < thresholds.MinAverageWordLength {
		report.Warnings = append(report.Warnings, fmt.Sprintf("Low average word length: %.2f (min: %.2f)", report.Metrics.AverageWordLength, thresholds.MinAverageWordLength))
	}

	// Analyze clues
	report.ClueAnalysis = qs.analyzeClues(puzzle)
	for _, clueItem := range report.ClueAnalysis {
		if len(clueItem.Issues) > 0 {
			for _, issue := range clueItem.Issues {
				if strings.Contains(issue, "answer appears in clue") {
					report.Errors = append(report.Errors, fmt.Sprintf("Clue %d-%s: %s", clueItem.Number, clueItem.Direction, issue))
					report.Valid = false
				} else {
					report.Warnings = append(report.Warnings, fmt.Sprintf("Clue %d-%s: %s", clueItem.Number, clueItem.Direction, issue))
				}
			}
		}
	}

	// Check for obscure crossings
	if len(report.GridAnalysis.ObscureCrossings) > 0 {
		report.Warnings = append(report.Warnings, fmt.Sprintf("Obscure word crossings: %v", report.GridAnalysis.ObscureCrossings))
	}

	// Calculate overall score
	report.OverallScore = qs.calculateOverallScore(report)

	// Generate recommendations
	report.Recommendations = qs.generateRecommendations(report)

	return report
}

func (qs *QualityScorer) analyzeGrid(puzzle *models.Puzzle) GridQualityReport {
	report := GridQualityReport{}

	// Check rotational symmetry
	report.HasRotationalSymmetry = qs.checkSymmetry(puzzle)

	// Check connectivity
	report.IsFullyConnected = qs.checkConnectivity(puzzle)

	// Check all cells crossed
	report.AllCellsCrossed = qs.checkAllCellsCrossed(puzzle)

	// Find short words
	shortWords := qs.findShortWords(puzzle)
	report.HasShortWords = len(shortWords) > 0
	report.ShortWordLocations = shortWords

	// Find obscure crossings
	report.ObscureCrossings = qs.findObscureCrossings(puzzle)

	return report
}

func (qs *QualityScorer) checkSymmetry(puzzle *models.Puzzle) bool {
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

func (qs *QualityScorer) checkConnectivity(puzzle *models.Puzzle) bool {
	h := puzzle.GridHeight
	w := puzzle.GridWidth

	// Find first white cell
	var startX, startY int
	found := false
	for y := 0; y < h && !found; y++ {
		for x := 0; x < w && !found; x++ {
			if puzzle.Grid[y][x].Letter != nil {
				startX, startY = x, y
				found = true
			}
		}
	}

	if !found {
		return true
	}

	// BFS
	type pos struct{ x, y int }
	visited := make(map[pos]bool)
	queue := []pos{{startX, startY}}
	visited[queue[0]] = true

	directions := []pos{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}

	for len(queue) > 0 {
		p := queue[0]
		queue = queue[1:]

		for _, d := range directions {
			nx, ny := p.x+d.x, p.y+d.y
			newPos := pos{nx, ny}

			if nx >= 0 && nx < w && ny >= 0 && ny < h &&
				puzzle.Grid[ny][nx].Letter != nil && !visited[newPos] {
				visited[newPos] = true
				queue = append(queue, newPos)
			}
		}
	}

	// Count white cells
	whiteCount := 0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			if puzzle.Grid[y][x].Letter != nil {
				whiteCount++
			}
		}
	}

	return len(visited) == whiteCount
}

func (qs *QualityScorer) checkAllCellsCrossed(puzzle *models.Puzzle) bool {
	h := puzzle.GridHeight
	w := puzzle.GridWidth

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			if puzzle.Grid[y][x].Letter == nil {
				continue
			}

			hasAcross := false
			hasDown := false

			// Check across
			if (x > 0 && puzzle.Grid[y][x-1].Letter != nil) ||
				(x < w-1 && puzzle.Grid[y][x+1].Letter != nil) {
				hasAcross = true
			}

			// Check down
			if (y > 0 && puzzle.Grid[y-1][x].Letter != nil) ||
				(y < h-1 && puzzle.Grid[y+1][x].Letter != nil) {
				hasDown = true
			}

			if !hasAcross || !hasDown {
				return false
			}
		}
	}

	return true
}

func (qs *QualityScorer) findShortWords(puzzle *models.Puzzle) []string {
	var shortWords []string
	h := puzzle.GridHeight
	w := puzzle.GridWidth

	// Check across
	for y := 0; y < h; y++ {
		wordLen := 0
		startX := 0
		for x := 0; x <= w; x++ {
			if x < w && puzzle.Grid[y][x].Letter != nil {
				if wordLen == 0 {
					startX = x
				}
				wordLen++
			} else {
				if wordLen > 0 && wordLen < 3 {
					shortWords = append(shortWords, fmt.Sprintf("across at (%d,%d) len=%d", startX, y, wordLen))
				}
				wordLen = 0
			}
		}
	}

	// Check down
	for x := 0; x < w; x++ {
		wordLen := 0
		startY := 0
		for y := 0; y <= h; y++ {
			if y < h && puzzle.Grid[y][x].Letter != nil {
				if wordLen == 0 {
					startY = y
				}
				wordLen++
			} else {
				if wordLen > 0 && wordLen < 3 {
					shortWords = append(shortWords, fmt.Sprintf("down at (%d,%d) len=%d", x, startY, wordLen))
				}
				wordLen = 0
			}
		}
	}

	return shortWords
}

func (qs *QualityScorer) findDuplicateAnswers(puzzle *models.Puzzle) []string {
	answers := make(map[string]int)
	var duplicates []string

	for _, clue := range puzzle.CluesAcross {
		answers[strings.ToUpper(clue.Answer)]++
	}
	for _, clue := range puzzle.CluesDown {
		answers[strings.ToUpper(clue.Answer)]++
	}

	for answer, count := range answers {
		if count > 1 {
			duplicates = append(duplicates, answer)
		}
	}

	return duplicates
}

func (qs *QualityScorer) findObscureCrossings(puzzle *models.Puzzle) []string {
	var obscureCrossings []string

	// Get all answers with their scores
	type scoredAnswer struct {
		answer    string
		score     int
		direction string
		number    int
	}

	var answers []scoredAnswer
	for _, clue := range puzzle.CluesAcross {
		score := qs.wordList.GetWordScore(clue.Answer)
		answers = append(answers, scoredAnswer{clue.Answer, score, "across", clue.Number})
	}
	for _, clue := range puzzle.CluesDown {
		score := qs.wordList.GetWordScore(clue.Answer)
		answers = append(answers, scoredAnswer{clue.Answer, score, "down", clue.Number})
	}

	// Find obscure words (score < 30)
	obscureThreshold := 30
	var obscure []scoredAnswer
	for _, a := range answers {
		if a.score < obscureThreshold {
			obscure = append(obscure, a)
		}
	}

	// Check for crossings between obscure words
	// This is a simplified check - in a full implementation, we'd check actual grid positions
	if len(obscure) >= 2 {
		for i := 0; i < len(obscure); i++ {
			for j := i + 1; j < len(obscure); j++ {
				if obscure[i].direction != obscure[j].direction {
					// Different directions could cross
					obscureCrossings = append(obscureCrossings, fmt.Sprintf("%s (%d) x %s (%d)", obscure[i].answer, obscure[i].score, obscure[j].answer, obscure[j].score))
				}
			}
		}
	}

	return obscureCrossings
}

func (qs *QualityScorer) calculateMetrics(puzzle *models.Puzzle) QualityMetrics {
	metrics := QualityMetrics{}

	// Collect all answers
	var allAnswers []string
	for _, clue := range puzzle.CluesAcross {
		allAnswers = append(allAnswers, clue.Answer)
	}
	for _, clue := range puzzle.CluesDown {
		allAnswers = append(allAnswers, clue.Answer)
	}

	metrics.TotalWords = len(allAnswers)

	if metrics.TotalWords == 0 {
		return metrics
	}

	// Calculate word scores and lengths
	var totalScore float64
	var totalLength int
	var threeLetterCount int
	var crosswordeseCount int
	longestWord := 0
	shortestWord := 100
	uniqueLetters := make(map[rune]bool)

	for _, answer := range allAnswers {
		score := qs.wordList.GetWordScore(answer)
		totalScore += float64(score)

		length := len(answer)
		totalLength += length

		if length == 3 {
			threeLetterCount++
		}
		if length > longestWord {
			longestWord = length
		}
		if length < shortestWord {
			shortestWord = length
		}

		if qs.wordList.IsCrosswordese(answer) {
			crosswordeseCount++
		}

		for _, r := range answer {
			uniqueLetters[unicode.ToUpper(r)] = true
		}
	}

	metrics.AverageWordScore = totalScore / float64(metrics.TotalWords)
	metrics.AverageWordLength = float64(totalLength) / float64(metrics.TotalWords)
	metrics.ThreeLetterWordPercent = float64(threeLetterCount) / float64(metrics.TotalWords) * 100
	metrics.CrosswordesePercent = float64(crosswordeseCount) / float64(metrics.TotalWords) * 100
	metrics.LongestWord = longestWord
	metrics.ShortestWord = shortestWord
	metrics.UniqueLetters = len(uniqueLetters)

	// Calculate black square percentage
	totalCells := puzzle.GridWidth * puzzle.GridHeight
	blackCells := 0
	for y := 0; y < puzzle.GridHeight; y++ {
		for x := 0; x < puzzle.GridWidth; x++ {
			if puzzle.Grid[y][x].Letter == nil {
				blackCells++
			}
		}
	}
	metrics.BlackSquarePercent = float64(blackCells) / float64(totalCells) * 100

	// Determine symmetry type
	if qs.checkSymmetry(puzzle) {
		metrics.SymmetryType = "180° rotational"
	} else {
		metrics.SymmetryType = "none"
	}

	return metrics
}

func (qs *QualityScorer) analyzeClues(puzzle *models.Puzzle) []ClueQualityItem {
	var items []ClueQualityItem

	// Analyze across clues
	for _, clue := range puzzle.CluesAcross {
		item := qs.analyzeClue(clue, "across")
		items = append(items, item)
	}

	// Analyze down clues
	for _, clue := range puzzle.CluesDown {
		item := qs.analyzeClue(clue, "down")
		items = append(items, item)
	}

	return items
}

func (qs *QualityScorer) analyzeClue(clue models.Clue, direction string) ClueQualityItem {
	item := ClueQualityItem{
		Number:    clue.Number,
		Direction: direction,
		Answer:    clue.Answer,
		Clue:      clue.Text,
		Score:     70.0, // Base score
		Issues:    []string{},
	}

	answerUpper := strings.ToUpper(clue.Answer)
	clueUpper := strings.ToUpper(clue.Text)

	// Check if answer appears in clue
	if strings.Contains(clueUpper, answerUpper) {
		item.Issues = append(item.Issues, "answer appears in clue")
		item.Score = 0
		return item
	}

	// Check for partial answer in clue (4+ letter substrings)
	if len(answerUpper) >= 4 {
		for i := 0; i <= len(answerUpper)-4; i++ {
			substr := answerUpper[i : i+4]
			if strings.Contains(clueUpper, substr) {
				item.Issues = append(item.Issues, fmt.Sprintf("partial answer '%s' in clue", substr))
				item.Score -= 20
				break
			}
		}
	}

	// Check clue length
	wordCount := len(strings.Fields(clue.Text))
	if wordCount < 2 {
		item.Issues = append(item.Issues, "clue too short")
		item.Score -= 10
	} else if wordCount > 15 {
		item.Issues = append(item.Issues, "clue too long")
		item.Score -= 5
	}

	// Check for common clue quality issues
	if strings.Contains(clue.Text, "___") {
		// Fill-in-the-blank clues - not necessarily bad but note it
		item.Score -= 5
	}

	// Bonus for clever formatting
	if strings.HasSuffix(clue.Text, "?") {
		item.Score += 5 // Question marks often indicate wordplay
	}

	// Word score affects clue quality perception
	wordScore := qs.wordList.GetWordScore(clue.Answer)
	if wordScore < 30 {
		item.Issues = append(item.Issues, fmt.Sprintf("obscure answer (score: %d)", wordScore))
		item.Score -= 10
	}

	// Normalize score
	if item.Score < 0 {
		item.Score = 0
	}
	if item.Score > 100 {
		item.Score = 100
	}

	return item
}

func (qs *QualityScorer) calculateOverallScore(report *QualityReport) float64 {
	if !report.Valid {
		return 0.0
	}

	// Base score starts at 70
	score := 70.0

	// Adjust based on metrics
	// Word score (target: 50+)
	if report.Metrics.AverageWordScore >= 50 {
		score += 10
	} else if report.Metrics.AverageWordScore >= 40 {
		score += 5
	} else if report.Metrics.AverageWordScore < 30 {
		score -= 10
	}

	// 3-letter word penalty (target: <15%)
	if report.Metrics.ThreeLetterWordPercent <= 15 {
		score += 5
	} else if report.Metrics.ThreeLetterWordPercent > 25 {
		score -= 10
	}

	// Crosswordese penalty (target: <2%)
	if report.Metrics.CrosswordesePercent <= 2 {
		score += 5
	} else if report.Metrics.CrosswordesePercent > 5 {
		score -= 10
	}

	// Average word length (target: 5+)
	if report.Metrics.AverageWordLength >= 5.0 {
		score += 5
	} else if report.Metrics.AverageWordLength < 4.0 {
		score -= 10
	}

	// Black square density (target: <16%)
	if report.Metrics.BlackSquarePercent <= 16 {
		score += 5
	} else if report.Metrics.BlackSquarePercent > 18 {
		score -= 5
	}

	// Warning penalty
	score -= float64(len(report.Warnings)) * 2

	// Clue quality
	var avgClueScore float64
	for _, clue := range report.ClueAnalysis {
		avgClueScore += clue.Score
	}
	if len(report.ClueAnalysis) > 0 {
		avgClueScore /= float64(len(report.ClueAnalysis))
	}
	// Adjust score based on clue quality
	score += (avgClueScore - 70) / 5

	// Normalize
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

func (qs *QualityScorer) generateRecommendations(report *QualityReport) []string {
	var recs []string

	if !report.Valid {
		recs = append(recs, "Fix all errors before this puzzle can be published")
		return recs
	}

	if report.Metrics.ThreeLetterWordPercent > 20 {
		recs = append(recs, "Consider replacing some 3-letter words with longer entries")
	}

	if report.Metrics.CrosswordesePercent > 3 {
		recs = append(recs, "Reduce overused crossword words (crosswordese)")
	}

	if report.Metrics.AverageWordScore < 45 {
		recs = append(recs, "Consider using more common, higher-quality words")
	}

	if report.Metrics.BlackSquarePercent > 17 {
		recs = append(recs, "Consider reducing black square count for more letter space")
	}

	if len(report.GridAnalysis.ObscureCrossings) > 0 {
		recs = append(recs, "Avoid crossing two obscure words - solvers need at least one fair crossing")
	}

	// Check for low-scoring clues
	lowScoreClues := 0
	for _, clue := range report.ClueAnalysis {
		if clue.Score < 50 {
			lowScoreClues++
		}
	}
	if lowScoreClues > 0 {
		recs = append(recs, fmt.Sprintf("Review %d clues with quality issues", lowScoreClues))
	}

	if report.OverallScore >= 85 {
		recs = append(recs, "Excellent puzzle! Ready for publication.")
	} else if report.OverallScore >= 70 {
		recs = append(recs, "Good puzzle with minor improvements possible")
	}

	return recs
}

// MeetsThresholds checks if a puzzle meets the specified quality thresholds
func (qs *QualityScorer) MeetsThresholds(report *QualityReport, thresholds QualityThresholds) bool {
	if !report.Valid {
		return false
	}

	if report.OverallScore < thresholds.MinOverallScore {
		return false
	}

	if report.Metrics.AverageWordScore < thresholds.MinAverageWordScore {
		return false
	}

	if report.Metrics.ThreeLetterWordPercent > thresholds.MaxThreeLetterPercent {
		return false
	}

	if report.Metrics.CrosswordesePercent > thresholds.MaxCrosswordesePercent {
		return false
	}

	if report.Metrics.BlackSquarePercent > thresholds.MaxBlackSquarePercent {
		return false
	}

	if report.Metrics.AverageWordLength < thresholds.MinAverageWordLength {
		return false
	}

	return true
}

// RankPuzzles ranks puzzles by quality score
func (qs *QualityScorer) RankPuzzles(puzzles []*models.Puzzle) []*models.Puzzle {
	type scoredPuzzle struct {
		puzzle *models.Puzzle
		score  float64
	}

	scored := make([]scoredPuzzle, len(puzzles))
	for i, p := range puzzles {
		report := qs.ScorePuzzle(p)
		scored[i] = scoredPuzzle{p, report.OverallScore}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	result := make([]*models.Puzzle, len(puzzles))
	for i, sp := range scored {
		result[i] = sp.puzzle
	}

	return result
}
