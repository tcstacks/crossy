package puzzle

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// GridFiller uses CSP (Constraint Satisfaction Programming) to fill crossword grids
type GridFiller struct {
	wordList   *WordListService
	rng        *rand.Rand
	maxRetries int
	timeout    time.Duration
}

// GridSpec defines the specifications for a grid to be filled
type GridSpec struct {
	Width       int
	Height      int
	BlackSquares []Position // Pre-defined black square positions
	ThemeEntries []ThemeEntry // Theme words that must be placed
	MinWordScore int          // Minimum acceptable word score
	MaxWordScore int          // Maximum word score (for variety)
}

// Position represents a grid position
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// ThemeEntry represents a theme word to be placed in the grid
type ThemeEntry struct {
	Answer    string
	Direction string // "across" or "down"
	StartPos  Position
}

// Slot represents a word slot in the grid
type Slot struct {
	ID        int
	StartPos  Position
	Length    int
	Direction string // "across" or "down"
	Cells     []Position
}

// FilledGrid represents a completed grid
type FilledGrid struct {
	Width  int
	Height int
	Cells  [][]rune   // The filled letters (0 = black square)
	Slots  []FilledSlot
}

// FilledSlot represents a filled word slot
type FilledSlot struct {
	Slot   Slot
	Word   string
	Score  int
}

// NewGridFiller creates a new grid filler
func NewGridFiller(wordList *WordListService) *GridFiller {
	return &GridFiller{
		wordList:   wordList,
		rng:        rand.New(rand.NewSource(time.Now().UnixNano())),
		maxRetries: 1000,
		timeout:    10 * time.Second, // Per-attempt timeout (we do multiple attempts)
	}
}

// FillGrid attempts to fill a grid using CSP with backtracking
func (gf *GridFiller) FillGrid(spec *GridSpec) (*FilledGrid, error) {
	// Try multiple times with different random seeds
	maxAttempts := 10

	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Reseed RNG for each attempt to get different word orderings
		gf.rng = rand.New(rand.NewSource(time.Now().UnixNano() + int64(attempt*1000)))

		result, err := gf.fillGridAttempt(spec)
		if err == nil {
			return result, nil
		}
	}

	return nil, fmt.Errorf("failed to fill grid after %d attempts", maxAttempts)
}

func (gf *GridFiller) fillGridAttempt(spec *GridSpec) (*FilledGrid, error) {
	startTime := time.Now()

	// Initialize the grid
	grid := gf.initializeGrid(spec)

	// Extract slots from the grid
	slots := gf.extractSlots(grid, spec.Width, spec.Height)

	// Place theme entries first
	for _, theme := range spec.ThemeEntries {
		slot := gf.findSlotForTheme(slots, theme)
		if slot != nil {
			gf.placeWord(grid, slot, theme.Answer)
		}
	}

	// Build constraint graph
	constraints := gf.buildConstraints(slots)

	// Initialize domains with all possible words for each slot
	domains := gf.initializeDomains(slots, grid, spec.MinWordScore)

	// Check if any domain is empty
	for id, domain := range domains {
		if len(domain) == 0 {
			return nil, fmt.Errorf("no words available for slot %d", id)
		}
	}

	// Shuffle domains to add randomization
	for id := range domains {
		gf.shuffleDomain(domains[id])
	}

	// Use backtracking with MRV heuristic to fill the grid
	solution, err := gf.backtrack(grid, slots, domains, constraints, startTime)
	if err != nil {
		return nil, err
	}

	// Build the result
	result := &FilledGrid{
		Width:  spec.Width,
		Height: spec.Height,
		Cells:  grid,
		Slots:  solution,
	}

	return result, nil
}

func (gf *GridFiller) shuffleDomain(domain []ScoredWord) {
	gf.rng.Shuffle(len(domain), func(i, j int) {
		domain[i], domain[j] = domain[j], domain[i]
	})
}

func (gf *GridFiller) initializeGrid(spec *GridSpec) [][]rune {
	grid := make([][]rune, spec.Height)
	for y := 0; y < spec.Height; y++ {
		grid[y] = make([]rune, spec.Width)
		for x := 0; x < spec.Width; x++ {
			grid[y][x] = '?' // Unknown letter
		}
	}

	// Mark black squares
	for _, pos := range spec.BlackSquares {
		if pos.Y >= 0 && pos.Y < spec.Height && pos.X >= 0 && pos.X < spec.Width {
			grid[pos.Y][pos.X] = 0 // Black square
		}
	}

	return grid
}

