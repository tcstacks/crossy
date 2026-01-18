package grid

import (
	"testing"
)

func TestGetDifficultyDensity(t *testing.T) {
	tests := []struct {
		name       string
		difficulty Difficulty
		want       float64
	}{
		{
			name:       "Easy difficulty",
			difficulty: Easy,
			want:       0.06,
		},
		{
			name:       "Medium difficulty",
			difficulty: Medium,
			want:       0.08,
		},
		{
			name:       "Hard difficulty",
			difficulty: Hard,
			want:       0.10,
		},
		{
			name:       "Expert difficulty",
			difficulty: Expert,
			want:       0.12,
		},
		{
			name:       "Unknown difficulty defaults to medium",
			difficulty: Difficulty("unknown"),
			want:       0.08,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getDifficultyDensity(tt.difficulty)
			if got != tt.want {
				t.Errorf("getDifficultyDensity(%v) = %v, want %v", tt.difficulty, got, tt.want)
			}
		})
	}
}

func TestGenerate(t *testing.T) {
	tests := []struct {
		name        string
		config      GeneratorConfig
		wantErr     bool
		errType     error
		validateFn  func(*testing.T, *Grid)
	}{
		{
			name: "Generate 15x15 grid with Easy difficulty",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 15},
				Difficulty: Easy,
				Seed:       12345,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 15 {
					t.Errorf("expected size 15, got %d", grid.Size)
				}
				// Verify grid has entries
				if len(grid.Entries) == 0 {
					t.Error("expected grid to have entries")
				}
				// Verify symmetry
				if !isSymmetric(grid) {
					t.Error("expected grid to be symmetric")
				}
				// Verify connectivity
				if !isConnected(grid) {
					t.Error("expected grid to be connected")
				}
				// Verify no short words
				if hasShortWords(grid) {
					t.Error("expected grid to have no short words")
				}
			},
		},
		{
			name: "Generate 15x15 grid with Medium difficulty",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 15},
				Difficulty: Medium,
				Seed:       54321,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 15 {
					t.Errorf("expected size 15, got %d", grid.Size)
				}
			},
		},
		{
			name: "Generate 15x15 grid with Hard difficulty",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 15},
				Difficulty: Hard,
				Seed:       67890,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 15 {
					t.Errorf("expected size 15, got %d", grid.Size)
				}
			},
		},
		{
			name: "Generate 15x15 grid with Expert difficulty",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 15},
				Difficulty: Expert,
				Seed:       11111,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 15 {
					t.Errorf("expected size 15, got %d", grid.Size)
				}
			},
		},
		{
			name: "Generate with custom black density",
			config: GeneratorConfig{
				GridConfig:   GridConfig{Size: 15},
				BlackDensity: 0.08,
				Seed:         99999,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				// Count black squares
				blackCount := 0
				for row := 0; row < grid.Size; row++ {
					for col := 0; col < grid.Size; col++ {
						if grid.Cells[row][col].IsBlack {
							blackCount++
						}
					}
				}
				totalCells := grid.Size * grid.Size
				actualDensity := float64(blackCount) / float64(totalCells)
				// Allow some variance due to rounding and symmetry
				if actualDensity < 0.04 || actualDensity > 0.12 {
					t.Errorf("expected black density around 0.08, got %v", actualDensity)
				}
			},
		},
		{
			name: "Generate without seed (uses timestamp)",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 15},
				Difficulty: Medium,
				Seed:       0, // Will use timestamp
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
			},
		},
		{
			name: "Generate 11x11 grid",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 11},
				Difficulty: Medium,
				Seed:       22222,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 11 {
					t.Errorf("expected size 11, got %d", grid.Size)
				}
			},
		},
		{
			name: "Generate 13x13 grid",
			config: GeneratorConfig{
				GridConfig: GridConfig{Size: 13},
				Difficulty: Medium,
				Seed:       33333,
			},
			wantErr: false,
			validateFn: func(t *testing.T, grid *Grid) {
				if grid == nil {
					t.Fatal("expected non-nil grid")
				}
				if grid.Size != 13 {
					t.Errorf("expected size 13, got %d", grid.Size)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Generate(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("Generate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && tt.errType != nil && err != tt.errType {
				t.Errorf("Generate() error = %v, want %v", err, tt.errType)
				return
			}
			if tt.validateFn != nil {
				tt.validateFn(t, got)
			}
		})
	}
}

