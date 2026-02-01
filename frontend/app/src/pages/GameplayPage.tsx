import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Flame,
  Check,
  Lightbulb,
  Eye,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { puzzleApi } from '../lib/api';
import { userApi } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Header } from '@/components/Header';
import type { Puzzle } from '../types/api';

// Types
interface GridCell {
  row: number;
  col: number;
  letter: string;
  correctLetter: string;
  isBlocked: boolean;
  number?: number;
}

interface Clue {
  num: number;
  direction?: 'across' | 'down';
  clue: string;
  answer: string;
  row: number;
  col: number;
}

function GameplayPage() {
  // Get date from URL query parameters
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  // Puzzle data state
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [cluesAcross, setCluesAcross] = useState<Clue[]>([]);
  const [cluesDown, setCluesDown] = useState<Clue[]>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [activeClue, setActiveClue] = useState<Clue | null>(null);
  const [clueTab, setClueTab] = useState<'across' | 'down'>('across');
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Fetch puzzle on mount (or when date param changes)
  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        setLoading(true);
        setError(null);
        // If a date parameter is provided, fetch that specific puzzle from the archive
        // Otherwise, fetch today's puzzle
        const fetchedPuzzle = dateParam
          ? await puzzleApi.getPuzzleByDate({ date: dateParam })
          : await puzzleApi.getTodayPuzzle();
        setPuzzle(fetchedPuzzle);
        initializeGridFromPuzzle(fetchedPuzzle);
        startTimeRef.current = Date.now();
      } catch (err: unknown) {
        console.error('Failed to fetch puzzle:', err);
        const errorMessage = err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to load puzzle. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzle();
  }, [dateParam]);

  // Initialize grid from puzzle data
  const initializeGridFromPuzzle = (puzzleData: Puzzle) => {
    const newGrid: GridCell[][] = [];

    // Create grid from puzzle - cast to GridCell[][] to avoid type issues
    const puzzleGrid = puzzleData.grid as import('../types/api').GridCell[][];

    // Create grid from puzzle
    for (let row = 0; row < puzzleData.gridHeight; row++) {
      const rowCells: GridCell[] = [];
      for (let col = 0; col < puzzleData.gridWidth; col++) {
        const cell = puzzleGrid[row][col];
        rowCells.push({
          row,
          col,
          letter: '',
          correctLetter: cell.letter || '',
          isBlocked: cell.letter === null,
          number: cell.number
        });
      }
      newGrid.push(rowCells);
    }

    setGrid(newGrid);

    // Map clues from API format to UI format
    const mappedAcross = puzzleData.cluesAcross.map(c => ({
      num: c.number,
      direction: 'across' as const,
      clue: c.text,
      answer: c.answer,
      row: c.positionY,
      col: c.positionX
    }));

    const mappedDown = puzzleData.cluesDown.map(c => ({
      num: c.number,
      direction: 'down' as const,
      clue: c.text,
      answer: c.answer,
      row: c.positionY,
      col: c.positionX
    }));

    setCluesAcross(mappedAcross);
    setCluesDown(mappedDown);
    setActiveClue(mappedAcross[0] || null);
  };

  // Retry loading puzzle
  const retryLoadPuzzle = () => {
    setLoading(true);
    setError(null);
    const puzzlePromise = dateParam
      ? puzzleApi.getPuzzleByDate({ date: dateParam })
      : puzzleApi.getTodayPuzzle();
    puzzlePromise
      .then(fetchedPuzzle => {
        setPuzzle(fetchedPuzzle);
        initializeGridFromPuzzle(fetchedPuzzle);
        startTimeRef.current = Date.now();
      })
      .catch(err => {
        console.error('Failed to fetch puzzle:', err);
        setError(err?.message || 'Failed to load puzzle. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Timer effect
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error]);

  // Handle puzzle completion
  const handlePuzzleComplete = useCallback(async () => {
    if (!puzzle || isSaving) return;

    setShowSuccessModal(true);
    setIsSaving(true);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await userApi.savePuzzleHistory({
        puzzleId: puzzle.id,
        completedAt: new Date().toISOString(),
        timeTaken,
        moveCount: 0, // Not tracking moves for now
        solved: true
      });
    } catch (err) {
      console.error('Failed to save puzzle history:', err);
      // Continue even if save fails - user still completed the puzzle
    } finally {
      setIsSaving(false);
    }
  }, [puzzle, isSaving]);

  // Calculate progress and check for completion
  useEffect(() => {
    if (grid.length === 0) return;

    const totalCells = grid.flat().filter(c => !c.isBlocked).length;
    const filledCells = grid.flat().filter(c => !c.isBlocked && c.letter !== '').length;
    const newProgress = Math.round((filledCells / totalCells) * 100);
    setProgress(newProgress);

    // Check if puzzle is complete and correct
    if (newProgress === 100) {
      const allCorrect = grid.flat().every(cell => {
        if (cell.isBlocked) return true;
        return cell.letter === cell.correctLetter;
      });

      if (allCorrect && puzzle && !showSuccessModal) {
        handlePuzzleComplete();
      }
    }
  }, [grid, puzzle, showSuccessModal, handlePuzzleComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (row: number, col: number) => {
    if (grid[row][col].isBlocked) return;
    
    // If clicking same cell, toggle direction
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection(d => d === 'across' ? 'down' : 'across');
    }
    
    setSelectedCell({ row, col });
    setShowCheck(false);
    
    // Find the active clue
    const cellNum = grid[row][col].number;
    if (cellNum) {
      const clue = direction === 'across'
        ? cluesAcross.find(c => c.num === cellNum && c.row === row)
        : cluesDown.find(c => c.num === cellNum && c.col === col);
      if (clue) setActiveClue(clue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    
    if (e.key === 'Backspace') {
      const newGrid = [...grid];
      newGrid[row][col].letter = '';
      setGrid(newGrid);
      setShowCheck(false);
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      const newGrid = [...grid];
      newGrid[row][col].letter = e.key.toUpperCase();
      setGrid(newGrid);
      setShowCheck(false);
      
      // Auto-advance
      const maxCol = grid[0]?.length || 0;
      const maxRow = grid.length || 0;
      if (direction === 'across' && col < maxCol - 1 && !grid[row][col + 1]?.isBlocked) {
        setSelectedCell({ row, col: col + 1 });
      } else if (direction === 'down' && row < maxRow - 1 && !grid[row + 1]?.[col]?.isBlocked) {
        setSelectedCell({ row: row + 1, col });
      }
    } else if (e.key === 'ArrowRight') {
      const maxCol = grid[0]?.length || 0;
      let newCol = col + 1;
      while (newCol < maxCol && grid[row][newCol]?.isBlocked) newCol++;
      if (newCol < maxCol) setSelectedCell({ row, col: newCol });
    } else if (e.key === 'ArrowLeft') {
      let newCol = col - 1;
      while (newCol >= 0 && grid[row][newCol]?.isBlocked) newCol--;
      if (newCol >= 0) setSelectedCell({ row, col: newCol });
    } else if (e.key === 'ArrowDown') {
      const maxRow = grid.length || 0;
      let newRow = row + 1;
      while (newRow < maxRow && grid[newRow]?.[col]?.isBlocked) newRow++;
      if (newRow < maxRow) setSelectedCell({ row: newRow, col });
    } else if (e.key === 'ArrowUp') {
      let newRow = row - 1;
      while (newRow >= 0 && grid[newRow]?.[col]?.isBlocked) newRow--;
      if (newRow >= 0) setSelectedCell({ row: newRow, col });
    }
  };

  const checkAnswers = () => {
    const newChecked = new Set<string>();
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell.isBlocked && cell.letter) {
          newChecked.add(`${r}-${c}`);
        }
      });
    });
    setCheckedCells(newChecked);
    setShowCheck(true);
  };

  const revealLetter = () => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      const newGrid = [...grid];
      newGrid[row][col].letter = newGrid[row][col].correctLetter;
      setGrid(newGrid);
    }
  };

  const revealWord = () => {
    if (!activeClue) return;
    const newGrid = [...grid];

    if (activeClue.direction === 'across' || direction === 'across') {
      // Find the across clue for selected cell
      const acrossClue = cluesAcross.find(c =>
        c.row === activeClue.row && c.col <= (selectedCell?.col || c.col) &&
        (selectedCell?.col || c.col) < c.col + c.answer.length
      );
      if (acrossClue) {
        for (let i = 0; i < acrossClue.answer.length; i++) {
          newGrid[acrossClue.row][acrossClue.col + i].letter = acrossClue.answer[i];
        }
      }
    } else {
      const downClue = cluesDown.find(c =>
        c.col === activeClue.col && c.row <= (selectedCell?.row || c.row) &&
        (selectedCell?.row || c.row) < c.row + c.answer.length
      );
      if (downClue) {
        for (let i = 0; i < downClue.answer.length; i++) {
          newGrid[downClue.row + i][downClue.col].letter = downClue.answer[i];
        }
      }
    }
    setGrid(newGrid);
  };

  const resetGrid = () => {
    const newGrid = grid.map(row => 
      row.map(cell => ({ ...cell, letter: '' }))
    );
    setGrid(newGrid);
    setShowCheck(false);
    setCheckedCells(new Set());
  };

  const isCellCorrect = (row: number, col: number) => {
    return grid[row][col].letter === grid[row][col].correctLetter;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        <Header />
        {/* Add spacing for fixed header */}
        <div className="h-16" />

        {/* Loading skeleton */}
        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-96 w-96 mx-auto rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        <Header />
        {/* Add spacing for fixed header */}
        <div className="h-16" />

        {/* Error message */}
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="crossy-card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-[#FF4D6A] mx-auto mb-4" />
            <h2 className="font-display font-bold text-xl text-[#2A1E5C] mb-2">
              Oops! Something went wrong
            </h2>
            <p className="font-display text-[#6B5CA8] mb-6">
              {error}
            </p>
            <button
              onClick={retryLoadPuzzle}
              className="flex items-center gap-2 px-6 py-3 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <Header />
      {/* Add spacing for fixed header */}
      <div className="h-16" />

      {/* Title Bar */}
      <div className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-[#2A1E5C]">{puzzle?.title || 'Crossword Puzzle'}</h1>
              <p className="font-display text-sm text-[#6B5CA8]">
                {puzzle?.difficulty ? puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1) : ''} • {puzzle?.gridWidth}×{puzzle?.gridHeight}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-[#F3F1FF] px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-[#7B61FF]" />
                <span className="font-display text-sm text-[#6B5CA8]">{formatTime(timer)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F3F1FF] px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-[#FF4D6A]" />
                <span className="font-display text-sm text-[#6B5CA8]">12</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Clue Bar */}
      <div className="bg-[#7B61FF]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDirection('across')}
              className={`px-3 py-1 rounded-full text-xs font-display font-semibold transition-colors ${
                direction === 'across' ? 'bg-white text-[#7B61FF]' : 'bg-[#6B51EF] text-white/70'
              }`}
            >
              {activeClue?.num || 1} ACROSS
            </button>
            <button 
              onClick={() => setDirection('down')}
              className={`px-3 py-1 rounded-full text-xs font-display font-semibold transition-colors ${
                direction === 'down' ? 'bg-white text-[#7B61FF]' : 'bg-[#6B51EF] text-white/70'
              }`}
            >
              {activeClue?.num || 1} DOWN
            </button>
            <span className="font-display text-white text-sm ml-2">
              {activeClue?.clue || 'Feline pet that meows'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Grid */}
        <div className="flex justify-center mb-6 relative">
          {/* Crossy mascot peeking from top-right */}
          <img 
            src="/crossy-main.png" 
            alt="Crossy" 
            className="absolute -top-4 -right-2 w-12 h-12 sm:w-14 sm:h-14 z-20"
          />
          
          {/* Grid Container - white background with rounded corners */}
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="relative bg-white rounded-2xl p-3 outline-none shadow-lg"
          >
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${puzzle?.gridWidth || 7}, 1fr)` }}
            >
              {grid.map((row, rowIndex) => (
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    className={`
                      relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center
                      text-base sm:text-lg font-display font-bold
                      rounded-lg border-2 cursor-pointer select-none
                      transition-all duration-150
                      ${cell.isBlocked 
                        ? 'bg-[#2A1E5C] border-[#2A1E5C]' 
                        : selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                          ? 'bg-[#7B61FF] border-[#7B61FF] text-white shadow-inner'
                          : showCheck && checkedCells.has(`${rowIndex}-${colIndex}`)
                            ? isCellCorrect(rowIndex, colIndex)
                              ? 'bg-[#2ECC71] border-[#2ECC71] text-white'
                              : 'bg-[#FF4D6A] border-[#FF4D6A] text-white'
                            : 'bg-white border-[#7B61FF] text-[#2A1E5C] hover:bg-[#F3F1FF]'
                      }
                    `}
                  >
                    {cell.number && (
                      <span className="absolute top-0.5 left-1 text-[8px] font-display font-bold text-[#7B61FF] leading-none">
                        {cell.number}
                      </span>
                    )}
                    <span className="relative z-10">{cell.letter}</span>
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>

        {/* Clues Panel */}
        <div className="crossy-card p-4 mb-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setClueTab('across')}
              className={`flex-1 py-2 px-4 rounded-full font-display text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                clueTab === 'across'
                  ? 'bg-[#7B61FF] text-white'
                  : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              Across ({cluesAcross.length})
            </button>
            <button
              onClick={() => setClueTab('down')}
              className={`flex-1 py-2 px-4 rounded-full font-display text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                clueTab === 'down'
                  ? 'bg-[#7B61FF] text-white'
                  : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              Down ({cluesDown.length})
            </button>
          </div>

          {/* Clue List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(clueTab === 'across' ? cluesAcross : cluesDown).map((clue) => (
              <button
                key={`${clueTab}-${clue.num}`}
                onClick={() => {
                  setDirection(clueTab);
                  setActiveClue({ ...clue, direction: clueTab });
                  setSelectedCell({ row: clue.row, col: clue.col });
                }}
                className={`w-full text-left p-3 rounded-xl transition-colors ${
                  activeClue?.num === clue.num && activeClue?.direction === clueTab
                    ? 'bg-[#7B61FF]/10 border border-[#7B61FF]'
                    : 'bg-[#F3F1FF] hover:bg-[#ECE9FF]'
                }`}
              >
                <span className="font-display font-semibold text-[#7B61FF] mr-2">{clue.num}.</span>
                <span className="font-display text-[#2A1E5C]">{clue.clue}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button 
            onClick={checkAnswers}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
          >
            <Check className="w-4 h-4" />
            Check
          </button>
          <button 
            onClick={revealLetter}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2A1E5C] font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
          >
            <Lightbulb className="w-4 h-4" />
            Letter
          </button>
          <button 
            onClick={revealWord}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2A1E5C] font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
          >
            <Eye className="w-4 h-4" />
            Word
          </button>
          <button 
            onClick={resetGrid}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2A1E5C] font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Progress Bar */}
        <div className="crossy-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm text-[#6B5CA8]">Progress</span>
            <span className="font-display text-sm text-[#6B5CA8]">{progress}%</span>
          </div>
          <div className="h-3 bg-[#F3F1FF] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#7B61FF] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Crossy with speech bubble */}
        <div className="flex justify-center">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-4 py-2 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">Type to fill!</p>
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img src="/crossy-main.png" alt="Crossy" className="w-16 h-16" />
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border-2 border-[#2A1E5C] shadow-[0_8px_0_#2A1E5C]">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#7B61FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h2 className="font-display font-bold text-2xl text-[#2A1E5C] mb-2">
                Puzzle Complete!
              </h2>
              <p className="font-display text-[#6B5CA8] mb-6">
                Great job! You solved the puzzle.
              </p>

              {/* Stats */}
              <div className="bg-[#F3F1FF] rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-sm text-[#6B5CA8]">Time</span>
                  <span className="font-display font-semibold text-[#2A1E5C]">{formatTime(timer)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-sm text-[#6B5CA8]">Difficulty</span>
                  <span className="font-display font-semibold text-[#2A1E5C]">
                    {puzzle?.difficulty ? puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#6B5CA8]">Grid Size</span>
                  <span className="font-display font-semibold text-[#2A1E5C]">
                    {puzzle?.gridWidth}×{puzzle?.gridHeight}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/"
                  className="flex-1 py-3 bg-white text-[#2A1E5C] font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all text-center"
                >
                  Home
                </Link>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-3 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
                >
                  View Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameplayPage;