func (gf *GridFiller) extractSlots(grid [][]rune, width, height int) []Slot {
	var slots []Slot
	slotID := 0

	// Find across slots
	for y := 0; y < height; y++ {
		x := 0
		for x < width {
			if grid[y][x] == 0 {
				x++
				continue
			}

			// Start of a potential across word
			startX := x
			var cells []Position
			for x < width && grid[y][x] != 0 {
				cells = append(cells, Position{X: x, Y: y})
				x++
			}

			if len(cells) >= 3 { // Minimum 3-letter words
				slots = append(slots, Slot{
					ID:        slotID,
					StartPos:  Position{X: startX, Y: y},
					Length:    len(cells),
					Direction: "across",
					Cells:     cells,
				})
				slotID++
			}
		}
	}

	// Find down slots
	for x := 0; x < width; x++ {
		y := 0
		for y < height {
			if grid[y][x] == 0 {
				y++
				continue
			}

			// Start of a potential down word
			startY := y
			var cells []Position
			for y < height && grid[y][x] != 0 {
				cells = append(cells, Position{X: x, Y: y})
				y++
			}

			if len(cells) >= 3 { // Minimum 3-letter words
				slots = append(slots, Slot{
					ID:        slotID,
					StartPos:  Position{X: x, Y: startY},
					Length:    len(cells),
					Direction: "down",
					Cells:     cells,
				})
				slotID++
			}
		}
	}

	return slots
}

func (gf *GridFiller) findSlotForTheme(slots []Slot, theme ThemeEntry) *Slot {
	for i := range slots {
		if slots[i].Direction == theme.Direction &&
			slots[i].StartPos.X == theme.StartPos.X &&
			slots[i].StartPos.Y == theme.StartPos.Y &&
			slots[i].Length == len(theme.Answer) {
			return &slots[i]
		}
	}
	return nil
}

func (gf *GridFiller) placeWord(grid [][]rune, slot *Slot, word string) {
	word = strings.ToUpper(word)
	for i, cell := range slot.Cells {
		if i < len(word) {
			grid[cell.Y][cell.X] = rune(word[i])
		}
	}
}

// Constraint represents a crossing between two slots
type Constraint struct {
	Slot1ID    int
	Slot1Index int // Position in slot1's word
	Slot2ID    int
	Slot2Index int // Position in slot2's word
}

func (gf *GridFiller) buildConstraints(slots []Slot) []Constraint {
	var constraints []Constraint

	// Build a position map for quick lookup
	posToSlots := make(map[Position][]struct {
		slotID int
		index  int
	})

	for _, slot := range slots {
		for i, cell := range slot.Cells {
			posToSlots[cell] = append(posToSlots[cell], struct {
				slotID int
				index  int
			}{slot.ID, i})
		}
	}

	// Find crossings
	for pos, entries := range posToSlots {
		if len(entries) == 2 {
			// This position has exactly two slots crossing
			constraints = append(constraints, Constraint{
				Slot1ID:    entries[0].slotID,
				Slot1Index: entries[0].index,
				Slot2ID:    entries[1].slotID,
				Slot2Index: entries[1].index,
			})
		}
		_ = pos // Position key used for grouping
	}

	return constraints
}

func (gf *GridFiller) initializeDomains(slots []Slot, grid [][]rune, minScore int) map[int][]ScoredWord {
	domains := make(map[int][]ScoredWord)

	for _, slot := range slots {
		// Build pattern from current grid state
		pattern := make([]rune, slot.Length)
		for i, cell := range slot.Cells {
			pattern[i] = grid[cell.Y][cell.X]
		}

		// Find words matching the pattern
		patternStr := string(pattern)
		words := gf.wordList.GetWordsForPattern(patternStr, minScore)

		// If no words found, try with lower minimum score
		if len(words) == 0 {
			words = gf.wordList.GetWordsForPattern(patternStr, 0)
		}

		domains[slot.ID] = words
	}

	return domains
}

