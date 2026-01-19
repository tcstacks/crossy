package puzzle

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/crossplay/backend/pkg/clues"
	"github.com/crossplay/backend/pkg/fill"
	"github.com/crossplay/backend/pkg/grid"
	"github.com/google/uuid"
)

var (
	// ErrGridGenerationFailed is returned when grid generation fails
	ErrGridGenerationFailed = errors.New("grid generation failed")
	// ErrFillFailed is returned when grid filling fails
	ErrFillFailed = errors.New("grid fill failed")
	// ErrClueGenerationFailed is returned when clue generation fails
	ErrClueGenerationFailed = errors.New("clue generation failed")
	// ErrInvalidConfig is returned when the configuration is invalid
	ErrInvalidConfig = errors.New("invalid configuration")
)

// Config holds configuration for puzzle generation
type Config struct {
	// Grid generation config
	Size       int             // Grid size (e.g., 15 for 15x15)
	Difficulty grid.Difficulty // Difficulty level (Easy/Medium/Hard/Expert)
	Seed       int64           // Random seed for reproducibility (0 = random)

	// Fill config
	MinScore   int // Minimum word quality score (default 50)
	MaxRetries int // Maximum fill retries (default 100)

	// Metadata
	Title  string // Puzzle title (optional, will use default if empty)
	Author string // Puzzle author (optional, will use default if empty)
	Theme  string // Puzzle theme (optional)
}

// Generator orchestrates the complete puzzle generation pipeline
type Generator struct {
	wordlist      fill.Wordlist
	clueGenerator *clues.Generator
}

// NewGenerator creates a new puzzle generator
func NewGenerator(wordlist fill.Wordlist, clueGenerator *clues.Generator) *Generator {
	return &Generator{
		wordlist:      wordlist,
		clueGenerator: clueGenerator,
	}
}

// GeneratePuzzle orchestrates the complete puzzle generation pipeline:
// 1. Generate a valid grid with black squares and entries
// 2. Fill the grid with words from the wordlist
// 3. Generate clues for all filled entries
// 4. Return a complete Puzzle ready for export
//
// This function handles errors from any pipeline stage and wraps them
// with appropriate context.
func (g *Generator) GeneratePuzzle(ctx context.Context, config Config) (*Puzzle, error) {
	// Validate configuration
	if err := validateConfig(config); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidConfig, err)
	}

	// Set defaults
	config = setDefaults(config)

	// Step 1: Generate grid
	gridConfig := grid.GeneratorConfig{
		GridConfig: grid.GridConfig{
			Size: config.Size,
		},
		Difficulty: config.Difficulty,
		Seed:       config.Seed,
	}

	generatedGrid, err := grid.Generate(gridConfig)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrGridGenerationFailed, err)
	}

	// Step 2: Fill grid with words
	fillConfig := fill.FillConfig{
		MinScore:   config.MinScore,
		MaxRetries: config.MaxRetries,
	}

	err = fill.Fill(generatedGrid, g.wordlist, fillConfig)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrFillFailed, err)
	}

	// Step 3: Generate clues for all entries
	cluesMap, err := g.clueGenerator.GenerateClues(ctx, generatedGrid.Entries)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrClueGenerationFailed, err)
	}

	// Step 4: Create puzzle metadata
	metadata := Metadata{
		ID:         uuid.New().String(),
		Title:      config.Title,
		Author:     config.Author,
		Difficulty: config.Difficulty,
		Theme:      config.Theme,
		CreatedAt:  time.Now(),
	}

	// Step 5: Assemble complete puzzle
	puzzle := NewPuzzle(generatedGrid, cluesMap, metadata)

	return puzzle, nil
}

// validateConfig validates the puzzle generation configuration
func validateConfig(config Config) error {
	if config.Size < 5 || config.Size > 25 {
		return errors.New("grid size must be between 5 and 25")
	}

	validDifficulty := false
	for _, d := range []grid.Difficulty{grid.Easy, grid.Medium, grid.Hard, grid.Expert} {
		if config.Difficulty == d {
			validDifficulty = true
			break
		}
	}
	if !validDifficulty {
		return errors.New("invalid difficulty level")
	}

	return nil
}

// setDefaults sets default values for optional configuration fields
func setDefaults(config Config) Config {
	if config.Size == 0 {
		config.Size = 15 // Standard crossword size
	}

	if config.MinScore == 0 {
		config.MinScore = 50
	}

	if config.MaxRetries == 0 {
		config.MaxRetries = 100
	}

	if config.Title == "" {
		config.Title = fmt.Sprintf("Crossword Puzzle - %s", time.Now().Format("2006-01-02"))
	}

	if config.Author == "" {
		config.Author = "Crossy Generator"
	}

	return config
}
