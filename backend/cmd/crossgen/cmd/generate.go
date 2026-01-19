package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/pkg/clues"
	"github.com/crossplay/backend/pkg/clues/providers"
	"github.com/crossplay/backend/pkg/grid"
	"github.com/crossplay/backend/pkg/output"
	"github.com/crossplay/backend/pkg/puzzle"
	"github.com/crossplay/backend/pkg/wordlist"
	_ "github.com/mattn/go-sqlite3"
	"github.com/spf13/cobra"
)

var (
	genCount      int
	genDifficulty string
	genOutput     string
	genFormat     string
	genWordlist   string
	genLLM        string
)

var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Generate crossword puzzles",
	Long: `Generate one or more crossword puzzles using constraint satisfaction and LLM-generated clues.

Examples:
  # Generate 10 easy puzzles in JSON format
  crossgen generate --count 10 --difficulty easy --format json --output ./puzzles

  # Generate a single hard puzzle in all formats
  crossgen generate --difficulty hard --format all --output ./puzzle.json

  # Generate using cache-only mode (no LLM API calls)
  crossgen generate --llm cache-only --count 5`,
	RunE: runGenerate,
}

func init() {
	rootCmd.AddCommand(generateCmd)

	generateCmd.Flags().IntVarP(&genCount, "count", "n", 1, "number of puzzles to generate")
	generateCmd.Flags().StringVarP(&genDifficulty, "difficulty", "d", "medium", "puzzle difficulty (easy, medium, hard, expert)")
	generateCmd.Flags().StringVarP(&genOutput, "output", "o", ".", "output directory or file path")
	generateCmd.Flags().StringVarP(&genFormat, "format", "f", "json", "output format (json, puz, ipuz, all)")
	generateCmd.Flags().StringVarP(&genWordlist, "wordlist", "w", "", "path to wordlist file (Peter Broda format)")
	generateCmd.Flags().StringVarP(&genLLM, "llm", "l", "anthropic", "LLM provider (anthropic, ollama, cache-only)")
}

