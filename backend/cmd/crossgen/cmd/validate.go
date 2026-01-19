package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/crossplay/backend/pkg/grid"
	"github.com/spf13/cobra"
)

// clueData represents a clue in the JSON file
type clueData struct {
	Number int    `json:"number"`
	Text   string `json:"text"`
	Answer string `json:"answer"`
	Length int    `json:"length"`
}

var (
	validateInput string
)

var validateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validate crossword puzzle files",
	Long: `Validate one or more crossword puzzle files for correctness.

Checks include:
  - Grid symmetry (180-degree rotational)
  - Grid connectivity (all white cells reachable)
  - Minimum word length requirements
  - Clue completeness
  - Format correctness

Examples:
  # Validate a single puzzle file
  crossgen validate --input puzzle.json

  # Validate all puzzles in a directory
  crossgen validate --input ./puzzles`,
	RunE: runValidate,
}

func init() {
	rootCmd.AddCommand(validateCmd)

	validateCmd.Flags().StringVarP(&validateInput, "input", "i", "", "input file or directory to validate (required)")
	validateCmd.MarkFlagRequired("input")
}

func runValidate(cmd *cobra.Command, args []string) error {
	if verbosity > 0 {
		fmt.Printf("Validating: %s\n", validateInput)
	}

	// Get file info to check if it's a file or directory
	info, err := os.Stat(validateInput)
	if err != nil {
		return fmt.Errorf("failed to access input path: %w", err)
	}

	var filesToValidate []string

	if info.IsDir() {
		// Find all .json files in the directory
		files, err := filepath.Glob(filepath.Join(validateInput, "*.json"))
		if err != nil {
			return fmt.Errorf("failed to list directory: %w", err)
		}
		if len(files) == 0 {
			return fmt.Errorf("no .json files found in directory: %s", validateInput)
		}
		filesToValidate = files
	} else {
		// Single file
		filesToValidate = []string{validateInput}
	}

	// Validate each file
	totalFiles := len(filesToValidate)
	invalidFiles := 0
	validFiles := 0

	for _, filePath := range filesToValidate {
		if verbosity > 0 {
			fmt.Printf("\nValidating: %s\n", filePath)
		}

		valid, err := validatePuzzleFile(filePath)
		if err != nil {
			fmt.Printf("❌ %s: ERROR - %v\n", filepath.Base(filePath), err)
			invalidFiles++
		} else if !valid {
			invalidFiles++
		} else {
			if verbosity > 0 {
				fmt.Printf("✓ %s: VALID\n", filepath.Base(filePath))
			}
			validFiles++
		}
	}

	// Print summary
	fmt.Printf("\n")
	fmt.Printf("Validation Summary:\n")
	fmt.Printf("  Total files:   %d\n", totalFiles)
	fmt.Printf("  Valid:         %d\n", validFiles)
	fmt.Printf("  Invalid:       %d\n", invalidFiles)

	// Exit with code 1 if any file is invalid
	if invalidFiles > 0 {
		os.Exit(1)
	}

	return nil
}

// validatePuzzleFile validates a single puzzle file
// Returns true if valid, false if invalid, and an error if the file can't be processed
func validatePuzzleFile(filePath string) (bool, error) {
	// Read the file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return false, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse JSON
	var puzzleData struct {
		Grid   [][]string `json:"grid"`
		Across []clueData `json:"across"`
		Down   []clueData `json:"down"`
	}

	if err := json.Unmarshal(data, &puzzleData); err != nil {
		return false, fmt.Errorf("invalid JSON format: %w", err)
	}

	// Check that grid exists
	if len(puzzleData.Grid) == 0 {
		fmt.Printf("❌ %s: INVALID - empty grid\n", filepath.Base(filePath))
		return false, nil
	}

	// Convert to grid.Grid for validation
	g := convertToGrid(puzzleData.Grid)

	// Perform validation checks
	errors := []string{}

	// 1. Check grid symmetry
	if !isSymmetric(g) {
		errors = append(errors, "grid lacks 180-degree rotational symmetry")
	}

	// 2. Check grid connectivity
	if !isConnected(g) {
		errors = append(errors, "grid has disconnected white cells")
	}

	// 3. Check word lengths
	if hasShortWords(g) {
		errors = append(errors, "grid contains words shorter than minimum length (3)")
	}

	// 4. Check clue completeness
	clueErrors := validateClueCompleteness(g, puzzleData.Across, puzzleData.Down)
	errors = append(errors, clueErrors...)

	// Report errors
	if len(errors) > 0 {
		fmt.Printf("❌ %s: INVALID\n", filepath.Base(filePath))
		for _, errMsg := range errors {
			fmt.Printf("   - %s\n", errMsg)
		}
		return false, nil
	}

	return true, nil
}

