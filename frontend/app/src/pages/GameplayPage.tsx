import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Volume2, 
  Clock, 
  Flame, 
  Check, 
  Lightbulb, 
  Eye, 
  RotateCcw,
  ArrowRight,
  ArrowDown
} from 'lucide-react';

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

// 7x7 Crossword puzzle data
const PUZZLE_DATA = {
  grid: [
    ['C', 'A', 'T', '', 'D', 'A', 'Y'],
    ['O', '', 'O', '', 'A', '', 'E'],
    ['L', 'I', 'M', 'E', 'R', '', 'A'],
    ['O', '', 'E', '', 'K', '', 'R'],
    ['R', '', '', '', '', '', ''],
    ['', 'A', 'R', 'E', '', '', ''],
    ['I', 'C', 'E', '', '', '', '']
  ],
  clues: {
    across: [
      { num: 1, clue: 'Feline pet that meows', answer: 'CAT', row: 0, col: 0 },
      { num: 4, clue: 'Opposite of night', answer: 'DAY', row: 0, col: 4 },
      { num: 6, clue: 'Color of grass', answer: 'LIME', row: 2, col: 0 },
      { num: 8, clue: 'You ___ here (map phrase)', answer: 'ARE', row: 5, col: 1 },
      { num: 9, clue: 'Frozen water', answer: 'ICE', row: 6, col: 0 }
    ],
    down: [
      { num: 1, clue: 'Red, blue, green, etc.', answer: 'COLOR', row: 0, col: 0 },
      { num: 2, clue: 'Toe or finger', answer: 'ARM', row: 0, col: 2 },
      { num: 3, clue: 'Opposite of light', answer: 'DARK', row: 0, col: 4 },
      { num: 5, clue: 'The year has 365 of them', answer: 'YEAR', row: 0, col: 6 },
      { num: 7, clue: 'Opposite of early', answer: 'LATE', row: 2, col: 1 }
    ]
  }
};

function GameplayPage() {
  const [grid, setGrid] = useState<GridCell[][]>(() => {
    const newGrid: GridCell[][] = [];
    for (let row = 0; row < 7; row++) {
      const rowCells: GridCell[] = [];
      for (let col = 0; col < 7; col++) {
        rowCells.push({
          row,
          col,
          letter: '',
          correctLetter: PUZZLE_DATA.grid[row][col],
          isBlocked: PUZZLE_DATA.grid[row][col] === '',
          number: undefined
        });
      }
      newGrid.push(rowCells);
    }
    
    // Add clue numbers
    PUZZLE_DATA.clues.across.forEach(c => {
      newGrid[c.row][c.col].number = c.num;
    });
    PUZZLE_DATA.clues.down.forEach(c => {
      if (!newGrid[c.row][c.col].number) {
        newGrid[c.row][c.col].number = c.num;
      }
    });
    
    return newGrid;
  });

  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [activeClue, setActiveClue] = useState<Clue | null>(PUZZLE_DATA.clues.across[0]);
  const [clueTab, setClueTab] = useState<'across' | 'down'>('across');
  const [timer, setTimer] = useState(21);
  const [progress, setProgress] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate progress
  useEffect(() => {
    const totalCells = grid.flat().filter(c => !c.isBlocked).length;
    const filledCells = grid.flat().filter(c => !c.isBlocked && c.letter !== '').length;
    setProgress(Math.round((filledCells / totalCells) * 100));
  }, [grid]);

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
        ? PUZZLE_DATA.clues.across.find(c => c.num === cellNum && c.row === row)
        : PUZZLE_DATA.clues.down.find(c => c.num === cellNum && c.col === col);
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
      if (direction === 'across' && col < 6 && !grid[row][col + 1]?.isBlocked) {
        setSelectedCell({ row, col: col + 1 });
      } else if (direction === 'down' && row < 6 && !grid[row + 1]?.[col]?.isBlocked) {
        setSelectedCell({ row: row + 1, col });
      }
    } else if (e.key === 'ArrowRight') {
      let newCol = col + 1;
      while (newCol < 7 && grid[row][newCol]?.isBlocked) newCol++;
      if (newCol < 7) setSelectedCell({ row, col: newCol });
    } else if (e.key === 'ArrowLeft') {
      let newCol = col - 1;
      while (newCol >= 0 && grid[row][newCol]?.isBlocked) newCol--;
      if (newCol >= 0) setSelectedCell({ row, col: newCol });
    } else if (e.key === 'ArrowDown') {
      let newRow = row + 1;
      while (newRow < 7 && grid[newRow]?.[col]?.isBlocked) newRow++;
      if (newRow < 7) setSelectedCell({ row: newRow, col });
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
      const acrossClue = PUZZLE_DATA.clues.across.find(c => 
        c.row === activeClue.row && c.col <= (selectedCell?.col || c.col) && 
        (selectedCell?.col || c.col) < c.col + c.answer.length
      );
      if (acrossClue) {
        for (let i = 0; i < acrossClue.answer.length; i++) {
          newGrid[acrossClue.row][acrossClue.col + i].letter = acrossClue.answer[i];
        }
      }
    } else {
      const downClue = PUZZLE_DATA.clues.down.find(c => 
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

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8" />
              <span className="font-display font-semibold text-[#2A1E5C]">Crossy</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Home className="w-5 h-5" />
              </Link>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Title Bar */}
      <div className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-[#2A1E5C]">Tuesday Crossword</h1>
              <p className="font-display text-sm text-[#6B5CA8]">Easy • 7×7</p>
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
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
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
              Across ({PUZZLE_DATA.clues.across.length})
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
              Down ({PUZZLE_DATA.clues.down.length})
            </button>
          </div>

          {/* Clue List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {PUZZLE_DATA.clues[clueTab].map((clue) => (
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
    </div>
  );
}

export default GameplayPage;