// arcConsistency implements the AC-3 algorithm
func (gf *GridFiller) arcConsistency(domains map[int][]ScoredWord, constraints []Constraint) bool {
	// Build adjacency map for quick constraint lookup
	slotConstraints := make(map[int][]Constraint)
	for _, c := range constraints {
		slotConstraints[c.Slot1ID] = append(slotConstraints[c.Slot1ID], c)
		slotConstraints[c.Slot2ID] = append(slotConstraints[c.Slot2ID], c)
	}

	// Queue of arcs to process
	type Arc struct {
		slotID     int
		constraint Constraint
	}

	var queue []Arc
	for _, c := range constraints {
		queue = append(queue, Arc{c.Slot1ID, c})
		queue = append(queue, Arc{c.Slot2ID, c})
	}

	for len(queue) > 0 {
		arc := queue[0]
		queue = queue[1:]

		if gf.revise(domains, arc.constraint, arc.slotID) {
			if len(domains[arc.slotID]) == 0 {
				return false // Domain wiped out
			}

			// Add neighboring arcs back to queue
			for _, c := range slotConstraints[arc.slotID] {
				otherSlot := c.Slot1ID
				if otherSlot == arc.slotID {
					otherSlot = c.Slot2ID
				}
				queue = append(queue, Arc{otherSlot, c})
			}
		}
	}

	return true
}

func (gf *GridFiller) revise(domains map[int][]ScoredWord, c Constraint, slotID int) bool {
	revised := false

	var idx1, idx2 int
	var otherSlotID int

	if slotID == c.Slot1ID {
		idx1, idx2 = c.Slot1Index, c.Slot2Index
		otherSlotID = c.Slot2ID
	} else {
		idx1, idx2 = c.Slot2Index, c.Slot1Index
		otherSlotID = c.Slot1ID
	}

	var newDomain []ScoredWord
	for _, word := range domains[slotID] {
		// Check if there's at least one compatible word in the other domain
		compatible := false
		for _, otherWord := range domains[otherSlotID] {
			if idx1 < len(word.Word) && idx2 < len(otherWord.Word) {
				if word.Word[idx1] == otherWord.Word[idx2] {
					compatible = true
					break
				}
			}
		}

		if compatible {
			newDomain = append(newDomain, word)
		} else {
			revised = true
		}
	}

	if revised {
		domains[slotID] = newDomain
	}

	return revised
}

func (gf *GridFiller) backtrack(
	grid [][]rune,
	slots []Slot,
	domains map[int][]ScoredWord,
	constraints []Constraint,
	startTime time.Time,
) ([]FilledSlot, error) {

	// Check timeout
	if time.Since(startTime) > gf.timeout {
		return nil, fmt.Errorf("grid filling timed out after %v", gf.timeout)
	}

	// Find unfilled slot using MRV (Minimum Remaining Values) heuristic
	slot := gf.selectUnfilledSlot(grid, slots, domains)
	if slot == nil {
		// All slots filled - success!
		return gf.extractSolution(grid, slots, domains), nil
	}

	// Try each word in the domain (already shuffled for randomization)
	domain := domains[slot.ID]

	for _, word := range domain {
		// Skip words that conflict with current grid state
		if !gf.isWordCompatible(grid, slot, word.Word) {
			continue
		}

		// Try placing the word
		oldGrid := gf.copyGrid(grid)
		gf.placeWord(grid, slot, word.Word)

		// Create new domains with forward checking
		newDomains := gf.copyDomains(domains)
		newDomains[slot.ID] = []ScoredWord{word}

		// Apply forward checking
		if gf.forwardCheck(grid, slots, newDomains, constraints, slot.ID) {
			// Recurse
			solution, err := gf.backtrack(grid, slots, newDomains, constraints, startTime)
			if err == nil {
				return solution, nil
			}
		}

		// Backtrack - restore grid
		for y := range grid {
			copy(grid[y], oldGrid[y])
		}
	}

	return nil, fmt.Errorf("no solution found for slot %d", slot.ID)
}

func (gf *GridFiller) selectUnfilledSlot(grid [][]rune, slots []Slot, domains map[int][]ScoredWord) *Slot {
	var bestSlot *Slot
	bestMRV := -1

	for i := range slots {
		slot := &slots[i]

		// Check if slot is already filled
		filled := true
		for _, cell := range slot.Cells {
			if grid[cell.Y][cell.X] == '?' {
				filled = false
				break
			}
		}

		if filled {
			continue
		}

		// MRV: choose slot with smallest domain
		domainSize := len(domains[slot.ID])
		if bestSlot == nil || domainSize < bestMRV {
			bestSlot = slot
			bestMRV = domainSize
		}
	}

	return bestSlot
}

