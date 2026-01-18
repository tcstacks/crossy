package grid

import (
	"errors"
	"time"
)

// Difficulty represents the difficulty level of a crossword puzzle
type Difficulty string

const (
	// Easy difficulty has fewer black squares (easier to fill)
	Easy Difficulty = "easy"
	// Medium difficulty has a moderate number of black squares
	Medium Difficulty = "medium"
	// Hard difficulty has more black squares
	Hard Difficulty = "hard"
	// Expert difficulty has the most black squares (harder to fill)
	Expert Difficulty = "expert"
)

// ErrGenerationFailed is returned when grid generation fails after max attempts
var ErrGenerationFailed = errors.New("failed to generate valid grid after maximum attempts")

// MaxGenerationAttempts is the maximum number of attempts to generate a valid grid
const MaxGenerationAttempts = 1000

// GeneratorConfig extends GridConfig with generation parameters
type GeneratorConfig struct {
	GridConfig
	Difficulty   Difficulty // Difficulty preset (Easy/Medium/Hard/Expert)
	BlackDensity float64    // Custom black density (overrides difficulty if set)
	Seed         int64      // Random seed (0 = use timestamp)
}

// getDifficultyDensity maps difficulty levels to black square density percentages
// Note: These are conservative values optimized for random placement algorithms
// which create 2-letter words more easily than manual or constraint-based placement.
func getDifficultyDensity(difficulty Difficulty) float64 {
	switch difficulty {
	case Easy:
		return 0.06 // 6% black squares - very sparse, easier to avoid short words
	case Medium:
		return 0.08 // 8% black squares - balanced
	case Hard:
		return 0.10 // 10% black squares - more constrained
	case Expert:
		return 0.12 // 12% black squares - most constrained
	default:
		return 0.08 // Default to medium
	}
}

// Generate creates a valid empty crossword grid based on the provided configuration.
// It attempts to generate a grid up to MaxGenerationAttempts times, retrying with
// a new seed if validation fails.
//
// The generation process:
// 1. Create empty grid with specified size
// 2. Seed black squares randomly in top-left quadrant
// 3. Enforce 180-degree rotational symmetry
// 4. Validate grid connectivity (all white cells reachable)
// 5. Validate minimum word length (no words shorter than 3 letters)
// 6. Compute word entry slots
//
// Parameters:
//   - config: Configuration for grid generation including size, difficulty, and seed
//
// Returns:
//   - *Grid: A valid generated grid with computed entries
//   - error: ErrGenerationFailed if unable to generate valid grid after max attempts
func Generate(config GeneratorConfig) (*Grid, error) {
	// Determine black density from difficulty or use custom value
	blackDensity := config.BlackDensity
	if blackDensity == 0 {
		blackDensity = getDifficultyDensity(config.Difficulty)
	}

	// Use provided seed, or generate one from current time
	seed := config.Seed
	if seed == 0 {
		seed = time.Now().UnixNano()
	}

	// Attempt to generate a valid grid
	for attempt := 0; attempt < MaxGenerationAttempts; attempt++ {
		// Create a new empty grid
		grid := NewEmptyGrid(config.GridConfig)

		// Configure seeding with current attempt's seed
		seedConfig := SeedConfig{
			Seed:         seed + int64(attempt), // Increment seed for each attempt
			BlackDensity: blackDensity,
		}

		// Step 1: Seed black squares in top-left quadrant
		seedBlackSquares(grid, seedConfig)

		// Step 2: Enforce 180-degree rotational symmetry
		enforceSymmetry(grid)

		// Step 3: Validate grid connectivity
		if !isConnected(grid) {
			continue // Retry with next seed
		}

		// Step 4: Validate word lengths
		if hasShortWords(grid) {
			continue // Retry with next seed
		}

		// Step 5: Compute entry slots
		computeEntries(grid)

		// Grid is valid, return it
		return grid, nil
	}

	// Failed to generate a valid grid after max attempts
	return nil, ErrGenerationFailed
}
