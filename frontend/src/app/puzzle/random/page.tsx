'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { CluePanel, MobileClueDisplay, ClueBottomSheet } from '@/components/CluePanel';
import { Timer } from '@/components/Timer';
import { ResultsModal } from '@/components/ResultsModal';
import { GameHeader } from '@/components/Header';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';

export default function RandomPuzzlePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClueSheet, setShowClueSheet] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);

  const {
    puzzle,
    cells,
    startTime,
    setPuzzle,
    startGame,
    endGame,
    hintsUsed,
    incrementHints,
    selectedCell,
    resetGame,
  } = useGameStore();

  // Load random puzzle
  useEffect(() => {
    const loadPuzzle = async () => {
      try {
        const puzzleData = await api.getRandomPuzzle();
        setPuzzle(puzzleData);
        // Don't start timer yet - wait for first cell edit
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      } finally {
        setIsLoading(false);
      }
    };

    loadPuzzle();

    return () => {
      // Clean up on unmount
    };
  }, [setPuzzle]);

  // Check for puzzle completion
  useEffect(() => {
    if (!puzzle || !cells.length) return;

    const isComplete = puzzle.grid.every((row, y) =>
      row.every((cell, x) => {
        if (cell.letter === null) return true; // Black cell
        const userCell = cells[y]?.[x];
        return userCell?.value?.toUpperCase() === cell.letter?.toUpperCase();
      })
    );

    if (isComplete && startTime) {
      const solveTime = Math.floor((Date.now() - startTime) / 1000);
      endGame(solveTime);
      setCompletionTime(solveTime);
      setShowResults(true);
    }
  }, [cells, puzzle, startTime, endGame]);

  const handleRevealLetter = useCallback(() => {
    if (!selectedCell || !puzzle) return;

    const { x, y } = selectedCell;
    const letter = puzzle.grid[y]?.[x]?.letter;

    if (letter) {
      const { cells } = useGameStore.getState();
      const updatedCells = cells.map((row) => [...row]);
      updatedCells[y][x] = {
        ...updatedCells[y][x],
        value: letter,
        isRevealed: true,
      };
      useGameStore.getState().setCells(updatedCells);
      incrementHints();
    }
  }, [selectedCell, puzzle, incrementHints]);

  const handleRevealWord = useCallback(() => {
    if (!selectedCell || !puzzle) return;

    const { x, y } = selectedCell;
    const { cells, selectedClue } = useGameStore.getState();

    // Find the clue for the selected cell
    let targetClue = selectedClue || null;
    if (!targetClue) {
      // Try to find a clue that contains this cell
      targetClue = [...puzzle.cluesAcross, ...puzzle.cluesDown].find(
        (clue) => {
          if (clue.direction === 'across') {
            return (
              clue.positionY === y &&
              x >= clue.positionX &&
              x < clue.positionX + clue.length
            );
          } else {
            return (
              clue.positionX === x &&
              y >= clue.positionY &&
              y < clue.positionY + clue.length
            );
          }
        }
      ) || null;
    }

    if (targetClue) {
      const updatedCells = cells.map((row) => [...row]);
      const answer = targetClue.answer || '';

      for (let i = 0; i < answer.length; i++) {
        const cellX =
          targetClue.direction === 'across'
            ? targetClue.positionX + i
            : targetClue.positionX;
        const cellY =
          targetClue.direction === 'across'
            ? targetClue.positionY
            : targetClue.positionY + i;

        updatedCells[cellY][cellX] = {
          ...updatedCells[cellY][cellX],
          value: answer[i],
          isRevealed: true,
        };
      }

      useGameStore.getState().setCells(updatedCells);
      incrementHints();
    }
  }, [selectedCell, puzzle, incrementHints]);

  const handleCheckGrid = useCallback(() => {
    if (!puzzle) return;

    const { cells } = useGameStore.getState();
    const updatedCells = cells.map((row) => [...row]);

    for (let y = 0; y < puzzle.grid.length; y++) {
      for (let x = 0; x < puzzle.grid[y].length; x++) {
        const correctLetter = puzzle.grid[y][x]?.letter;
        const currentValue = cells[y]?.[x]?.value;

        if (correctLetter && currentValue) {
          const isCorrect = correctLetter === currentValue;
          updatedCells[y][x] = {
            ...updatedCells[y][x],
            isCorrect,
          };
        }
      }
    }

    useGameStore.getState().setCells(updatedCells);
  }, [puzzle]);

  const handleHome = useCallback(() => {
    resetGame();
    router.push('/');
  }, [resetGame, router]);

  const handlePlayAnother = useCallback(() => {
    resetGame();
    setShowResults(false);
    setIsLoading(true);
    setCompletionTime(null);

    const loadNewPuzzle = async () => {
      try {
        const puzzleData = await api.getRandomPuzzle();
        setPuzzle(puzzleData);
        // Don't start timer yet - wait for first cell edit
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      } finally {
        setIsLoading(false);
      }
    };

    loadNewPuzzle();
  }, [resetGame, setPuzzle]);

  if (isLoading) {
    return (
      <div className="min-h-screen fun-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-purple-600 font-medium">Loading random puzzle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen fun-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GameHeader
        title={puzzle?.title}
        showTimer
        timerComponent={<Timer startTime={startTime} />}
        showHints
        onRevealLetter={handleRevealLetter}
        onRevealWord={handleRevealWord}
        onCheckGrid={handleCheckGrid}
        hintsEnabled
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Clue Panel - Desktop */}
        <aside className="hidden lg:block w-80 border-r bg-white overflow-y-auto">
          <div className="h-1/2 border-b">
            <CluePanel direction="across" />
          </div>
          <div className="h-1/2">
            <CluePanel direction="down" />
          </div>
        </aside>

        {/* Grid Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Clue Display */}
          <div className="lg:hidden">
            <MobileClueDisplay onExpand={() => setShowClueSheet(true)} />
          </div>

          {/* Grid Container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <CrosswordGrid
              onCellUpdate={(x, y, value) => {
                // Start timer on first cell edit
                if (!startTime && value) {
                  startGame();
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Mobile Clue Bottom Sheet */}
      <ClueBottomSheet
        isOpen={showClueSheet}
        onClose={() => setShowClueSheet(false)}
      />

      {/* Results Modal */}
      <ResultsModal
        isOpen={showResults}
        solveTime={completionTime || 0}
        onClose={() => setShowResults(false)}
        onHome={handleHome}
        onRematch={handlePlayAnother}
      />
    </div>
  );
}
