package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/crossplay/backend/internal/models"
	"github.com/crossplay/backend/pkg/output"
	"github.com/spf13/cobra"
)

var (
	convertInput  string
	convertOutput string
	convertFormat string
)

var convertCmd = &cobra.Command{
	Use:   "convert",
	Short: "Convert puzzles between different formats",
	Long: `Convert crossword puzzles between different file formats.

Supported formats:
  - json: Crossy JSON format
  - puz: Across Lite .puz binary format
  - ipuz: ipuz JSON format (modern web standard)

Examples:
  # Convert JSON to .puz format
  crossgen convert --input puzzle.json --output puzzle.puz --format puz

  # Convert .puz to ipuz format
  crossgen convert --input puzzle.puz --output puzzle.ipuz --format ipuz`,
	RunE: runConvert,
}

func init() {
	rootCmd.AddCommand(convertCmd)

	convertCmd.Flags().StringVarP(&convertInput, "input", "i", "", "input puzzle file (required)")
	convertCmd.Flags().StringVarP(&convertOutput, "output", "o", "", "output file path (required)")
	convertCmd.Flags().StringVarP(&convertFormat, "format", "f", "", "target format: json, puz, or ipuz (required)")

	convertCmd.MarkFlagRequired("input")
	convertCmd.MarkFlagRequired("output")
	convertCmd.MarkFlagRequired("format")
}

func runConvert(cmd *cobra.Command, args []string) error {
	if verbosity > 0 {
		fmt.Printf("Converting: %s -> %s\n", convertInput, convertOutput)
		fmt.Printf("Target format: %s\n", convertFormat)
	}

	// Validate target format
	targetFormat := strings.ToLower(convertFormat)
	if targetFormat != "json" && targetFormat != "puz" && targetFormat != "ipuz" {
		return fmt.Errorf("unsupported format '%s': must be json, puz, or ipuz", convertFormat)
	}

	// Read input file
	inputData, err := os.ReadFile(convertInput)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}

	// Detect input format and parse
	var puzzle *models.Puzzle
	inputExt := strings.ToLower(filepath.Ext(convertInput))

	switch inputExt {
	case ".json":
		if verbosity > 0 {
			fmt.Println("Detected JSON input format")
		}
		puzzle, err = output.FromJSON(inputData)
		if err != nil {
			return fmt.Errorf("failed to parse JSON puzzle: %w", err)
		}

	case ".ipuz":
		if verbosity > 0 {
			fmt.Println("Detected ipuz input format")
		}
		puzzle, err = output.FromIPuz(inputData)
		if err != nil {
			return fmt.Errorf("failed to parse ipuz puzzle: %w", err)
		}

	case ".puz":
		return fmt.Errorf("parsing .puz files is not yet supported; please convert from json or ipuz format")

	default:
		// Try to auto-detect by attempting to parse as JSON first, then ipuz
		if verbosity > 0 {
			fmt.Println("Unknown file extension, attempting to auto-detect format...")
		}

		puzzle, err = output.FromJSON(inputData)
		if err != nil {
			// Try ipuz
			puzzle, err = output.FromIPuz(inputData)
			if err != nil {
				return fmt.Errorf("failed to auto-detect input format: not a valid JSON or ipuz file")
			}
			if verbosity > 0 {
				fmt.Println("Auto-detected ipuz format")
			}
		} else {
			if verbosity > 0 {
				fmt.Println("Auto-detected JSON format")
			}
		}
	}

	// Convert to target format
	var outputData []byte
	switch targetFormat {
	case "json":
		outputData, err = output.ToJSON(puzzle)
		if err != nil {
			return fmt.Errorf("failed to convert to JSON: %w", err)
		}

	case "puz":
		outputData, err = output.FormatPuz(puzzle)
		if err != nil {
			return fmt.Errorf("failed to convert to .puz: %w", err)
		}

	case "ipuz":
		outputData, err = output.ToIPuz(puzzle)
		if err != nil {
			return fmt.Errorf("failed to convert to ipuz: %w", err)
		}
	}

	// Write output file
	if err := os.WriteFile(convertOutput, outputData, 0644); err != nil {
		return fmt.Errorf("failed to write output file: %w", err)
	}

	fmt.Printf("Successfully converted %s to %s format\n", convertInput, targetFormat)
	if verbosity > 0 {
		fmt.Printf("Output written to: %s\n", convertOutput)
	}

	return nil
}