// convertToGrid converts a 2D string array to grid.Grid
func convertToGrid(gridData [][]string) *grid.Grid {
	size := len(gridData)
	g := grid.NewEmptyGrid(grid.GridConfig{Size: size})

	for row := 0; row < size; row++ {
		for col := 0; col < size && col < len(gridData[row]); col++ {
			cell := gridData[row][col]
			if cell == "." || cell == "" {
				// Black cell
				g.Cells[row][col].IsBlack = true
			} else {
				// White cell with letter
				g.Cells[row][col].IsBlack = false
				if len(cell) > 0 {
					g.Cells[row][col].Letter = rune(cell[0])
				}
			}
		}
	}

	// Number the grid
	numberGrid(g)

	return g
}

// numberGrid assigns clue numbers to the grid based on entry positions
func numberGrid(g *grid.Grid) {
	clueNumber := 1

	for row := 0; row < g.Size; row++ {
		for col := 0; col < g.Size; col++ {
			if g.Cells[row][col].IsBlack {
				continue
			}

			// Check if this cell starts an across or down word
			startsAcross := false
			startsDown := false

			// Starts across if: at left edge OR cell to left is black, AND at least 2 more cells to right
			if (col == 0 || g.Cells[row][col-1].IsBlack) && col+1 < g.Size && !g.Cells[row][col+1].IsBlack {
				startsAcross = true
			}

			// Starts down if: at top edge OR cell above is black, AND at least 2 more cells below
			if (row == 0 || g.Cells[row-1][col].IsBlack) && row+1 < g.Size && !g.Cells[row+1][col].IsBlack {
				startsDown = true
			}

			if startsAcross || startsDown {
				g.Cells[row][col].Number = clueNumber
				clueNumber++
			}
		}
	}
}

// validateClueCompleteness checks that all entries have corresponding clues
func validateClueCompleteness(g *grid.Grid, acrossClues, downClues []clueData) []string {
	errors := []string{}

	// Build maps of expected entries from the grid
	expectedAcross := make(map[int]int) // clue number -> length
	expectedDown := make(map[int]int)

	for row := 0; row < g.Size; row++ {
		for col := 0; col < g.Size; col++ {
			if g.Cells[row][col].IsBlack || g.Cells[row][col].Number == 0 {
				continue
			}

			clueNum := g.Cells[row][col].Number

			// Check if this starts an across entry
			if col == 0 || g.Cells[row][col-1].IsBlack {
				length := 0
				for c := col; c < g.Size && !g.Cells[row][c].IsBlack; c++ {
					length++
				}
				if length >= 2 { // Only count words of length 2+
					expectedAcross[clueNum] = length
				}
			}

			// Check if this starts a down entry
			if row == 0 || g.Cells[row-1][col].IsBlack {
				length := 0
				for r := row; r < g.Size && !g.Cells[r][col].IsBlack; r++ {
					length++
				}
				if length >= 2 { // Only count words of length 2+
					expectedDown[clueNum] = length
				}
			}
		}
	}

	// Check that all expected across entries have clues
	providedAcross := make(map[int]bool)
	for _, clue := range acrossClues {
		providedAcross[clue.Number] = true

		// Check clue has text
		if strings.TrimSpace(clue.Text) == "" {
			errors = append(errors, fmt.Sprintf("across clue %d has empty text", clue.Number))
		}

		// Check clue has answer
		if strings.TrimSpace(clue.Answer) == "" {
			errors = append(errors, fmt.Sprintf("across clue %d has empty answer", clue.Number))
		}

		// Check answer length matches expected
		if expectedLen, exists := expectedAcross[clue.Number]; exists {
			if clue.Length != expectedLen {
				errors = append(errors, fmt.Sprintf("across clue %d: answer length mismatch (expected %d, got %d)", clue.Number, expectedLen, clue.Length))
			}
		} else {
			errors = append(errors, fmt.Sprintf("across clue %d has no corresponding entry in grid", clue.Number))
		}
	}

	for clueNum := range expectedAcross {
		if !providedAcross[clueNum] {
			errors = append(errors, fmt.Sprintf("missing across clue for entry %d", clueNum))
		}
	}

	// Check that all expected down entries have clues
	providedDown := make(map[int]bool)
	for _, clue := range downClues {
		providedDown[clue.Number] = true

		// Check clue has text
		if strings.TrimSpace(clue.Text) == "" {
			errors = append(errors, fmt.Sprintf("down clue %d has empty text", clue.Number))
		}

		// Check clue has answer
		if strings.TrimSpace(clue.Answer) == "" {
			errors = append(errors, fmt.Sprintf("down clue %d has empty answer", clue.Number))
		}

		// Check answer length matches expected
		if expectedLen, exists := expectedDown[clue.Number]; exists {
			if clue.Length != expectedLen {
				errors = append(errors, fmt.Sprintf("down clue %d: answer length mismatch (expected %d, got %d)", clue.Number, expectedLen, clue.Length))
			}
		} else {
			errors = append(errors, fmt.Sprintf("down clue %d has no corresponding entry in grid", clue.Number))
		}
	}

	for clueNum := range expectedDown {
		if !providedDown[clueNum] {
			errors = append(errors, fmt.Sprintf("missing down clue for entry %d", clueNum))
		}
	}

	return errors
}