func runGenerate(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Validate and parse parameters
	difficulty, err := parseDifficulty(genDifficulty)
	if err != nil {
		return fmt.Errorf("invalid difficulty: %w", err)
	}

	formats, err := parseFormats(genFormat)
	if err != nil {
		return fmt.Errorf("invalid format: %w", err)
	}

	// Load wordlist
	if genWordlist == "" {
		return fmt.Errorf("--wordlist flag is required")
	}

	if verbosity > 0 {
		fmt.Printf("Loading wordlist from: %s\n", genWordlist)
	}

	wl, err := wordlist.LoadBrodaWordlist(genWordlist)
	if err != nil {
		return fmt.Errorf("failed to load wordlist: %w", err)
	}

	if verbosity > 0 {
		fmt.Printf("Loaded %d words\n", wl.Size())
	}

	// Set up clue generator
	clueGen, err := setupClueGenerator(genLLM, difficulty)
	if err != nil {
		return fmt.Errorf("failed to setup clue generator: %w", err)
	}

	// Create puzzle generator
	puzzleGen := puzzle.NewGenerator(wl, clueGen)

	// Create output directory if needed
	if err := os.MkdirAll(genOutput, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate puzzles with progress tracking
	fmt.Printf("Generating %d puzzle(s) with difficulty: %s\n", genCount, genDifficulty)

	for i := 1; i <= genCount; i++ {
		startTime := time.Now()

		// Show progress
		fmt.Printf("[%d/%d] Generating puzzle... ", i, genCount)

		// Generate puzzle
		puzzleConfig := puzzle.Config{
			Size:       15,
			Difficulty: difficulty,
			Seed:       0, // Random
			MinScore:   50,
			MaxRetries: 100,
			Title:      fmt.Sprintf("Crossword Puzzle %d - %s", i, time.Now().Format("2006-01-02")),
			Author:     "Crossy Generator",
			Theme:      "",
		}

		puz, err := puzzleGen.GeneratePuzzle(ctx, puzzleConfig)
		if err != nil {
			fmt.Printf("FAILED\n")
			return fmt.Errorf("failed to generate puzzle %d: %w", i, err)
		}

		// Convert to models.Puzzle for output formatters
		modelsPuzzle := puzzle.ToModelsPuzzle(puz)

		// Write output files
		if err := writeOutputFiles(modelsPuzzle, genOutput, i, formats); err != nil {
			fmt.Printf("FAILED\n")
			return fmt.Errorf("failed to write output files for puzzle %d: %w", i, err)
		}

		elapsed := time.Since(startTime)
		fmt.Printf("OK (%.1fs)\n", elapsed.Seconds())
	}

	fmt.Printf("\nSuccessfully generated %d puzzle(s) in %s\n", genCount, genOutput)
	return nil
}

// parseDifficulty converts string difficulty to grid.Difficulty
func parseDifficulty(diff string) (grid.Difficulty, error) {
	switch strings.ToLower(diff) {
	case "easy":
		return grid.Easy, nil
	case "medium":
		return grid.Medium, nil
	case "hard":
		return grid.Hard, nil
	case "expert":
		return grid.Expert, nil
	default:
		return grid.Medium, fmt.Errorf("invalid difficulty: %s (must be easy, medium, hard, or expert)", diff)
	}
}

// parseFormats converts format string to list of formats
func parseFormats(format string) ([]string, error) {
	format = strings.ToLower(format)
	if format == "all" {
		return []string{"json", "puz", "ipuz"}, nil
	}

	validFormats := map[string]bool{
		"json":  true,
		"puz":   true,
		"ipuz":  true,
	}

	if !validFormats[format] {
		return nil, fmt.Errorf("invalid format: %s (must be json, puz, ipuz, or all)", format)
	}

	return []string{format}, nil
}

// setupClueGenerator creates a clue generator based on the LLM provider
func setupClueGenerator(llmProvider string, difficulty grid.Difficulty) (*clues.Generator, error) {
	// Open clue cache database
	cacheDB, err := sql.Open("sqlite3", "./clue_cache.db")
	if err != nil {
		return nil, fmt.Errorf("failed to open cache database: %w", err)
	}

	cache, err := clues.NewClueCache(cacheDB)
	if err != nil {
		return nil, fmt.Errorf("failed to create clue cache: %w", err)
	}

	// Convert grid.Difficulty to clues.Difficulty
	var clueDifficulty clues.Difficulty
	switch difficulty {
	case grid.Easy:
		clueDifficulty = clues.DifficultyEasy
	case grid.Medium:
		clueDifficulty = clues.DifficultyMedium
	case grid.Hard, grid.Expert:
		clueDifficulty = clues.DifficultyHard
	default:
		clueDifficulty = clues.DifficultyMedium
	}

	// Set up LLM client based on provider
	var llmClient providers.LLMClient
	switch strings.ToLower(llmProvider) {
	case "cache-only":
		llmClient = nil // No LLM, only use cache
	case "anthropic":
		apiKey := os.Getenv("ANTHROPIC_API_KEY")
		if apiKey == "" {
			return nil, fmt.Errorf("ANTHROPIC_API_KEY environment variable not set")
		}
		var clientErr error
		llmClient, clientErr = providers.NewAnthropicClient(providers.AnthropicConfig{
			APIKey: apiKey,
			Model:  providers.ModelHaiku,
		})
		if clientErr != nil {
			return nil, fmt.Errorf("failed to create Anthropic client: %w", clientErr)
		}
	case "ollama":
		var clientErr error
		llmClient, clientErr = providers.NewOllamaClient(providers.OllamaConfig{
			BaseURL: "http://localhost:11434/api/generate",
			Model:   providers.ModelLlama2,
		})
		if clientErr != nil {
			return nil, fmt.Errorf("failed to create Ollama client: %w", clientErr)
		}
	default:
		return nil, fmt.Errorf("invalid LLM provider: %s (must be anthropic, ollama, or cache-only)", llmProvider)
	}

	return clues.NewGenerator(cache, llmClient, clueDifficulty), nil
}

// writeOutputFiles writes puzzle to disk in the specified formats
func writeOutputFiles(puz *models.Puzzle, outputDir string, puzzleNum int, formats []string) error {
	baseName := fmt.Sprintf("puzzle_%03d", puzzleNum)

	for _, format := range formats {
		var filePath string
		var data []byte
		var err error

		switch format {
		case "json":
			filePath = filepath.Join(outputDir, baseName+".json")
			data, err = output.ToJSON(puz)
		case "puz":
			filePath = filepath.Join(outputDir, baseName+".puz")
			data, err = output.FormatPuz(puz)
		case "ipuz":
			filePath = filepath.Join(outputDir, baseName+".ipuz")
			data, err = output.ToIPuz(puz)
		default:
			return fmt.Errorf("unsupported format: %s", format)
		}

		if err != nil {
			return fmt.Errorf("failed to format puzzle as %s: %w", format, err)
		}

		if err := os.WriteFile(filePath, data, 0644); err != nil {
			return fmt.Errorf("failed to write %s file: %w", format, err)
		}
	}

	return nil
}
