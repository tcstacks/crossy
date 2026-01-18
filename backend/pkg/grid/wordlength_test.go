package grid

import "testing"

func TestHasShortWords_EmptyGrid(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Empty grid is one long word in each direction - no short words
	if hasShortWords(grid) {
		t.Error("Empty grid (all white cells) should not have short words")
	}
}

func TestHasShortWords_ValidThreeLetterWords(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a grid with minimum valid word length (3)
	// Pattern: WWW.W (W = white, . = black)
	//          .....
	//          .....
	//          .....
	//          .....
	grid.Cells[0][3].IsBlack = true // Creates two separate words: 3 letters and 1 letter

	// First word is exactly 3 letters - valid
	// Second is 1 letter - not counted as a word
	if hasShortWords(grid) {
		t.Error("Grid with 3-letter word should be valid")
	}
}

func TestHasShortWords_TwoLetterHorizontal(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a 2-letter word: WW.WW
	//                         .....
	//                         .....
	//                         .....
	//                         .....
	grid.Cells[0][2].IsBlack = true

	if !hasShortWords(grid) {
		t.Error("Grid with 2-letter horizontal word should be invalid")
	}
}

func TestHasShortWords_TwoLetterVertical(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a 2-letter word vertically in column 0
	// W....
	// W....
	// .....
	// .....
	// .....
	grid.Cells[2][0].IsBlack = true

	if !hasShortWords(grid) {
		t.Error("Grid with 2-letter vertical word should be invalid")
	}
}

func TestHasShortWords_MultipleTwoLetterWords(t *testing.T) {
	config := GridConfig{Size: 7}
	grid := NewEmptyGrid(config)

	// Create multiple 2-letter words
	// WW.WW.W
	// WW.....
	// .......
	// .......
	// .......
	// .......
	// .......
	grid.Cells[0][2].IsBlack = true // Horizontal 2-letter
	grid.Cells[0][5].IsBlack = true // Another horizontal 2-letter
	grid.Cells[2][0].IsBlack = true // Vertical 2-letter in column 0
	grid.Cells[2][1].IsBlack = true // Vertical 2-letter in column 1

	if !hasShortWords(grid) {
		t.Error("Grid with multiple 2-letter words should be invalid")
	}
}

func TestHasShortWords_SingleIsolatedCell(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a pattern with isolated single white cells
	// These should not count as words
	// .....
	// .W...
	// .....
	// ...W.
	// .....
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}
	grid.Cells[1][1].IsBlack = false // Single white cell
	grid.Cells[3][3].IsBlack = false // Another single white cell

	// Single cells don't count as words (need at least 2 consecutive)
	if hasShortWords(grid) {
		t.Error("Single isolated white cells should not count as short words")
	}
}

func TestHasShortWords_MixedValidAndInvalid(t *testing.T) {
	config := GridConfig{Size: 7}
	grid := NewEmptyGrid(config)

	// Create a grid with both valid (3+ letters) and invalid (2 letters) words
	// WWWW.WW
	// .......
	// .......
	// .......
	// .......
	// .......
	// .......
	grid.Cells[0][4].IsBlack = true // Creates a 4-letter word and a 2-letter word

	if !hasShortWords(grid) {
		t.Error("Grid with at least one 2-letter word should be invalid")
	}
}

func TestHasShortWords_TypicalCrosswordPattern(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a typical crossword pattern with all valid 3+ letter words
	// WWW.W
	// WWW.W
	// WWW.W
	// .....
	// WWWWW
	for col := 0; col < 5; col++ {
		grid.Cells[0][col].IsBlack = col == 3
		grid.Cells[1][col].IsBlack = col == 3
		grid.Cells[2][col].IsBlack = col == 3
		grid.Cells[3][col].IsBlack = true
	}

	if hasShortWords(grid) {
		t.Error("Valid crossword pattern should not have short words")
	}
}

func TestHasShortWords_EdgeCases(t *testing.T) {
	// Test nil grid
	if hasShortWords(nil) {
		t.Error("Nil grid should return false")
	}

	// Test zero-size grid
	grid := &Grid{Size: 0, Cells: nil}
	if hasShortWords(grid) {
		t.Error("Zero-size grid should return false")
	}
}

func TestHasShortWords_AllBlackCells(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Make all cells black - no words at all
	for row := 0; row < 5; row++ {
		for col := 0; col < 5; col++ {
			grid.Cells[row][col].IsBlack = true
		}
	}

	if hasShortWords(grid) {
		t.Error("Grid with all black cells should not have short words (no words at all)")
	}
}

func TestHasShortWords_LargeGridWithShortWord(t *testing.T) {
	config := GridConfig{Size: 15}
	grid := NewEmptyGrid(config)

	// Create a 2-letter word in the middle of a large grid
	grid.Cells[7][7].IsBlack = true  // Creates separation
	grid.Cells[7][10].IsBlack = true // Creates a 2-letter word at [7][8-9]

	if !hasShortWords(grid) {
		t.Error("15x15 grid with one 2-letter word should be invalid")
	}
}