func (gf *GridFiller) isWordCompatible(grid [][]rune, slot *Slot, word string) bool {
	word = strings.ToUpper(word)
	if len(word) != slot.Length {
		return false
	}

	for i, cell := range slot.Cells {
		char := grid[cell.Y][cell.X]
		if char != '?' && char != rune(word[i]) {
			return false
		}
	}

	return true
}

func (gf *GridFiller) forwardCheck(
	grid [][]rune,
	slots []Slot,
	domains map[int][]ScoredWord,
	constraints []Constraint,
	placedSlotID int,
) bool {
	// Filter domains of connected slots
	for _, c := range constraints {
		var affectedSlotID int
		var placedIdx, affectedIdx int

		if c.Slot1ID == placedSlotID {
			affectedSlotID = c.Slot2ID
			placedIdx, affectedIdx = c.Slot1Index, c.Slot2Index
		} else if c.Slot2ID == placedSlotID {
			affectedSlotID = c.Slot1ID
			placedIdx, affectedIdx = c.Slot2Index, c.Slot1Index
		} else {
			continue
		}

		// Get the letter at the crossing
		placedWord := domains[placedSlotID][0].Word
		if placedIdx >= len(placedWord) {
			continue
		}
		requiredLetter := placedWord[placedIdx]

		// Filter the affected domain
		var filtered []ScoredWord
		for _, word := range domains[affectedSlotID] {
			if affectedIdx < len(word.Word) && word.Word[affectedIdx] == requiredLetter {
				filtered = append(filtered, word)
			}
		}

		if len(filtered) == 0 {
			return false // Domain wiped out
		}

		domains[affectedSlotID] = filtered
	}

	return true
}

func (gf *GridFiller) copyGrid(grid [][]rune) [][]rune {
	copy := make([][]rune, len(grid))
	for y := range grid {
		copy[y] = make([]rune, len(grid[y]))
		for x := range grid[y] {
			copy[y][x] = grid[y][x]
		}
	}
	return copy
}

func (gf *GridFiller) copyDomains(domains map[int][]ScoredWord) map[int][]ScoredWord {
	copy := make(map[int][]ScoredWord)
	for k, v := range domains {
		newSlice := make([]ScoredWord, len(v))
		for i := range v {
			newSlice[i] = v[i]
		}
		copy[k] = newSlice
	}
	return copy
}

func (gf *GridFiller) extractSolution(grid [][]rune, slots []Slot, domains map[int][]ScoredWord) []FilledSlot {
	var solution []FilledSlot

	for _, slot := range slots {
		// Extract word from grid
		var word strings.Builder
		for _, cell := range slot.Cells {
			if grid[cell.Y][cell.X] != 0 && grid[cell.Y][cell.X] != '?' {
				word.WriteRune(grid[cell.Y][cell.X])
			}
		}

		wordStr := word.String()
		score := gf.wordList.GetWordScore(wordStr)

		solution = append(solution, FilledSlot{
			Slot:  slot,
			Word:  wordStr,
			Score: score,
		})
	}

	return solution
}

// GenerateSymmetricBlackSquares generates black square positions with 180° rotational symmetry
func (gf *GridFiller) GenerateSymmetricBlackSquares(width, height int, targetDensity float64) []Position {
	// For sizes with known-good patterns, use them directly for better reliability
	// These patterns have been tested to work well with CSP filling
	defaultPattern := gf.getDefaultBlackSquarePattern(width, height)
	if len(defaultPattern) > 0 {
		return defaultPattern
	}

	// For 5x5, use no black squares
	if width == 5 && height == 5 {
		return []Position{}
	}

	maxAttempts := 100

	for attempt := 0; attempt < maxAttempts; attempt++ {
		positions := gf.generateBlackSquareCandidate(width, height, targetDensity)

		// Validate the pattern doesn't create short words or isolated cells
		if gf.validateBlackSquarePattern(positions, width, height) {
			return positions
		}
	}

	// Fallback: return empty (no black squares) if nothing else works
	return []Position{}
}

