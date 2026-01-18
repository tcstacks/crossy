package grid

// Direction represents the direction of a crossword entry
type Direction int

const (
	// ACROSS represents a horizontal word entry
	ACROSS Direction = iota
	// DOWN represents a vertical word entry
	DOWN
)

// String returns the string representation of the direction
func (d Direction) String() string {
	switch d {
	case ACROSS:
		return "across"
	case DOWN:
		return "down"
	default:
		return "unknown"
	}
}

// Cell represents a single cell in the crossword grid
type Cell struct {
	Row     int    // Row position (0-indexed)
	Col     int    // Column position (0-indexed)
	IsBlack bool   // Whether this is a black/blocked cell
	Letter  rune   // The letter in this cell (0 if empty)
	Number  int    // Clue number for this cell (0 if not a clue start)
}

// Entry represents a word slot in the crossword grid
type Entry struct {
	Number    int       // Clue number for this entry
	Direction Direction // Direction of the word (ACROSS or DOWN)
	StartRow  int       // Starting row position (0-indexed)
	StartCol  int       // Starting column position (0-indexed)
	Length    int       // Length of the word
	Cells     []*Cell   // Pointers to the cells that make up this entry
}

// Grid represents a crossword grid
type Grid struct {
	Size    int       // Size of the grid (Size x Size)
	Cells   [][]*Cell // 2D array of cells (Size x Size)
	Entries []*Entry  // List of word entries in the grid
}

// GridConfig holds configuration for grid creation
type GridConfig struct {
	Size int // Size of the grid (Size x Size)
}

// NewEmptyGrid creates a new empty grid with the specified configuration.
// All cells are initialized as white (non-black) with Letter = 0 and Number = 0.
func NewEmptyGrid(config GridConfig) *Grid {
	cells := make([][]*Cell, config.Size)
	for i := 0; i < config.Size; i++ {
		cells[i] = make([]*Cell, config.Size)
		for j := 0; j < config.Size; j++ {
			cells[i][j] = &Cell{
				Row:     i,
				Col:     j,
				IsBlack: false,
				Letter:  0,
				Number:  0,
			}
		}
	}

	return &Grid{
		Size:    config.Size,
		Cells:   cells,
		Entries: []*Entry{},
	}
}