func TestGenerateValidatesAllSteps(t *testing.T) {
	// This test verifies that all validation steps are executed in order
	config := GeneratorConfig{
		GridConfig: GridConfig{Size: 15},
		Difficulty: Medium,
		Seed:       42,
	}

	grid, err := Generate(config)
	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	// Step 1: Verify grid was created
	if grid == nil {
		t.Fatal("expected non-nil grid")
	}

	// Step 2: Verify black squares were seeded
	blackCount := 0
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if grid.Cells[row][col].IsBlack {
				blackCount++
			}
		}
	}
	if blackCount == 0 {
		t.Error("expected some black squares to be seeded")
	}

	// Step 3: Verify symmetry was enforced
	if !isSymmetric(grid) {
		t.Error("expected grid to be symmetric")
	}

	// Step 4: Verify connectivity
	if !isConnected(grid) {
		t.Error("expected grid to be connected")
	}

	// Step 5: Verify no short words
	if hasShortWords(grid) {
		t.Error("expected grid to have no short words")
	}

	// Step 6: Verify entries were computed
	if len(grid.Entries) == 0 {
		t.Error("expected grid to have computed entries")
	}

	// Verify all entries are valid (length >= MinWordLength)
	for _, entry := range grid.Entries {
		if entry.Length < MinWordLength {
			t.Errorf("entry %d-%s has invalid length %d (min %d)",
				entry.Number, entry.Direction, entry.Length, MinWordLength)
		}
	}
}

func TestGenerateRetryLogic(t *testing.T) {
	// Test that generation retries with different seeds
	// We'll use a very small grid with high black density to increase failure probability
	// Note: This test may occasionally pass without retries due to randomness
	config := GeneratorConfig{
		GridConfig:   GridConfig{Size: 5},
		BlackDensity: 0.50, // Very high density to trigger validation failures
		Seed:         777,
	}

	// This should eventually succeed or fail after max attempts
	grid, err := Generate(config)

	// Either we get a valid grid or an error after max attempts
	if err != nil {
		if err != ErrGenerationFailed {
			t.Errorf("unexpected error: %v", err)
		}
		// It's OK if it failed after max attempts with high density
	} else {
		// If it succeeded, verify it's valid
		if grid == nil {
			t.Fatal("expected non-nil grid or error")
		}
		if !isSymmetric(grid) || !isConnected(grid) || hasShortWords(grid) {
			t.Error("generated grid failed validation")
		}
	}
}

func TestGenerateReproducibility(t *testing.T) {
	// Test that same seed produces same grid
	config := GeneratorConfig{
		GridConfig: GridConfig{Size: 15},
		Difficulty: Medium,
		Seed:       42424242,
	}

	grid1, err1 := Generate(config)
	if err1 != nil {
		t.Fatalf("first Generate() failed: %v", err1)
	}

	grid2, err2 := Generate(config)
	if err2 != nil {
		t.Fatalf("second Generate() failed: %v", err2)
	}

	// Compare grids cell by cell
	for row := 0; row < grid1.Size; row++ {
		for col := 0; col < grid1.Size; col++ {
			cell1 := grid1.Cells[row][col]
			cell2 := grid2.Cells[row][col]
			if cell1.IsBlack != cell2.IsBlack {
				t.Errorf("cells at (%d,%d) differ: grid1.IsBlack=%v, grid2.IsBlack=%v",
					row, col, cell1.IsBlack, cell2.IsBlack)
			}
		}
	}
}