func (gf *GridFiller) generateBlackSquareCandidate(width, height int, targetDensity float64) []Position {
	var positions []Position

	// Calculate target number of black squares
	totalCells := width * height
	targetBlacks := int(float64(totalCells) * targetDensity)

	// Generate random positions with symmetry
	used := make(map[Position]bool)

	for len(positions) < targetBlacks {
		// Pick a random position in the first half
		x := gf.rng.Intn(width)
		y := gf.rng.Intn((height + 1) / 2)

		pos := Position{X: x, Y: y}
		mirrorPos := Position{X: width - 1 - x, Y: height - 1 - y}

		if used[pos] {
			continue
		}

		// Don't place black squares in corners or too close to edges for small grids
		if width <= 5 || height <= 5 {
			if (x == 0 || x == width-1) && (y == 0 || y == height-1) {
				continue
			}
		}

		positions = append(positions, pos)
		used[pos] = true

		if pos != mirrorPos {
			positions = append(positions, mirrorPos)
			used[mirrorPos] = true
		}
	}

	return positions
}

// validateBlackSquarePattern checks that a black square pattern doesn't create short words
func (gf *GridFiller) validateBlackSquarePattern(positions []Position, width, height int) bool {
	// Build a grid with black squares marked
	grid := make([][]bool, height)
	for y := 0; y < height; y++ {
		grid[y] = make([]bool, width)
	}
	for _, pos := range positions {
		if pos.Y >= 0 && pos.Y < height && pos.X >= 0 && pos.X < width {
			grid[pos.Y][pos.X] = true // true = black square
		}
	}

	// Check for short words in across direction
	for y := 0; y < height; y++ {
		runLength := 0
		for x := 0; x <= width; x++ {
			if x < width && !grid[y][x] {
				runLength++
			} else {
				if runLength > 0 && runLength < 3 {
					return false // Found a 1 or 2-letter sequence
				}
				runLength = 0
			}
		}
	}

	// Check for short words in down direction
	for x := 0; x < width; x++ {
		runLength := 0
		for y := 0; y <= height; y++ {
			if y < height && !grid[y][x] {
				runLength++
			} else {
				if runLength > 0 && runLength < 3 {
					return false // Found a 1 or 2-letter sequence
				}
				runLength = 0
			}
		}
	}

	// Check connectivity - all white cells should be reachable
	if !gf.isPatternConnected(grid, width, height) {
		return false
	}

	return true
}

// isPatternConnected checks if all white cells are connected
func (gf *GridFiller) isPatternConnected(grid [][]bool, width, height int) bool {
	visited := make([][]bool, height)
	for y := 0; y < height; y++ {
		visited[y] = make([]bool, width)
	}

	// Find first white cell
	startX, startY := -1, -1
	for y := 0; y < height && startX < 0; y++ {
		for x := 0; x < width; x++ {
			if !grid[y][x] {
				startX, startY = x, y
				break
			}
		}
	}

	if startX < 0 {
		return false // No white cells
	}

	// BFS from start
	queue := []Position{{X: startX, Y: startY}}
	visited[startY][startX] = true
	whiteCount := 0

	for len(queue) > 0 {
		pos := queue[0]
		queue = queue[1:]
		whiteCount++

		// Check neighbors
		dirs := []Position{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}
		for _, d := range dirs {
			nx, ny := pos.X+d.X, pos.Y+d.Y
			if nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx] && !visited[ny][nx] {
				visited[ny][nx] = true
				queue = append(queue, Position{X: nx, Y: ny})
			}
		}
	}

	// Count total white cells
	totalWhite := 0
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			if !grid[y][x] {
				totalWhite++
			}
		}
	}

	return whiteCount == totalWhite
}

