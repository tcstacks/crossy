package grid

import "errors"

// ErrDisconnectedGrid is returned when a grid has disconnected white cells
var ErrDisconnectedGrid = errors.New("grid has disconnected regions: not all white cells are reachable")

// isConnected verifies that all white cells in the grid are connected.
// It uses a flood fill algorithm starting from the center cell.
// Returns true if all white cells are reachable from the center, false otherwise.
//
// The function performs the following steps:
// 1. Finds the center cell (size/2, size/2)
// 2. If the center is black, returns false (invalid grid for connectivity check)
// 3. Uses flood fill (BFS) to mark all reachable white cells
// 4. Verifies that all white cells were reached
func isConnected(grid *Grid) bool {
	if grid == nil || grid.Size == 0 {
		return false
	}

	// Find center cell
	center := grid.Size / 2
	centerCell := grid.Cells[center][center]

	// If center is black, we can't use it as a starting point
	// In a valid crossword grid, the center should typically be white
	if centerCell.IsBlack {
		return false
	}

	// Count total white cells
	totalWhiteCells := 0
	for row := 0; row < grid.Size; row++ {
		for col := 0; col < grid.Size; col++ {
			if !grid.Cells[row][col].IsBlack {
				totalWhiteCells++
			}
		}
	}

	// If there are no white cells, the grid is invalid
	if totalWhiteCells == 0 {
		return false
	}

	// Perform flood fill from center cell
	visited := make([][]bool, grid.Size)
	for i := range visited {
		visited[i] = make([]bool, grid.Size)
	}

	reachedCount := floodFill(grid, center, center, visited)

	// All white cells should be reachable from the center
	return reachedCount == totalWhiteCells
}

// floodFill performs a breadth-first search flood fill starting from the given position.
// It marks all reachable white cells in the visited array and returns the count of cells reached.
func floodFill(grid *Grid, startRow, startCol int, visited [][]bool) int {
	// Queue for BFS: stores [row, col] pairs
	queue := make([][2]int, 0)
	queue = append(queue, [2]int{startRow, startCol})
	visited[startRow][startCol] = true
	count := 1

	// Directions: up, down, left, right
	directions := [][2]int{
		{-1, 0}, // up
		{1, 0},  // down
		{0, -1}, // left
		{0, 1},  // right
	}

	for len(queue) > 0 {
		// Dequeue
		current := queue[0]
		queue = queue[1:]
		row, col := current[0], current[1]

		// Check all four adjacent cells
		for _, dir := range directions {
			newRow := row + dir[0]
			newCol := col + dir[1]

			// Check bounds
			if newRow < 0 || newRow >= grid.Size || newCol < 0 || newCol >= grid.Size {
				continue
			}

			// Check if already visited
			if visited[newRow][newCol] {
				continue
			}

			// Check if it's a white cell
			cell := grid.Cells[newRow][newCol]
			if cell.IsBlack {
				continue
			}

			// Mark as visited and enqueue
			visited[newRow][newCol] = true
			queue = append(queue, [2]int{newRow, newCol})
			count++
		}
	}

	return count
}
