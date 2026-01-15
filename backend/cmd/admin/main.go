package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/crossplay/backend/internal/db"
	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/internal/puzzle"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Define subcommands
	generateCmd := flag.NewFlagSet("generate", flag.ExitOnError)
	validateCmd := flag.NewFlagSet("validate", flag.ExitOnError)
	batchCmd := flag.NewFlagSet("batch", flag.ExitOnError)
	weekCmd := flag.NewFlagSet("week", flag.ExitOnError)
	publishCmd := flag.NewFlagSet("publish", flag.ExitOnError)
	listCmd := flag.NewFlagSet("list", flag.ExitOnError)
	qualityCmd := flag.NewFlagSet("quality", flag.ExitOnError)

	// Generate command flags
	genDifficulty := generateCmd.String("difficulty", "wednesday", "Difficulty level (monday-sunday)")
	genSize := generateCmd.String("size", "daily", "Grid size (mini, midi, daily, sunday)")
	genTheme := generateCmd.String("theme", "", "Optional puzzle theme")
	genOutput := generateCmd.String("output", "", "Output file path (JSON)")
	genSave := generateCmd.Bool("save", false, "Save to database")

	// Batch command flags
	batchSize := batchCmd.String("size", "daily", "Grid size")
	batchDifficulty := batchCmd.String("difficulty", "wednesday", "Difficulty level")
	batchCount := batchCmd.Int("count", 5, "Number of candidates to generate")
	batchTheme := batchCmd.String("theme", "", "Optional theme")
	batchOutput := batchCmd.String("output", "", "Output directory")

	// Week command flags
	weekStart := weekCmd.String("start", "", "Start date (YYYY-MM-DD)")
	weekOutput := weekCmd.String("output", "", "Output directory")
	weekSave := weekCmd.Bool("save", false, "Save to database")

	// Publish command flags
	publishID := publishCmd.String("id", "", "Puzzle ID to publish")
	publishDate := publishCmd.String("date", "", "Publication date (YYYY-MM-DD)")

	// List command flags
	listStatus := listCmd.String("status", "", "Filter by status (draft, approved, published)")
	listLimit := listCmd.Int("limit", 20, "Maximum results")

	// Quality command flags
	qualityFile := qualityCmd.String("file", "", "Puzzle JSON file to analyze")
	qualityID := qualityCmd.String("id", "", "Puzzle ID to analyze")

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "generate":
		generateCmd.Parse(os.Args[2:])
		runGenerate(*genDifficulty, *genSize, *genTheme, *genOutput, *genSave)

	case "validate":
		validateCmd.Parse(os.Args[2:])
		if validateCmd.NArg() < 1 {
			fmt.Println("Usage: admin validate <puzzle.json>")
			os.Exit(1)
		}
		runValidate(validateCmd.Arg(0))

	case "batch":
		batchCmd.Parse(os.Args[2:])
		runBatch(*batchSize, *batchDifficulty, *batchCount, *batchTheme, *batchOutput)

	case "week":
		weekCmd.Parse(os.Args[2:])
		runWeek(*weekStart, *weekOutput, *weekSave)

	case "publish":
		publishCmd.Parse(os.Args[2:])
		runPublish(*publishID, *publishDate)

	case "list":
		listCmd.Parse(os.Args[2:])
		runList(*listStatus, *listLimit)

	case "quality":
		qualityCmd.Parse(os.Args[2:])
		runQuality(*qualityFile, *qualityID)

	case "config":
		runConfig()

	case "help":
		printUsage()

	default:
		fmt.Printf("Unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`CrossPlay Admin CLI - Puzzle Management Tool

Usage:
  admin <command> [options]

Commands:
  generate    Generate a single puzzle
  validate    Validate a puzzle JSON file
  batch       Generate multiple puzzle candidates
  week        Generate puzzles for an entire week
  publish     Publish a draft puzzle
  list        List puzzles in the database
  quality     Analyze puzzle quality
  config      Show current configuration

Examples:
  admin generate -difficulty monday -size mini -output puzzle.json
  admin batch -size daily -difficulty friday -count 10 -output ./puzzles/
  admin week -start 2024-01-01 -save
  admin quality -file puzzle.json
  admin publish -id abc123 -date 2024-01-15
  admin config

Generation Method:
  Uses dictionary-based generation with CSP algorithm.
  No external LLM API required.

Database Configuration:
  DATABASE_URL       PostgreSQL connection string (for save/publish)
  REDIS_URL          Redis connection string (optional)`)
}

func getAPIKey() string {
	// API key is no longer required - dictionary-based generation doesn't use LLM
	return ""
}

func runConfig() {
	fmt.Println("CrossPlay Puzzle Generator Configuration")
	fmt.Println("=========================================")
	fmt.Println()
	fmt.Println("Generation Mode: Dictionary-based (no LLM required)")
	fmt.Println()
	fmt.Println("The puzzle generator uses:")
	fmt.Println("  - CSP (Constraint Satisfaction) algorithm for grid filling")
	fmt.Println("  - Built-in word list with quality scores")
	fmt.Println("  - Dictionary definitions for clue generation")
	fmt.Println("  - Free Dictionary API for additional definitions")
	fmt.Println("  - Datamuse API for synonyms and word patterns")
	fmt.Println()
	fmt.Println("Database Configuration:")
	fmt.Printf("  DATABASE_URL=%s\n", os.Getenv("DATABASE_URL"))
	fmt.Printf("  REDIS_URL=%s\n", os.Getenv("REDIS_URL"))
}

func getDatabase() *db.Database {
	postgresURL := os.Getenv("DATABASE_URL")
	if postgresURL == "" {
		postgresURL = "postgres://postgres:postgres@localhost:5432/crossplay?sslmode=disable"
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	database, err := db.New(postgresURL, redisURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	return database
}

func runGenerate(difficulty, size, theme, output string, save bool) {
	apiKey := getAPIKey()

	fmt.Printf("Generating %s puzzle (size: %s, difficulty: %s)...\n", size, size, difficulty)
	if theme != "" {
		fmt.Printf("Theme: %s\n", theme)
	}

	config := puzzle.DefaultPipelineConfig()
	pipeline := puzzle.NewProductionPipeline(apiKey, config)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	req := &puzzle.BatchGenerationRequest{
		Size:       size,
		Difficulty: parseDifficulty(difficulty),
		Theme:      theme,
	}

	result, err := pipeline.GenerateBatch(ctx, req)
	if err != nil {
		log.Fatalf("Generation failed: %v", err)
	}

	if result.BestPuzzle == nil {
		log.Fatal("No valid puzzle was generated")
	}

	fmt.Printf("\nGeneration complete!\n")
	fmt.Printf("Candidates generated: %d\n", len(result.Generated))
	fmt.Printf("Success rate: %.1f%%\n", result.SuccessRate*100)
	fmt.Printf("Total time: %v\n", result.TotalTime)
	fmt.Printf("\nBest puzzle score: %.1f\n", result.BestPuzzle.QualityReport.OverallScore)

	printQualityReport(result.BestPuzzle.QualityReport)

	// Output to file
	if output != "" {
		data, err := json.MarshalIndent(result.BestPuzzle.Puzzle, "", "  ")
		if err != nil {
			log.Fatalf("Failed to marshal puzzle: %v", err)
		}
		if err := os.WriteFile(output, data, 0644); err != nil {
			log.Fatalf("Failed to write file: %v", err)
		}
		fmt.Printf("\nPuzzle saved to: %s\n", output)
	}

	// Save to database
	if save {
		database := getDatabase()
		defer database.Close()

		if err := database.CreatePuzzle(result.BestPuzzle.Puzzle); err != nil {
			log.Fatalf("Failed to save to database: %v", err)
		}
		fmt.Printf("Puzzle saved to database with ID: %s\n", result.BestPuzzle.Puzzle.ID)
	}
}

func runValidate(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var puzzleData models.Puzzle
	if err := json.Unmarshal(data, &puzzleData); err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	wordList := puzzle.NewWordListService()
	scorer := puzzle.NewQualityScorer(wordList)
	report := scorer.ScorePuzzle(&puzzleData)

	fmt.Printf("Validation Results for: %s\n", filename)
	fmt.Printf("=================================\n\n")

	printQualityReport(report)
}

func runBatch(size, difficulty string, count int, theme, output string) {
	apiKey := getAPIKey()

	fmt.Printf("Generating %d puzzle candidates...\n", count)
	fmt.Printf("Size: %s, Difficulty: %s\n", size, difficulty)
	if theme != "" {
		fmt.Printf("Theme: %s\n", theme)
	}

	config := puzzle.DefaultPipelineConfig()
	config.CandidatesPerBatch = count
	pipeline := puzzle.NewProductionPipeline(apiKey, config)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(count)*time.Minute)
	defer cancel()

	req := &puzzle.BatchGenerationRequest{
		Size:       size,
		Difficulty: parseDifficulty(difficulty),
		Theme:      theme,
	}

	result, err := pipeline.GenerateBatch(ctx, req)
	if err != nil {
		log.Fatalf("Batch generation failed: %v", err)
	}

	fmt.Printf("\nBatch Generation Complete!\n")
	fmt.Printf("==========================\n")
	fmt.Printf("Successfully generated: %d/%d\n", len(result.Generated), count)
	fmt.Printf("Success rate: %.1f%%\n", result.SuccessRate*100)
	fmt.Printf("Total time: %v\n", result.TotalTime)

	if len(result.Errors) > 0 {
		fmt.Printf("\nErrors:\n")
		for _, err := range result.Errors {
			fmt.Printf("  - %s\n", err)
		}
	}

	fmt.Printf("\nCandidate Scores:\n")
	for i, p := range result.Generated {
		marker := ""
		if i == 0 {
			marker = " (BEST)"
		}
		fmt.Printf("  %d. Score: %.1f, Valid: %v%s\n",
			i+1, p.QualityReport.OverallScore, p.QualityReport.Valid, marker)
	}

	// Save to output directory
	if output != "" {
		if err := os.MkdirAll(output, 0755); err != nil {
			log.Fatalf("Failed to create output directory: %v", err)
		}

		for i, p := range result.Generated {
			filename := fmt.Sprintf("%s/puzzle_%02d.json", output, i+1)
			data, _ := json.MarshalIndent(p.Puzzle, "", "  ")
			os.WriteFile(filename, data, 0644)
		}
		fmt.Printf("\nPuzzles saved to: %s/\n", output)
	}
}

func runWeek(startDate, output string, save bool) {
	apiKey := getAPIKey()

	var start time.Time
	var err error

	if startDate == "" {
		// Default to next Monday
		now := time.Now()
		daysUntilMonday := (8 - int(now.Weekday())) % 7
		if daysUntilMonday == 0 {
			daysUntilMonday = 7
		}
		start = now.AddDate(0, 0, daysUntilMonday)
	} else {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			log.Fatalf("Invalid date format: %v", err)
		}
	}

	fmt.Printf("Generating puzzles for week starting: %s\n", start.Format("2006-01-02"))
	fmt.Println("This may take several minutes...")

	config := puzzle.DefaultPipelineConfig()
	pipeline := puzzle.NewProductionPipeline(apiKey, config)
	schedule := puzzle.NewDailyProductionSchedule(pipeline)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	results, err := schedule.GenerateWeek(ctx, start)
	if err != nil {
		log.Fatalf("Week generation failed: %v", err)
	}

	fmt.Printf("\nWeek Generation Complete!\n")
	fmt.Printf("=========================\n")

	var database *db.Database
	if save {
		database = getDatabase()
		defer database.Close()
	}

	for date, result := range results {
		if result.BestPuzzle == nil {
			fmt.Printf("%s: FAILED\n", date)
			continue
		}

		fmt.Printf("%s: Score %.1f (%d candidates)\n",
			date, result.BestPuzzle.QualityReport.OverallScore, len(result.Generated))

		// Save to database
		if save && database != nil {
			result.BestPuzzle.Puzzle.Status = "draft"
			if err := database.CreatePuzzle(result.BestPuzzle.Puzzle); err != nil {
				fmt.Printf("  Warning: Failed to save to database: %v\n", err)
			} else {
				fmt.Printf("  Saved with ID: %s\n", result.BestPuzzle.Puzzle.ID)
			}
		}

		// Save to files
		if output != "" {
			if err := os.MkdirAll(output, 0755); err == nil {
				filename := fmt.Sprintf("%s/%s.json", output, date)
				data, _ := json.MarshalIndent(result.BestPuzzle.Puzzle, "", "  ")
				os.WriteFile(filename, data, 0644)
			}
		}
	}

	stats := schedule.GetArchiveStats()
	fmt.Printf("\nArchive Statistics:\n")
	fmt.Printf("  Total puzzles: %d\n", stats.TotalPuzzles)
	fmt.Printf("  Average score: %.1f\n", stats.AverageScore)
	fmt.Printf("  Highest score: %.1f\n", stats.HighestScore)
	fmt.Printf("  Lowest score: %.1f\n", stats.LowestScore)
}

func runPublish(id, date string) {
	if id == "" {
		log.Fatal("Puzzle ID is required (-id)")
	}

	database := getDatabase()
	defer database.Close()

	// Get puzzle
	puzzleData, err := database.GetPuzzleByID(id)
	if err != nil {
		log.Fatalf("Failed to get puzzle: %v", err)
	}
	if puzzleData == nil {
		log.Fatal("Puzzle not found")
	}

	fmt.Printf("Publishing puzzle: %s\n", puzzleData.Title)
	fmt.Printf("Current status: %s\n", puzzleData.Status)

	// Set publication date
	if date != "" {
		puzzleData.Date = &date
	}

	// Update status
	puzzleData.Status = "published"
	now := time.Now()
	puzzleData.PublishedAt = &now

	if err := database.UpdatePuzzle(puzzleData); err != nil {
		log.Fatalf("Failed to publish: %v", err)
	}

	fmt.Printf("Puzzle published successfully!\n")
	if date != "" {
		fmt.Printf("Publication date: %s\n", date)
	}
}

func runList(status string, limit int) {
	database := getDatabase()
	defer database.Close()

	puzzles, err := database.GetPuzzleArchive(status, limit, 0)
	if err != nil {
		log.Fatalf("Failed to list puzzles: %v", err)
	}

	if len(puzzles) == 0 {
		fmt.Println("No puzzles found")
		return
	}

	fmt.Printf("Found %d puzzles:\n\n", len(puzzles))
	fmt.Printf("%-36s %-20s %-10s %-10s %-10s\n", "ID", "Title", "Difficulty", "Status", "Date")
	fmt.Println(strings.Repeat("-", 90))

	for _, p := range puzzles {
		date := "N/A"
		if p.Date != nil {
			date = *p.Date
		}
		fmt.Printf("%-36s %-20s %-10s %-10s %-10s\n",
			p.ID,
			truncate(p.Title, 20),
			p.Difficulty,
			p.Status,
			date)
	}
}

func runQuality(file, id string) {
	var puzzleData *models.Puzzle

	if file != "" {
		data, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read file: %v", err)
		}

		puzzleData = &models.Puzzle{}
		if err := json.Unmarshal(data, puzzleData); err != nil {
			log.Fatalf("Failed to parse JSON: %v", err)
		}
	} else if id != "" {
		database := getDatabase()
		defer database.Close()

		var err error
		puzzleData, err = database.GetPuzzleByID(id)
		if err != nil {
			log.Fatalf("Failed to get puzzle: %v", err)
		}
		if puzzleData == nil {
			log.Fatal("Puzzle not found")
		}
	} else {
		log.Fatal("Either -file or -id is required")
	}

	wordList := puzzle.NewWordListService()
	scorer := puzzle.NewQualityScorer(wordList)
	report := scorer.ScorePuzzle(puzzleData)

	fmt.Printf("Quality Analysis: %s\n", puzzleData.Title)
	fmt.Printf("=================================\n\n")

	printQualityReport(report)

	// Check against thresholds
	fmt.Printf("\nThreshold Check:\n")
	defaultThresholds := puzzle.DefaultThresholds()
	highThresholds := puzzle.HighQualityThresholds()

	if scorer.MeetsThresholds(report, defaultThresholds) {
		fmt.Println("  ✓ Meets default quality thresholds")
	} else {
		fmt.Println("  ✗ Does NOT meet default quality thresholds")
	}

	if scorer.MeetsThresholds(report, highThresholds) {
		fmt.Println("  ✓ Meets high quality thresholds (premium)")
	} else {
		fmt.Println("  ✗ Does NOT meet high quality thresholds")
	}
}

func printQualityReport(report *puzzle.QualityReport) {
	fmt.Printf("Overall Score: %.1f/100\n", report.OverallScore)
	fmt.Printf("Valid: %v\n\n", report.Valid)

	if len(report.Errors) > 0 {
		fmt.Println("ERRORS:")
		for _, err := range report.Errors {
			fmt.Printf("  ✗ %s\n", err)
		}
		fmt.Println()
	}

	if len(report.Warnings) > 0 {
		fmt.Println("WARNINGS:")
		for _, w := range report.Warnings {
			fmt.Printf("  ⚠ %s\n", w)
		}
		fmt.Println()
	}

	fmt.Println("METRICS:")
	fmt.Printf("  Average word score: %.1f\n", report.Metrics.AverageWordScore)
	fmt.Printf("  Average word length: %.2f\n", report.Metrics.AverageWordLength)
	fmt.Printf("  3-letter word percent: %.1f%%\n", report.Metrics.ThreeLetterWordPercent)
	fmt.Printf("  Crosswordese percent: %.1f%%\n", report.Metrics.CrosswordesePercent)
	fmt.Printf("  Black square percent: %.1f%%\n", report.Metrics.BlackSquarePercent)
	fmt.Printf("  Total words: %d\n", report.Metrics.TotalWords)
	fmt.Printf("  Unique letters: %d\n", report.Metrics.UniqueLetters)
	fmt.Printf("  Symmetry: %s\n", report.Metrics.SymmetryType)
	fmt.Println()

	fmt.Println("GRID ANALYSIS:")
	fmt.Printf("  Rotational symmetry: %v\n", report.GridAnalysis.HasRotationalSymmetry)
	fmt.Printf("  Fully connected: %v\n", report.GridAnalysis.IsFullyConnected)
	fmt.Printf("  All cells crossed: %v\n", report.GridAnalysis.AllCellsCrossed)
	if len(report.GridAnalysis.ObscureCrossings) > 0 {
		fmt.Printf("  Obscure crossings: %v\n", report.GridAnalysis.ObscureCrossings)
	}
	fmt.Println()

	if len(report.Recommendations) > 0 {
		fmt.Println("RECOMMENDATIONS:")
		for _, rec := range report.Recommendations {
			fmt.Printf("  → %s\n", rec)
		}
	}
}

func parseDifficulty(s string) puzzle.DayDifficulty {
	s = strings.ToLower(s)
	switch s {
	case "monday":
		return puzzle.DayMonday
	case "tuesday":
		return puzzle.DayTuesday
	case "wednesday":
		return puzzle.DayWednesday
	case "thursday":
		return puzzle.DayThursday
	case "friday":
		return puzzle.DayFriday
	case "saturday":
		return puzzle.DaySaturday
	case "sunday":
		return puzzle.DaySunday
	default:
		return puzzle.DayWednesday
	}
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
