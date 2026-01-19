package output

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"strings"

	"github.com/crossplay/backend/internal/models"
)

// FormatPuz converts a models.Puzzle to .puz binary format
// The .puz format is used by AcrossLite and compatible solvers
func FormatPuz(puzzle *models.Puzzle) ([]byte, error) {
	// Build the solution string (row-major, no separators)
	solution := buildSolutionString(puzzle)

	// Build the state string (initially blank, same length as solution)
	state := strings.Repeat("-", len(solution))

	// Build clue strings
	title := puzzle.Title
	author := puzzle.Author
	copyright := fmt.Sprintf("© %s", author)
	clues := buildClueStrings(puzzle)
	notes := ""

	// Calculate checksums
	width := byte(puzzle.GridWidth)
	height := byte(puzzle.GridHeight)
	numClues := uint16(len(puzzle.CluesAcross) + len(puzzle.CluesDown))

	cib := computeCIB(width, height, numClues, 0x0001, 0x0000)

	// Create buffer for the .puz file
	buf := new(bytes.Buffer)

	// Write header
	if err := writeHeader(buf, width, height, numClues, cib, solution, state); err != nil {
		return nil, fmt.Errorf("failed to write header: %w", err)
	}

	// Write strings section
	if err := writeStrings(buf, title, author, copyright, clues, notes); err != nil {
		return nil, fmt.Errorf("failed to write strings: %w", err)
	}

	return buf.Bytes(), nil
}

// buildSolutionString creates the solution string from the puzzle grid
func buildSolutionString(puzzle *models.Puzzle) string {
	var solution strings.Builder
	for y := 0; y < puzzle.GridHeight; y++ {
		for x := 0; x < puzzle.GridWidth; x++ {
			cell := puzzle.Grid[y][x]
			if cell.Letter == nil {
				solution.WriteByte('.')
			} else {
				solution.WriteString(*cell.Letter)
			}
		}
	}
	return solution.String()
}

// buildClueStrings creates the clue strings in the correct order
func buildClueStrings(puzzle *models.Puzzle) []string {
	// Collect all clues with their numbers
	type numberedClue struct {
		number int
		text   string
		dir    string
	}

	var allClues []numberedClue
	for _, clue := range puzzle.CluesAcross {
		allClues = append(allClues, numberedClue{
			number: clue.Number,
			text:   clue.Text,
			dir:    "across",
		})
	}
	for _, clue := range puzzle.CluesDown {
		allClues = append(allClues, numberedClue{
			number: clue.Number,
			text:   clue.Text,
			dir:    "down",
		})
	}

	// Sort clues: first by number, then across before down
	// Simple bubble sort since clues are typically pre-sorted
	for i := 0; i < len(allClues)-1; i++ {
		for j := i + 1; j < len(allClues); j++ {
			if allClues[i].number > allClues[j].number {
				allClues[i], allClues[j] = allClues[j], allClues[i]
			} else if allClues[i].number == allClues[j].number {
				// Same number, across comes before down
				if allClues[i].dir == "down" && allClues[j].dir == "across" {
					allClues[i], allClues[j] = allClues[j], allClues[i]
				}
			}
		}
	}

	// Extract text only
	clueTexts := make([]string, len(allClues))
	for i, clue := range allClues {
		clueTexts[i] = clue.text
	}

	return clueTexts
}

// writeHeader writes the .puz file header
func writeHeader(buf *bytes.Buffer, width, height byte, numClues uint16, cib uint16, solution, state string) error {
	// Checksum placeholders (will be computed later)
	globalCksum := uint16(0)

	// Offset 0x00: File magic "ACROSS&DOWN\x00" (12 bytes)
	buf.WriteString("ACROSS&DOWN\x00")

	// Offset 0x0C: Global checksum (2 bytes, placeholder)
	binary.Write(buf, binary.LittleEndian, globalCksum)

	// Offset 0x0E: File magic 2 "ICHEATED" (8 bytes) - note: starts at 0x0E, not 0x10!
	buf.WriteString("ICHEATED")

	// Offset 0x16: CIB masked checksum (2 bytes)
	binary.Write(buf, binary.LittleEndian, uint16(0))

	// Offset 0x18: Low checksums (8 bytes) - masked checksums
	for i := 0; i < 4; i++ {
		binary.Write(buf, binary.LittleEndian, uint16(0))
	}

	// Offset 0x20: Version string "1.3\x00" (4 bytes including null)
	buf.WriteString("1.3\x00")

	// Offset 0x24: Reserved (2 bytes)
	binary.Write(buf, binary.LittleEndian, uint16(0))

	// Offset 0x26: Scrambled checksum (2 bytes, 0 for unscrambled)
	binary.Write(buf, binary.LittleEndian, uint16(0))

	// Offset 0x28: Reserved (4 bytes)
	buf.Write(make([]byte, 4))

	// Offset 0x2C: Width (1 byte)
	buf.WriteByte(width)

	// Offset 0x2D: Height (1 byte)
	buf.WriteByte(height)

	// Offset 0x2E: Number of clues (2 bytes)
	binary.Write(buf, binary.LittleEndian, numClues)

	// Offset 0x30: Puzzle type (2 bytes, 0x0001 = normal)
	binary.Write(buf, binary.LittleEndian, uint16(0x0001))

	// Offset 0x32: Scrambled state (2 bytes, 0x0000 = not scrambled)
	binary.Write(buf, binary.LittleEndian, uint16(0x0000))

	// Offset 0x34: Solution (width * height bytes)
	buf.WriteString(solution)

	// State (width * height bytes)
	buf.WriteString(state)

	return nil
}

// writeStrings writes the strings section (null-terminated strings)
func writeStrings(buf *bytes.Buffer, title, author, copyright string, clues []string, notes string) error {
	// Title
	buf.WriteString(title)
	buf.WriteByte(0)

	// Author
	buf.WriteString(author)
	buf.WriteByte(0)

	// Copyright
	buf.WriteString(copyright)
	buf.WriteByte(0)

	// Clues
	for _, clue := range clues {
		buf.WriteString(clue)
		buf.WriteByte(0)
	}

	// Notes (optional)
	if notes != "" {
		buf.WriteString(notes)
		buf.WriteByte(0)
	}

	return nil
}

// computeCIB computes the CIB checksum
func computeCIB(width, height byte, numClues, puzzleType, scrambledState uint16) uint16 {
	cksum := uint16(0)

	// Checksum includes width, height, numClues in a specific order
	cksum = checksumRegion(cksum, []byte{width, height})

	// Add numClues (little-endian)
	numCluesBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(numCluesBytes, numClues)
	cksum = checksumRegion(cksum, numCluesBytes)

	// Add puzzle type
	puzzleTypeBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(puzzleTypeBytes, puzzleType)
	cksum = checksumRegion(cksum, puzzleTypeBytes)

	// Add scrambled state
	scrambledStateBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(scrambledStateBytes, scrambledState)
	cksum = checksumRegion(cksum, scrambledStateBytes)

	return cksum
}

// checksumRegion computes a checksum over a byte region
func checksumRegion(cksum uint16, data []byte) uint16 {
	for _, b := range data {
		// Rotate right
		if cksum&0x0001 != 0 {
			cksum = (cksum >> 1) + 0x8000
		} else {
			cksum = cksum >> 1
		}
		// Add byte
		cksum = (cksum + uint16(b)) & 0xFFFF
	}
	return cksum
}
