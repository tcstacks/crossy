'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn, isClueComplete, getClueId } from '@/lib/utils';
import type { Clue } from '@/types';

interface CrosswordGridProps {
  onCellUpdate?: (x: number, y: number, value: string | null) => void;
  onCursorMove?: (x: number, y: number) => void;
  readOnly?: boolean;
}

export function CrosswordGrid({
  onCellUpdate,
  onCursorMove,
  readOnly = false,
}: CrosswordGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    puzzle,
    cells,
    selectedCell,
    playerCursors,
    setSelectedCell,
    setSelectedClue,
    updateCell,
    markClueCompleted,
  } = useGameStore();

  // Find the clue at a given position
  const findClueAtPosition = useCallback(
    (x: number, y: number, direction: 'across' | 'down'): Clue | null => {
      if (!puzzle) return null;

      const clues = direction === 'across' ? puzzle.cluesAcross : puzzle.cluesDown;

      for (const clue of clues) {
        const startX = clue.positionX;
        const startY = clue.positionY;
        const endX = direction === 'across' ? startX + clue.length - 1 : startX;
        const endY = direction === 'down' ? startY + clue.length - 1 : startY;

        if (
          x >= startX &&
          x <= endX &&
          y >= startY &&
          y <= endY
        ) {
          return clue;
        }
      }

      return null;
    },
    [puzzle]
  );

  // Check for completed clues
  const checkClueCompletion = useCallback(
    (x: number, y: number) => {
      if (!puzzle) return;

      // Check both across and down clues at this position
      const clueAcross = findClueAtPosition(x, y, 'across');
      const clueDown = findClueAtPosition(x, y, 'down');

      if (clueAcross && isClueComplete(clueAcross, cells, puzzle.grid)) {
        markClueCompleted(getClueId('across', clueAcross.number));
      }

      if (clueDown && isClueComplete(clueDown, cells, puzzle.grid)) {
        markClueCompleted(getClueId('down', clueDown.number));
      }
    },
    [puzzle, cells, findClueAtPosition, markClueCompleted]
  );

  // Handle cell click
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!puzzle || readOnly) return;

      const cell = puzzle.grid[y]?.[x];
      if (!cell || cell.letter === null) return; // Black cell

      // If clicking the same cell, toggle direction
      let newDirection = selectedCell?.direction || 'across';
      if (selectedCell?.x === x && selectedCell?.y === y) {
        newDirection = newDirection === 'across' ? 'down' : 'across';
      }

      // Find the clue at this position
      let clue = findClueAtPosition(x, y, newDirection);

      // If no clue in this direction, try the other
      if (!clue) {
        newDirection = newDirection === 'across' ? 'down' : 'across';
        clue = findClueAtPosition(x, y, newDirection);
      }

      setSelectedCell({ x, y, direction: newDirection });
      setSelectedClue(clue);
      onCursorMove?.(x, y);
    },
    [puzzle, selectedCell, findClueAtPosition, setSelectedCell, setSelectedClue, onCursorMove, readOnly]
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!puzzle || !selectedCell || readOnly) return;

      const { x, y, direction } = selectedCell;

      // Handle arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();

        let newX = x;
        let newY = y;
        let newDirection = direction;

        switch (e.key) {
          case 'ArrowUp':
            newY = Math.max(0, y - 1);
            newDirection = 'down';
            break;
          case 'ArrowDown':
            newY = Math.min(puzzle.gridHeight - 1, y + 1);
            newDirection = 'down';
            break;
          case 'ArrowLeft':
            newX = Math.max(0, x - 1);
            newDirection = 'across';
            break;
          case 'ArrowRight':
            newX = Math.min(puzzle.gridWidth - 1, x + 1);
            newDirection = 'across';
            break;
        }

        // Skip black cells
        while (
          puzzle.grid[newY]?.[newX]?.letter === null &&
          newX >= 0 &&
          newX < puzzle.gridWidth &&
          newY >= 0 &&
          newY < puzzle.gridHeight
        ) {
          switch (e.key) {
            case 'ArrowUp':
              newY--;
              break;
            case 'ArrowDown':
              newY++;
              break;
            case 'ArrowLeft':
              newX--;
              break;
            case 'ArrowRight':
              newX++;
              break;
          }
        }

        if (
          newX >= 0 &&
          newX < puzzle.gridWidth &&
          newY >= 0 &&
          newY < puzzle.gridHeight &&
          puzzle.grid[newY]?.[newX]?.letter !== null
        ) {
          const clue = findClueAtPosition(newX, newY, newDirection);
          setSelectedCell({ x: newX, y: newY, direction: newDirection });
          setSelectedClue(clue);
          onCursorMove?.(newX, newY);
        }

        return;
      }

      // Handle letter input
      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        e.preventDefault();

        // Prevent editing revealed cells
        if (cells[y]?.[x]?.isRevealed) {
          return;
        }

        const value = e.key.toUpperCase();

        updateCell(x, y, value);
        onCellUpdate?.(x, y, value);

        // Check if this completed any clues
        setTimeout(() => checkClueCompletion(x, y), 0);

        // Move to next cell
        let nextX = x;
        let nextY = y;

        if (direction === 'across') {
          nextX = x + 1;
        } else {
          nextY = y + 1;
        }

        // Skip black cells
        while (
          nextX < puzzle.gridWidth &&
          nextY < puzzle.gridHeight &&
          puzzle.grid[nextY]?.[nextX]?.letter === null
        ) {
          if (direction === 'across') {
            nextX++;
          } else {
            nextY++;
          }
        }

        if (
          nextX < puzzle.gridWidth &&
          nextY < puzzle.gridHeight &&
          puzzle.grid[nextY]?.[nextX]?.letter !== null
        ) {
          const clue = findClueAtPosition(nextX, nextY, direction);
          setSelectedCell({ x: nextX, y: nextY, direction });
          setSelectedClue(clue);
          onCursorMove?.(nextX, nextY);
        }

        return;
      }

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();

        // Prevent editing revealed cells
        if (cells[y]?.[x]?.isRevealed) {
          return;
        }

        // Clear current cell if it has a value
        if (cells[y]?.[x]?.value) {
          updateCell(x, y, null);
          onCellUpdate?.(x, y, null);
          return;
        }

        // Move to previous cell
        let prevX = x;
        let prevY = y;

        if (direction === 'across') {
          prevX = x - 1;
        } else {
          prevY = y - 1;
        }

        // Skip black cells
        while (
          prevX >= 0 &&
          prevY >= 0 &&
          puzzle.grid[prevY]?.[prevX]?.letter === null
        ) {
          if (direction === 'across') {
            prevX--;
          } else {
            prevY--;
          }
        }

        if (
          prevX >= 0 &&
          prevY >= 0 &&
          puzzle.grid[prevY]?.[prevX]?.letter !== null
        ) {
          updateCell(prevX, prevY, null);
          onCellUpdate?.(prevX, prevY, null);

          const clue = findClueAtPosition(prevX, prevY, direction);
          setSelectedCell({ x: prevX, y: prevY, direction });
          setSelectedClue(clue);
          onCursorMove?.(prevX, prevY);
        }

        return;
      }

      // Handle delete
      if (e.key === 'Delete') {
        e.preventDefault();
        updateCell(x, y, null);
        onCellUpdate?.(x, y, null);
        return;
      }

      // Handle tab to move to next blank cell
      if (e.key === 'Tab') {
        e.preventDefault();

        // Find next blank cell
        let found = false;
        let searchX = x;
        let searchY = y;
        const totalCells = puzzle.gridWidth * puzzle.gridHeight;
        let searched = 0;

        // Direction to search: forward for Tab, backward for Shift+Tab
        const searchForward = !e.shiftKey;

        while (!found && searched < totalCells) {
          if (searchForward) {
            searchX++;
            if (searchX >= puzzle.gridWidth) {
              searchX = 0;
              searchY++;
              if (searchY >= puzzle.gridHeight) {
                searchY = 0;
              }
            }
          } else {
            searchX--;
            if (searchX < 0) {
              searchX = puzzle.gridWidth - 1;
              searchY--;
              if (searchY < 0) {
                searchY = puzzle.gridHeight - 1;
              }
            }
          }

          searched++;

          // Check if this cell is not black and is empty
          const cell = puzzle.grid[searchY]?.[searchX];
          const cellValue = cells[searchY]?.[searchX]?.value;

          if (cell && cell.letter !== null && !cellValue) {
            found = true;

            // Determine direction based on available clues
            let newDirection = direction;
            let clue = findClueAtPosition(searchX, searchY, newDirection);
            if (!clue) {
              newDirection = newDirection === 'across' ? 'down' : 'across';
              clue = findClueAtPosition(searchX, searchY, newDirection);
            }

            setSelectedCell({ x: searchX, y: searchY, direction: newDirection });
            setSelectedClue(clue);
            onCursorMove?.(searchX, searchY);
          }
        }
      }
    },
    [puzzle, cells, selectedCell, findClueAtPosition, setSelectedCell, setSelectedClue, updateCell, onCellUpdate, onCursorMove, readOnly, checkClueCompletion]
  );

  // Set up keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Check if a cell is in the current word
  const isCellHighlighted = useCallback(
    (x: number, y: number): boolean => {
      if (!selectedCell || !puzzle) return false;

      const clue = findClueAtPosition(selectedCell.x, selectedCell.y, selectedCell.direction);
      if (!clue) return false;

      if (selectedCell.direction === 'across') {
        return (
          y === clue.positionY &&
          x >= clue.positionX &&
          x < clue.positionX + clue.length
        );
      } else {
        return (
          x === clue.positionX &&
          y >= clue.positionY &&
          y < clue.positionY + clue.length
        );
      }
    },
    [selectedCell, puzzle, findClueAtPosition]
  );

  // Get player cursors at a position
  const getCursorsAtPosition = useCallback(
    (x: number, y: number) => {
      return playerCursors.filter((cursor) => cursor.x === x && cursor.y === y);
    },
    [playerCursors]
  );

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="crossword-grid select-none"
      style={{
        gridTemplateColumns: `repeat(${puzzle.gridWidth}, minmax(0, 1fr))`,
        width: '100%',
        maxWidth: 'min(600px, 90vw)',
        aspectRatio: `${puzzle.gridWidth} / ${puzzle.gridHeight}`,
      }}
      role="grid"
      aria-label="Crossword puzzle grid"
      tabIndex={0}
    >
      {puzzle.grid.map((row, y) =>
        row.map((cell, x) => {
          const isBlack = cell.letter === null;
          const isSelected = selectedCell?.x === x && selectedCell?.y === y;
          const isHighlighted = !isSelected && isCellHighlighted(x, y);
          const cellValue = cells[y]?.[x]?.value;
          const isRevealed = cells[y]?.[x]?.isRevealed;
          const isCorrect = cells[y]?.[x]?.isCorrect;
          const cursorsHere = getCursorsAtPosition(x, y);

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'crossword-cell',
                isBlack && 'black',
                isSelected && 'selected',
                isHighlighted && 'highlighted',
                isRevealed && 'text-blue-600',
                isCorrect === true && 'correct',
                isCorrect === false && 'incorrect'
              )}
              onClick={() => handleCellClick(x, y)}
              role="gridcell"
              aria-label={isBlack ? "Black cell" : `Cell ${cell.number || ''}, ${cellValue || 'empty'}`}
              aria-selected={isSelected}
              tabIndex={isBlack ? -1 : 0}
            >
              {cell.number && (
                <span className="cell-number">{cell.number}</span>
              )}
              {!isBlack && (
                <span className="cell-value">{cellValue || ''}</span>
              )}
              {cursorsHere.map((cursor) => (
                <div
                  key={cursor.playerId}
                  className="player-cursor"
                  style={{ borderColor: cursor.color }}
                >
                  <span
                    className="player-cursor-label"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.displayName}
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
