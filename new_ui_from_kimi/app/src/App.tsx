import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { 
  RotateCcw, Lightbulb, Check, Eye, 
  Flame, Clock, Volume2, Home, ChevronUp, ChevronDown
} from 'lucide-react';
import './App.css';

// Types
interface CrosswordCell {
  row: number;
  col: number;
  letter: string;
  correctLetter: string;
  isBlocked: boolean;
  number?: number;
  isRevealed: boolean;
}

// Sample 7x7 crossword puzzle
const PUZZLE_DATA = {
  title: "Tuesday Crossword",
  author: "CrossPlay AI",
  difficulty: "Easy",
  size: 7,
  clues: {
    across: [
      { number: 1, text: "Feline pet that meows", answer: "CAT", row: 0, col: 0 },
      { number: 4, text: "Opposite of night", answer: "DAY", row: 0, col: 4 },
      { number: 6, text: "Color of grass", answer: "GREEN", row: 2, col: 0 },
      { number: 8, text: "You ___ here (map phrase)", answer: "ARE", row: 2, col: 4 },
      { number: 9, text: "Frozen water", answer: "ICE", row: 4, col: 0 },
      { number: 10, text: "Goes up", answer: "RISES", row: 4, col: 4 },
      { number: 12, text: "Small insect that buzzes", answer: "FLY", row: 6, col: 0 },
    ],
    down: [
      { number: 1, text: "Color of the sky", answer: "CYAN", row: 0, col: 0 },
      { number: 2, text: "Greeting word", answer: "ALOHA", row: 0, col: 2 },
      { number: 3, text: "Not young", answer: "AGED", row: 0, col: 4 },
      { number: 5, text: "Yes in German", answer: "JA", row: 0, col: 6 },
      { number: 7, text: "Narrow waterway", answer: "RILL", row: 2, col: 2 },
      { number: 9, text: "Frozen dessert", answer: "ICE", row: 4, col: 0 },
      { number: 11, text: "Large body of water", answer: "SEA", row: 4, col: 4 },
    ]
  }
};

// Initialize grid from puzzle data
function initializeGrid(): CrosswordCell[][] {
  const size = PUZZLE_DATA.size;
  const grid: CrosswordCell[][] = [];
  
  for (let row = 0; row < size; row++) {
    const rowCells: CrosswordCell[] = [];
    for (let col = 0; col < size; col++) {
      rowCells.push({
        row,
        col,
        letter: '',
        correctLetter: '',
        isBlocked: true,
        isRevealed: false
      });
    }
    grid.push(rowCells);
  }
  
  // Fill in across answers
  PUZZLE_DATA.clues.across.forEach(clue => {
    const { row, col, answer, number } = clue;
    for (let i = 0; i < answer.length; i++) {
      const c = col + i;
      if (c < size) {
        grid[row][c].correctLetter = answer[i];
        grid[row][c].isBlocked = false;
        if (i === 0) {
          grid[row][c].number = number;
        }
      }
    }
  });
  
  // Fill in down answers
  PUZZLE_DATA.clues.down.forEach(clue => {
    const { row, col, answer, number } = clue;
    for (let i = 0; i < answer.length; i++) {
      const r = row + i;
      if (r < size) {
        grid[r][col].correctLetter = answer[i];
        grid[r][col].isBlocked = false;
        if (i === 0 && !grid[r][col].number) {
          grid[r][col].number = number;
        }
      }
    }
  });
  
  return grid;
}