// getDefaultBlackSquarePattern returns a known-good pattern for common sizes
// All patterns are validated to ensure no slots shorter than 3 letters
func (gf *GridFiller) getDefaultBlackSquarePattern(width, height int) []Position {
	// Default patterns that are known to work - all verified to have 3+ letter slots
	if width == 5 && height == 5 {
		// Standard 5x5 mini puzzle has NO black squares - fully open grid
		return []Position{}
	}
	if width == 7 && height == 7 {
		// 7x7 pattern - single center black creates all 3 or 7 letter slots
		// Across: Y=0-2,4-6 are 7 letters; Y=3 is 3+3 letters
		// Down: X=0-2,4-6 are 7 letters; X=3 is 3+3 letters
		return []Position{
			{X: 3, Y: 3}, // Center only
		}
	}
	if width == 9 && height == 9 {
		// 9x9 pattern - creates 3, 4, and 9 letter slots
		return []Position{
			{X: 4, Y: 4}, // Center
			{X: 3, Y: 0}, {X: 5, Y: 8}, // Top-bottom pair
			{X: 0, Y: 3}, {X: 8, Y: 5}, // Left-right pair
		}
	}
	if width == 11 && height == 11 {
		// 11x11 midi pattern - 4 corner blacks in inner square
		// Creates slots of 3 and 11 letters (well-covered by word list)
		// Blacks have 3-cell gaps to avoid 1-2 letter slots
		return []Position{
			{X: 3, Y: 3}, {X: 7, Y: 7}, // Diagonal pair
			{X: 7, Y: 3}, {X: 3, Y: 7}, // Anti-diagonal pair
		}
	}
	if width == 13 && height == 13 {
		// 13x13 pattern - creates varied slot lengths
		return []Position{
			{X: 4, Y: 4}, {X: 8, Y: 8},   // Diagonal
			{X: 8, Y: 4}, {X: 4, Y: 8},   // Anti-diagonal
			{X: 6, Y: 6},                 // Center
			{X: 0, Y: 6}, {X: 12, Y: 6},  // Side breaks
			{X: 6, Y: 0}, {X: 6, Y: 12},  // Top-bottom breaks
		}
	}
	if width == 15 && height == 15 {
		// Standard 15x15 daily pattern - creates varied slot lengths
		return []Position{
			{X: 4, Y: 4}, {X: 10, Y: 10},  // Diagonal corners
			{X: 10, Y: 4}, {X: 4, Y: 10},  // Anti-diagonal corners
			{X: 7, Y: 7},                   // Center
			{X: 0, Y: 7}, {X: 14, Y: 7},   // Side midpoints
			{X: 7, Y: 0}, {X: 7, Y: 14},   // Top-bottom midpoints
			{X: 3, Y: 3}, {X: 11, Y: 11},  // Inner diagonal
			{X: 11, Y: 3}, {X: 3, Y: 11},  // Inner anti-diagonal
		}
	}
	// Return empty for other sizes (will use full grid)
	return []Position{}
}

// ValidateGrid checks if a grid pattern is valid for crossword construction
func (gf *GridFiller) ValidateGrid(grid [][]rune, width, height int) error {
	// Check connectivity
	if !gf.isConnected(grid, width, height) {
		return fmt.Errorf("grid is not fully connected")
	}

	// Check for 2-letter words
	slots := gf.extractSlots(grid, width, height)
	for _, slot := range slots {
		if slot.Length < 3 {
			return fmt.Errorf("grid contains %d-letter word at (%d,%d)", slot.Length, slot.StartPos.X, slot.StartPos.Y)
		}
	}

	// Check that all cells are in both across and down words
	acrossCells := make(map[Position]bool)
	downCells := make(map[Position]bool)

	for _, slot := range slots {
		for _, cell := range slot.Cells {
			if slot.Direction == "across" {
				acrossCells[cell] = true
			} else {
				downCells[cell] = true
			}
		}
	}

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			if grid[y][x] == 0 {
				continue
			}
			pos := Position{X: x, Y: y}
			if !acrossCells[pos] || !downCells[pos] {
				return fmt.Errorf("cell at (%d,%d) is not fully crossed", x, y)
			}
		}
	}

	return nil
}

func (gf *GridFiller) isConnected(grid [][]rune, width, height int) bool {
	// Find first white cell
	var startX, startY int
	found := false
	for y := 0; y < height && !found; y++ {
		for x := 0; x < width && !found; x++ {
			if grid[y][x] != 0 {
				startX, startY = x, y
				found = true
			}
		}
	}

	if !found {
		return true // Empty grid is trivially connected
	}

	// BFS to find all connected cells
	visited := make(map[Position]bool)
	queue := []Position{{X: startX, Y: startY}}
	visited[queue[0]] = true

	directions := []Position{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}

	for len(queue) > 0 {
		pos := queue[0]
		queue = queue[1:]

		for _, d := range directions {
			nx, ny := pos.X+d.X, pos.Y+d.Y
			newPos := Position{X: nx, Y: ny}

			if nx >= 0 && nx < width && ny >= 0 && ny < height &&
				grid[ny][nx] != 0 && !visited[newPos] {
				visited[newPos] = true
				queue = append(queue, newPos)
			}
		}
	}

	// Count total white cells
	whiteCount := 0
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			if grid[y][x] != 0 {
				whiteCount++
			}
		}
	}

	return len(visited) == whiteCount
}