func TestHasShortWords_VerticalAndHorizontalValid(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a cross pattern with all words being 3+ letters
	// WWWWW
	// ..W..
	// ..W..
	// ..W..
	// WWWWW
	for col := 0; col < 5; col++ {
		if col != 2 {
			grid.Cells[1][col].IsBlack = true
			grid.Cells[2][col].IsBlack = true
			grid.Cells[3][col].IsBlack = true
		}
	}

	// This creates:
	// - Horizontal: two 5-letter words (rows 0 and 4)
	// - Vertical: one 5-letter word (column 2)
	if hasShortWords(grid) {
		t.Error("Cross pattern with all 5-letter words should be valid")
	}
}

func TestHasShortWords_SymmetricPatternWithShortWords(t *testing.T) {
	config := GridConfig{Size: 7}
	grid := NewEmptyGrid(config)

	// Create a symmetric pattern with 2-letter words
	// Pattern creates short words in multiple directions
	grid.Cells[0][2].IsBlack = true
	grid.Cells[0][4].IsBlack = true
	grid.Cells[6][2].IsBlack = true // Symmetric
	grid.Cells[6][4].IsBlack = true // Symmetric

	if !hasShortWords(grid) {
		t.Error("Symmetric pattern with 2-letter words should be invalid")
	}
}

func TestHasShortWords_ConsecutiveBlackSquares(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create consecutive black squares with valid words between
	// WWW..
	// WWW..
	// .....
	// .....
	// .....
	grid.Cells[0][3].IsBlack = true
	grid.Cells[0][4].IsBlack = true
	grid.Cells[1][3].IsBlack = true
	grid.Cells[1][4].IsBlack = true

	// Should have only 3-letter words horizontally in rows 0 and 1
	if hasShortWords(grid) {
		t.Error("Grid with consecutive black squares and 3-letter words should be valid")
	}
}

func TestHasShortWords_MinWordLengthConstant(t *testing.T) {
	// Verify the constant is set correctly
	if MinWordLength != 3 {
		t.Errorf("MinWordLength = %d, want 3", MinWordLength)
	}
}

func TestErrShortWords(t *testing.T) {
	if ErrShortWords == nil {
		t.Error("ErrShortWords should be defined")
	}

	expectedMsg := "grid contains words shorter than minimum allowed length"
	if ErrShortWords.Error() != expectedMsg {
		t.Errorf("ErrShortWords message = %q, want %q", ErrShortWords.Error(), expectedMsg)
	}
}

func TestHasShortWords_ExactlyThreeLetterWords(t *testing.T) {
	config := GridConfig{Size: 9}
	grid := NewEmptyGrid(config)

	// Create a grid where all words are exactly 3 letters
	// WWW.WWW.W
	// WWW.WWW.W
	// WWW.WWW.W
	// .........
	// WWW.WWW.W
	// WWW.WWW.W
	// WWW.WWW.W
	// .........
	// WWWWWWWWW
	for row := 0; row < 9; row++ {
		for col := 0; col < 9; col++ {
			// Create vertical blocks of 3 separated by black cells
			if row == 3 || row == 7 {
				grid.Cells[row][col].IsBlack = true
			} else if col == 3 || col == 7 {
				grid.Cells[row][col].IsBlack = true
			}
		}
	}

	// All words should be exactly 3 letters - valid
	if hasShortWords(grid) {
		t.Error("Grid with all 3-letter words should be valid")
	}
}

func TestHasShortWords_TwoLetterAtEndOfRow(t *testing.T) {
	config := GridConfig{Size: 7}
	grid := NewEmptyGrid(config)

	// Create a 2-letter word at the end of the first row
	// WWWW.WW
	// .......
	// .......
	// .......
	// .......
	// .......
	// .......
	grid.Cells[0][4].IsBlack = true

	if !hasShortWords(grid) {
		t.Error("2-letter word at end of row should be invalid")
	}
}

func TestHasShortWords_TwoLetterAtStartOfRow(t *testing.T) {
	config := GridConfig{Size: 5}
	grid := NewEmptyGrid(config)

	// Create a 2-letter word at the start of the first row
	// WW.WWW
	// .......
	// .......
	// .......
	// .......
	grid.Cells[0][2].IsBlack = true

	if !hasShortWords(grid) {
		t.Error("2-letter word at start of row should be invalid")
	}
}

func TestHasShortWords_ComplexPattern(t *testing.T) {
	config := GridConfig{Size: 9}
	grid := NewEmptyGrid(config)

	// Create a complex pattern with various word lengths - all valid (3+)
	// WWWWW.WWW
	// WWWWW.WWW
	// WWWWW.WWW
	// .........
	// WWW.WWWWW
	// WWW.WWWWW
	// WWW.WWWWW
	// .........
	// WWWWWWWWW

	// Create two blocks of 5x3 separated by a black column
	// Top section: rows 0-2
	for row := 0; row < 3; row++ {
		grid.Cells[row][5].IsBlack = true // Black column separates 5-letter and 3-letter words
	}

	// Separator row
	for col := 0; col < 9; col++ {
		grid.Cells[3][col].IsBlack = true
	}

	// Middle section: rows 4-6
	for row := 4; row < 7; row++ {
		grid.Cells[row][3].IsBlack = true // Black column separates 3-letter and 5-letter words
	}

	// Separator row
	for col := 0; col < 9; col++ {
		grid.Cells[7][col].IsBlack = true
	}

	// Bottom row: row 8 is all white (9-letter word)

	// All horizontal words are 3+ letters (5, 3, or 9)
	// All vertical words are 3 letters
	if hasShortWords(grid) {
		t.Error("Complex pattern with all valid words should be valid")
	}
}