// Navigation Component
function GameNavigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-2 group">
            <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-pixel text-xs text-[#2A1E5C]">Crossy</span>
          </a>
          
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F3F1FF] text-[#2A1E5C] hover:bg-[#ECE9FF] transition-colors">
              <Home className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F3F1FF] text-[#2A1E5C] hover:bg-[#ECE9FF] transition-colors">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Main Game Page
export default function App() {
  const [grid, setGrid] = useState<CrosswordCell[][]>(initializeGrid);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [timer, setTimer] = useState(0);
  const [isPaused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(12);
  const [completed, setCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCluesPanel, setShowCluesPanel] = useState(false);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Timer
  useEffect(() => {
    if (!isPaused && !completed) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, completed]);
  
  // Check completion
  useEffect(() => {
    const isComplete = grid.every(row => 
      row.every(cell => cell.isBlocked || cell.letter === cell.correctLetter)
    );
    
    const hasLetters = grid.some(row => 
      row.some(cell => !cell.isBlocked && cell.letter !== '')
    );
    
    if (isComplete && hasLetters && !completed) {
      setCompleted(true);
      setShowCelebration(true);
      setStreak(s => s + 1);
      
      gsap.fromTo('.celebration-crossy',
        { scale: 0, rotation: -20 },
        { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, [grid, completed]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCellClick = (row: number, col: number) => {
    if (grid[row][col].isBlocked) return;
    
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ row, col });
    }
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || completed) return;
    const { row, col } = selectedCell;
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const newGrid = [...grid];
      if (newGrid[row][col].letter !== '') {
        newGrid[row][col].letter = '';
        newGrid[row][col].isRevealed = false;
      } else {
        if (direction === 'across' && col > 0) {
          let prevCol = col - 1;
          while (prevCol >= 0 && grid[row][prevCol].isBlocked) prevCol--;
          if (prevCol >= 0) setSelectedCell({ row, col: prevCol });
        } else if (direction === 'down' && row > 0) {
          let prevRow = row - 1;
          while (prevRow >= 0 && grid[prevRow][col].isBlocked) prevRow--;
          if (prevRow >= 0) setSelectedCell({ row: prevRow, col });
        }
      }
      setGrid(newGrid);
    } else if (e.key === ' ') {
      e.preventDefault();
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      const newGrid = [...grid];
      newGrid[row][col].letter = e.key.toUpperCase();
      newGrid[row][col].isRevealed = false;
      setGrid(newGrid);
      
      if (direction === 'across') {
        let nextCol = col + 1;
        while (nextCol < PUZZLE_DATA.size && grid[row][nextCol].isBlocked) nextCol++;
        if (nextCol < PUZZLE_DATA.size) setSelectedCell({ row, col: nextCol });
      } else {
        let nextRow = row + 1;
        while (nextRow < PUZZLE_DATA.size && grid[nextRow][col].isBlocked) nextRow++;
        if (nextRow < PUZZLE_DATA.size) setSelectedCell({ row: nextRow, col });
      }
    } else if (e.key === 'ArrowRight') {
      let nextCol = col + 1;
      while (nextCol < PUZZLE_DATA.size && grid[row][nextCol].isBlocked) nextCol++;
      if (nextCol < PUZZLE_DATA.size) setSelectedCell({ row, col: nextCol });
    } else if (e.key === 'ArrowLeft') {
      let prevCol = col - 1;
      while (prevCol >= 0 && grid[row][prevCol].isBlocked) prevCol--;
      if (prevCol >= 0) setSelectedCell({ row, col: prevCol });
    } else if (e.key === 'ArrowDown') {
      let nextRow = row + 1;
      while (nextRow < PUZZLE_DATA.size && grid[nextRow][col].isBlocked) nextRow++;
      if (nextRow < PUZZLE_DATA.size) setSelectedCell({ row: nextRow, col });
    } else if (e.key === 'ArrowUp') {
      let prevRow = row - 1;
      while (prevRow >= 0 && grid[prevRow][col].isBlocked) prevRow--;
      if (prevRow >= 0) setSelectedCell({ row: prevRow, col });
    }
  }, [selectedCell, direction, grid, completed]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const revealLetter = () => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const newGrid = [...grid];
    newGrid[row][col].letter = newGrid[row][col].correctLetter;
    newGrid[row][col].isRevealed = true;
    setGrid(newGrid);
  };
  
  const checkPuzzle = () => {
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };
  
  const revealWord = () => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const newGrid = [...grid];
    
    const clue = direction === 'across' 
      ? PUZZLE_DATA.clues.across.find(c => 
          c.row === row && col >= c.col && col < c.col + c.answer.length
        )
      : PUZZLE_DATA.clues.down.find(c => 
          c.col === col && row >= c.row && row < c.row + c.answer.length
        );
    
    if (clue) {
      for (let i = 0; i < clue.answer.length; i++) {
        const r = direction === 'across' ? clue.row : clue.row + i;
        const c = direction === 'across' ? clue.col + i : clue.col;
        if (r < PUZZLE_DATA.size && c < PUZZLE_DATA.size) {
          newGrid[r][c].letter = clue.answer[i];
          newGrid[r][c].isRevealed = true;
        }
      }
    }
    setGrid(newGrid);
  };
  
  const resetPuzzle = () => {
    setGrid(initializeGrid());
    setSelectedCell(null);
    setTimer(0);
    setCompleted(false);
    setShowCelebration(false);
  };
  
  const getActiveClue = () => {
    if (!selectedCell) return null;
    const { row, col } = selectedCell;
    
    if (direction === 'across') {
      return PUZZLE_DATA.clues.across.find(c => 
        c.row === row && col >= c.col && col < c.col + c.answer.length
      );
    } else {
      return PUZZLE_DATA.clues.down.find(c => 
        c.col === col && row >= c.row && row < c.row + c.answer.length
      );
    }
  };
  
  const getOtherDirectionClue = () => {
    if (!selectedCell) return null;
    const { row, col } = selectedCell;
    const otherDir = direction === 'across' ? 'down' : 'across';
    
    if (otherDir === 'across') {
      return PUZZLE_DATA.clues.across.find(c => 
        c.row === row && col >= c.col && col < c.col + c.answer.length
      );
    } else {
      return PUZZLE_DATA.clues.down.find(c => 
        c.col === col && row >= c.row && row < c.row + c.answer.length
      );
    }
  };
  
  const activeClue = getActiveClue();
  const otherClue = getOtherDirectionClue();
  
  const progressPercent = Math.round((grid.flat().filter(c => !c.isBlocked && c.letter === c.correctLetter).length / 
    grid.flat().filter(c => !c.isBlocked).length) * 100);
  
  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <GameNavigation />
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="celebration-crossy crossy-card p-8 text-center max-w-sm mx-4">
            <img src="/crossy-cheer.png" alt="Crossy" className="w-24 h-auto mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-[#2A1E5C] mb-2">Puzzle Complete!</h2>
            <p className="font-display text-[#6B5CA8] mb-4">
              Time: {formatTime(timer)} • Streak: {streak} days
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowCelebration(false)} className="crossy-button">
                Keep Playing
              </button>
              <button onClick={resetPuzzle} className="crossy-button-secondary">
                New Puzzle
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="pt-16 pb-8">
        {/* Header - Compact */}
        <div className="bg-white border-b-2 border-[#2A1E5C]/10 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-lg text-[#2A1E5C]">{PUZZLE_DATA.title}</h1>
              <p className="text-xs text-[#6B5CA8]">{PUZZLE_DATA.difficulty} • {PUZZLE_DATA.size}×{PUZZLE_DATA.size}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3F1FF]">
                <Clock className="w-3.5 h-3.5 text-[#7B61FF]" />
                <span className="font-display font-semibold text-sm text-[#2A1E5C]">{formatTime(timer)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFF5F5] to-white">
                <Flame className="w-3.5 h-3.5 text-[#FF4D6A]" />
                <span className="font-display font-bold text-sm text-[#2A1E5C]">{streak}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Clue Bar - Prominent */}
        <div className="bg-[#7B61FF] px-4 py-4 sticky top-14 z-40">
          <div className="max-w-5xl mx-auto">
            {activeClue ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-lg bg-white text-[#7B61FF] text-xs font-display font-bold">
                    {activeClue.number} {direction.toUpperCase()}
                  </span>
                  {otherClue && (
                    <button 
                      onClick={() => setDirection(d => d === 'across' ? 'down' : 'across')}
                      className="px-2 py-0.5 rounded-lg bg-[#7B61FF]/50 text-white text-xs font-display hover:bg-[#7B61FF]/70 transition-colors"
                    >
                      {otherClue.number} {direction === 'across' ? 'DOWN' : 'ACROSS'}
                    </button>
                  )}
                </div>
                <p className="font-display text-white text-lg leading-snug">{activeClue.text}</p>
              </div>
            ) : (
              <p className="font-display text-white/80 text-center">Tap a square to see the clue</p>
            )}
          </div>
        </div>
        
        {/* Main Game Area */}
        <div className="px-4 py-6">
          <div className="max-w-5xl mx-auto">
            {/* Grid - Centered and Large */}
            <div className="flex justify-center mb-6">
              <div className="crossy-card p-3 sm:p-4 relative inline-block">
                {/* Crossy peeking */}
                <div className="absolute -top-4 -right-2 z-10">
                  <img src="/crossy-cool.png" alt="Crossy" className="w-12 h-auto" />
                </div>
                
                <div 
                  ref={gridRef}
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${PUZZLE_DATA.size}, 1fr)` }}
                >
                  {grid.map((row, rowIdx) => (
                    row.map((cell, colIdx) => {
                      const isInActiveWord = activeClue && (
                        direction === 'across'
                          ? rowIdx === activeClue.row && colIdx >= activeClue.col && colIdx < activeClue.col + activeClue.answer.length
                          : colIdx === activeClue.col && rowIdx >= activeClue.row && rowIdx < activeClue.row + activeClue.answer.length
                      );
                      
                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          onClick={() => handleCellClick(rowIdx, colIdx)}
                          className={`
                            game-cell-large relative
                            ${cell.isBlocked ? 'blocked' : ''}
                            ${selectedCell?.row === rowIdx && selectedCell?.col === colIdx ? 'selected' : ''}
                            ${isInActiveWord && !cell.isBlocked ? 'active-word' : ''}
                            ${showHint && cell.letter && cell.letter !== cell.correctLetter ? 'incorrect' : ''}
                            ${cell.isRevealed ? 'revealed' : ''}
                          `}
                        >
                          {cell.number && (
                            <span className="absolute top-0.5 left-0.5 text-[9px] font-display text-[#6B5CA8] leading-none">
                              {cell.number}
                            </span>
                          )}
                          {cell.letter}
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>
            
            {/* Mobile: Toggle Clues Button */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowCluesPanel(!showCluesPanel)}
                className="w-full crossy-card p-3 flex items-center justify-between"
              >
                <span className="font-display font-semibold text-[#2A1E5C]">
                  {direction === 'across' ? '→ Across' : '↓ Down'} Clues
                </span>
                {showCluesPanel ? <ChevronUp className="w-5 h-5 text-[#7B61FF]" /> : <ChevronDown className="w-5 h-5 text-[#7B61FF]" />}
              </button>
            </div>
            
            {/* Clues Panel - Collapsible on mobile */}
            <div className={`${showCluesPanel ? 'block' : 'hidden'} lg:block mb-6`}>
              <div className="crossy-card p-4">
                {/* Direction Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setDirection('across')}
                    className={`flex-1 py-2 px-3 rounded-xl font-display font-semibold text-sm transition-colors ${
                      direction === 'across'
                        ? 'bg-[#7B61FF] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    → Across ({PUZZLE_DATA.clues.across.length})
                  </button>
                  <button
                    onClick={() => setDirection('down')}
                    className={`flex-1 py-2 px-3 rounded-xl font-display font-semibold text-sm transition-colors ${
                      direction === 'down'
                        ? 'bg-[#7B61FF] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    ↓ Down ({PUZZLE_DATA.clues.down.length})
                  </button>
                </div>
                
                {/* Clues List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {(direction === 'across' ? PUZZLE_DATA.clues.across : PUZZLE_DATA.clues.down).map(clue => {
                    const isActive = activeClue?.number === clue.number && direction === (direction === 'across' ? 'across' : 'down');
                    const isComplete = clue.answer.split('').every((_, i) => {
                      const r = direction === 'across' ? clue.row : clue.row + i;
                      const c = direction === 'across' ? clue.col + i : clue.col;
                      return grid[r]?.[c]?.letter === clue.answer[i];
                    });
                    
                    return (
                      <button
                        key={clue.number}
                        onClick={() => {
                          setDirection(direction);
                          setSelectedCell({ row: clue.row, col: clue.col });
                          setShowCluesPanel(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-[#7B61FF]/10 border-2 border-[#7B61FF]'
                            : isComplete
                            ? 'bg-[#2ECC71]/10 border-2 border-[#2ECC71]'
                            : 'bg-[#F3F1FF] hover:bg-[#ECE9FF] border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`font-display font-bold text-sm ${
                            isComplete ? 'text-[#2ECC71]' : isActive ? 'text-[#7B61FF]' : 'text-[#6B5CA8]'
                          }`}>
                            {clue.number}.
                          </span>
                          <span className={`font-display text-sm ${
                            isComplete ? 'text-[#2ECC71]' : 'text-[#2A1E5C]'
                          }`}>
                            {clue.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button onClick={checkPuzzle} className="crossy-button flex items-center gap-2 text-sm py-2 px-4">
                <Check className="w-4 h-4" />
                Check
              </button>
              <button 
                onClick={revealLetter}
                disabled={!selectedCell}
                className="crossy-button-secondary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4" />
                Letter
              </button>
              <button 
                onClick={revealWord}
                disabled={!selectedCell}
                className="crossy-button-secondary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                Word
              </button>
              <button onClick={resetPuzzle} className="crossy-button-secondary flex items-center gap-2 text-sm py-2 px-4">
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
            
            {/* Progress */}
            <div className="mt-6 crossy-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-xs text-[#6B5CA8]">Progress</span>
                <span className="font-display font-semibold text-xs text-[#2A1E5C]">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-[#F3F1FF] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#7B61FF] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Helpful Crossy */}
        <div className="flex justify-center px-4">
          <div className="flex items-end gap-3">
            <div className="speech-bubble mb-2 !p-3 !rounded-xl">
              <p className="font-display text-sm text-[#2A1E5C]">
                {completed 
                  ? "🎉 You solved it!" 
                  : selectedCell 
                    ? "Type to fill!" 
                    : "Tap a square!"}
              </p>
            </div>
            <img 
              src={completed ? "/crossy-cheer.png" : "/crossy-hint.png"} 
              alt="Crossy" 
              className="w-16 h-auto bob-animation" 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