// isSymmetric checks if the grid has 180-degree rotational symmetry
func isSymmetric(g *grid.Grid) bool {
	size := g.Size

	for row := 0; row < size; row++ {
		for col := 0; col < size; col++ {
			mirrorRow := size - 1 - row
			mirrorCol := size - 1 - col

			if g.Cells[row][col].IsBlack != g.Cells[mirrorRow][mirrorCol].IsBlack {
				return false
			}
		}
	}

	return true
}

// isConnected checks if all white cells are connected
func isConnected(g *grid.Grid) bool {
	if g == nil || g.Size == 0 {
		return false
	}

	// Find first white cell to start from
	var startRow, startCol int
	found := false
	for row := 0; row < g.Size && !found; row++ {
		for col := 0; col < g.Size && !found; col++ {
			if !g.Cells[row][col].IsBlack {
				startRow = row
				startCol = col
				found = true
			}
		}
	}

	if !found {
		return false // No white cells
	}

	// Count total white cells
	totalWhiteCells := 0
	for row := 0; row < g.Size; row++ {
		for col := 0; col < g.Size; col++ {
			if !g.Cells[row][col].IsBlack {
				totalWhiteCells++
			}
		}
	}

	if totalWhiteCells == 0 {
		return false
	}

	// Perform flood fill from first white cell
	visited := make([][]bool, g.Size)
	for i := range visited {
		visited[i] = make([]bool, g.Size)
	}

	reachedCount := floodFill(g, startRow, startCol, visited)

	return reachedCount == totalWhiteCells
}

// floodFill performs BFS flood fill
func floodFill(g *grid.Grid, startRow, startCol int, visited [][]bool) int {
	queue := make([][2]int, 0)
	queue = append(queue, [2]int{startRow, startCol})
	visited[startRow][startCol] = true
	count := 1

	directions := [][2]int{
		{-1, 0}, // up
		{1, 0},  // down
		{0, -1}, // left
		{0, 1},  // right
	}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		row, col := current[0], current[1]

		for _, dir := range directions {
			newRow := row + dir[0]
			newCol := col + dir[1]

			if newRow < 0 || newRow >= g.Size || newCol < 0 || newCol >= g.Size {
				continue
			}

			if visited[newRow][newCol] {
				continue
			}

			if g.Cells[newRow][newCol].IsBlack {
				continue
			}

			visited[newRow][newCol] = true
			queue = append(queue, [2]int{newRow, newCol})
			count++
		}
	}

	return count
}

// hasShortWords checks if the grid has words shorter than minimum length
func hasShortWords(g *grid.Grid) bool {
	if g == nil || g.Size == 0 {
		return false
	}

	minWordLength := 3

	// Check horizontal words
	for row := 0; row < g.Size; row++ {
		wordLength := 0
		for col := 0; col < g.Size; col++ {
			if g.Cells[row][col].IsBlack {
				if wordLength > 1 && wordLength < minWordLength {
					return true
				}
				wordLength = 0
			} else {
				wordLength++
			}
		}
		if wordLength > 1 && wordLength < minWordLength {
			return true
		}
	}

	// Check vertical words
	for col := 0; col < g.Size; col++ {
		wordLength := 0
		for row := 0; row < g.Size; row++ {
			if g.Cells[row][col].IsBlack {
				if wordLength > 1 && wordLength < minWordLength {
					return true
				}
				wordLength = 0
			} else {
				wordLength++
			}
		}
		if wordLength > 1 && wordLength < minWordLength {
			return true
		}
	}

	return false
}
