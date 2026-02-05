import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Zap,
  Check,
  Lightbulb,
  Trophy,
  Flame,
  Target,
  Mail,
  ChevronDown,
  Star,
  Heart,
  ArrowRight
} from 'lucide-react';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';

gsap.registerPlugin(ScrollTrigger);

// Types
interface GridCell {
  row: number;
  col: number;
  letter: string;
  correctLetter: string;
  isBlocked: boolean;
  number?: number;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

interface Step {
  num: string;
  title: string;
  desc: string;
}

interface Testimonial {
  quote: string;
  name: string;
}

interface FAQ {
  q: string;
  a: string;
}

interface ArchivePuzzle {
  title: string;
  size: string;
  difficulty: string;
  date: string;
}

// Navbar Component with scroll detection
function Navbar() {
  return <Header />;
}

// Hero Section
function Hero() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    gsap.fromTo('.hero-content',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.1 }
    );
  }, []);

  const handlePlayClick = () => {
    navigate('/play');
  };

  const handlePlayWithFriendsClick = () => {
    if (isAuthenticated) {
      navigate('/room/create');
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 pb-12 px-4 overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      
      <div className="absolute top-24 left-8 opacity-40 hidden lg:block wiggle-slow">
        <img src="/crossy-ball.png" alt="" className="w-16 h-auto" />
      </div>
      <div className="absolute top-32 right-12 opacity-40 hidden lg:block" style={{ animationDelay: '0.8s' }}>
        <img src="/crossy-coffee.png" alt="" className="w-14 h-auto bob-animation" />
      </div>
      <div className="absolute bottom-48 left-16 opacity-40 hidden lg:block">
        <img src="/crossy-reading.png" alt="" className="w-14 h-auto bob-animation" style={{ animationDelay: '1.2s' }} />
      </div>
      <div className="absolute bottom-32 right-20 opacity-40 hidden lg:block">
        <img src="/crossy-yoga.png" alt="" className="w-16 h-auto wiggle-slow" />
      </div>
      
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="hero-content mb-6 relative inline-block">
          <div className="lg:hidden absolute -left-8 top-1/2 -translate-y-1/2 z-0">
            <img src="/crossy-coffee.png" alt="" className="w-12 h-auto opacity-70" />
          </div>
          <div className="lg:hidden absolute -right-8 top-1/2 -translate-y-1/2 z-0">
            <img src="/crossy-ball.png" alt="" className="w-12 h-auto opacity-70" />
          </div>
          <img 
            src="/crossy-main.png" 
            alt="Crossy" 
            className="w-40 h-40 md:w-56 md:h-56 bob-animation relative z-10"
          />
        </div>
        
        <div className="hero-content mb-4">
          <span className="text-2xl">✨</span>
        </div>
        
        <h1 className="hero-content font-pixel text-4xl md:text-6xl text-[#2A1E5C] mb-6 leading-tight tracking-wider">
          CROSSY
        </h1>
        
        <div className="hero-content speech-bubble mb-6 inline-block">
          <p className="font-display text-[#2A1E5C]">
            Let's solve today's puzzle together!
          </p>
        </div>
        
        <p className="hero-content font-display text-lg md:text-xl text-[#6B5CA8] mb-8 max-w-xl mx-auto">
          Daily puzzles, solved together. Play solo or race friends in real-time.
        </p>
        
        <div className="hero-content flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={handlePlayClick} className="crossy-button text-lg px-8 py-4">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play Now
          </button>
          <button onClick={handlePlayWithFriendsClick} className="crossy-button-secondary text-lg px-8 py-4">
            <Users className="w-5 h-5 mr-2" />
            Play with Friends
          </button>
        </div>

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        
        <div className="hero-content mt-12 flex items-center justify-center gap-4">
          <img src="/crossy-small.png" alt="" className="w-8 h-8" />
          <img src="/crossy-small.png" alt="" className="w-10 h-10" />
          <img src="/crossy-small.png" alt="" className="w-8 h-8" />
        </div>
      </div>
    </section>
  );
}

// Daily Puzzle Section
function DailyPuzzle() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [puzzle, setPuzzle] = useState<{
    date?: string;
    title?: string;
    author?: string;
    difficulty?: string;
    gridWidth?: number;
    gridHeight?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.daily-card',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const fetchTodayPuzzle = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/puzzles/today`);
        if (response.ok) {
          const data = await response.json();
          setPuzzle(data);
        }
      } catch (error) {
        console.error('Failed to fetch today\'s puzzle:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayPuzzle();
  }, []);

  const handlePlayClick = () => {
    navigate('/play');
  };

  // Format date as "Day, Month DD"
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Today';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Get difficulty tag class
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'tag-easy';
      case 'medium':
        return 'tag-medium';
      case 'hard':
        return 'tag-hard';
      default:
        return 'tag-easy';
    }
  };

  return (
    <section id="play" ref={sectionRef} className="relative py-16 px-4">
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute -top-10 right-4 hidden sm:block">
          <img src="/crossy-gym.png" alt="Crossy working out" className="w-20 h-auto wiggle-slow" />
        </div>
        <div className="absolute top-1/2 -left-4 hidden lg:block -translate-y-1/2">
          <img src="/crossy-sleep.png" alt="Crossy napping" className="w-14 h-auto opacity-50" />
        </div>
        <div className="lg:hidden absolute -top-6 left-1/2 -translate-x-1/2 z-10">
          <img src="/crossy-gym.png" alt="Crossy" className="w-16 h-auto" />
        </div>

        <div className="daily-card crossy-card p-6 sm:p-8 relative">
          <div className="lg:hidden absolute -left-3 top-1/2 -translate-y-1/2">
            <img src="/crossy-sleep.png" alt="Crossy" className="w-10 h-auto opacity-80" />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-pulse">
                <Calendar className="w-8 h-8 text-[#7B61FF]" />
              </div>
              <p className="font-display text-[#6B5CA8] mt-2">Loading today's puzzle...</p>
            </div>
          ) : puzzle ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-[#7B61FF]" />
                  <span className="font-display font-semibold text-[#6B5CA8]">Today's Puzzle</span>
                  <span className="text-sm text-[#6B5CA8]">• {formatDate(puzzle.date)}</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#2A1E5C] mb-3">
                  {puzzle.title || 'Daily Crossword'}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-[#6B5CA8]">By {puzzle.author || 'CrossPlay AI'}</span>
                  <span className={getDifficultyClass(puzzle.difficulty || 'easy')}>{puzzle.difficulty?.toUpperCase() || 'EASY'}</span>
                  <span className="bg-[#F3F1FF] text-[#7B61FF] text-xs font-display font-semibold px-3 py-1 rounded-full">
                    {puzzle.gridWidth}×{puzzle.gridHeight}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={handlePlayClick} className="crossy-button flex-1 sm:flex-initial flex items-center justify-center gap-2">
                  Play Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-display text-[#6B5CA8]">No puzzle available today</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Game Section
function Game() {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const [grid, setGrid] = useState<GridCell[][]>(() => {
    const answers = [
      ['C', 'A', 'T', '', ''],
      ['O', '', 'O', '', ''],
      ['L', '', 'P', '', ''],
      ['O', '', '', '', ''],
      ['R', '', '', '', '']
    ];
    
    const newGrid: GridCell[][] = [];
    for (let row = 0; row < 5; row++) {
      const rowCells: GridCell[] = [];
      for (let col = 0; col < 5; col++) {
        rowCells.push({
          row,
          col,
          letter: '',
          correctLetter: answers[row][col],
          isBlocked: answers[row][col] === '',
          number: undefined
        });
      }
      newGrid.push(rowCells);
    }
    
    newGrid[0][0].number = 1;
    newGrid[0][2].number = 3;
    newGrid[2][0].number = 2;
    
    return newGrid;
  });
  
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showCheck, setShowCheck] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleCellClick = (row: number, col: number) => {
    if (!grid[row][col].isBlocked) {
      setSelectedCell({ row, col });
      setShowCheck(false);
      setShowHint(false);
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
      
      if (col < 4 && !grid[row][col + 1].isBlocked) {
        setSelectedCell({ row, col: col + 1 });
      }
    } else if (e.key === 'ArrowRight' && col < 4 && !grid[row][col + 1].isBlocked) {
      setSelectedCell({ row, col: col + 1 });
    } else if (e.key === 'ArrowLeft' && col > 0 && !grid[row][col - 1].isBlocked) {
      setSelectedCell({ row, col: col - 1 });
    } else if (e.key === 'ArrowDown' && row < 4 && !grid[row + 1][col].isBlocked) {
      setSelectedCell({ row: row + 1, col });
    } else if (e.key === 'ArrowUp' && row > 0 && !grid[row - 1][col].isBlocked) {
      setSelectedCell({ row: row - 1, col });
    }
  };

  const checkAnswers = () => {
    setShowCheck(true);
  };

  const useHint = () => {
    if (selectedCell) {
      const newGrid = [...grid];
      newGrid[selectedCell.row][selectedCell.col].letter = 
        newGrid[selectedCell.row][selectedCell.col].correctLetter;
      setGrid(newGrid);
      setShowHint(true);
    }
  };

  const isComplete = grid.every(row => 
    row.every(cell => cell.isBlocked || cell.letter === cell.correctLetter)
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.game-container',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative py-16 px-4" 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
    >
      <div className="absolute top-8 right-8 hidden lg:block">
        <img src="/crossy-cool.png" alt="Cool Crossy" className="w-16 h-auto bob-animation" />
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-3xl text-[#2A1E5C] mb-2">
            Try a Quick Puzzle
          </h2>
          <p className="font-display text-[#6B5CA8]">
            5×5 • Easy • Tap a square to start
          </p>
        </div>

        <div className="game-container flex flex-col lg:flex-row gap-6 relative">
          <div className="lg:hidden absolute -top-6 left-4 z-10">
            <img src="/crossy-cool.png" alt="Cool Crossy" className="w-14 h-auto" />
          </div>
          
          <div className="crossy-card p-5 lg:w-64 flex-shrink-0 relative pt-10 lg:pt-5">
            <div className="lg:hidden absolute -right-2 bottom-4">
              <img src="/crossy-hint.png" alt="Crossy" className="w-10 h-auto opacity-80" />
            </div>
            
            <h3 className="font-display font-bold text-[#2A1E5C] mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#F59E0B]" />
              Clues
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-display font-semibold text-sm text-[#6B5CA8] mb-2">Across</h4>
                <div className="space-y-2">
                  <p className="font-display text-sm text-[#2A1E5C]">
                    <span className="font-bold text-[#7B61FF]">1.</span> Feline pet
                  </p>
                  <p className="font-display text-sm text-[#2A1E5C]">
                    <span className="font-bold text-[#7B61FF]">3.</span> Highest point
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-display font-semibold text-sm text-[#6B5CA8] mb-2">Down</h4>
                <div className="space-y-2">
                  <p className="font-display text-sm text-[#2A1E5C]">
                    <span className="font-bold text-[#7B61FF]">1.</span> Red, blue, green, etc.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-[#ECE9FF]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF4D6A]" />
                <span className="font-display text-sm text-[#6B5CA8]">12 day streak</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Trophy className="w-5 h-5 text-[#F59E0B]" />
                <span className="font-display text-sm text-[#6B5CA8]">Best: 28 days</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Target className="w-5 h-5 text-[#FF4D6A]" />
                <span className="font-display text-sm text-[#6B5CA8]">Keep it up!</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-center mb-6">
              <div 
                className="inline-grid gap-1 p-4 bg-[#F6F5FF] rounded-2xl border-2 border-[#2A1E5C]"
                style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
              >
                {grid.map((row, rowIndex) => (
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className={`
                        crossword-cell relative
                        ${cell.isBlocked ? 'blocked' : ''}
                        ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'selected' : ''}
                        ${showCheck && cell.letter && !cell.isBlocked ? (cell.letter === cell.correctLetter ? 'correct' : 'incorrect') : ''}
                        ${showHint && selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'correct' : ''}
                      `}
                    >
                      {cell.number && (
                        <span className="absolute top-0.5 left-0.5 text-[7px] font-display text-[#6B5CA8] leading-none">
                          {cell.number}
                        </span>
                      )}
                      {cell.letter}
                    </div>
                  ))
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={checkAnswers} className="crossy-button flex items-center gap-2">
                <Check className="w-4 h-4" />
                Check
              </button>
              <button onClick={useHint} className="crossy-button-secondary flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Hint
              </button>
            </div>
            
            {showCheck && (
              <div className="mt-4 text-center">
                <p className="font-display text-sm text-[#6B5CA8]">
                  {isComplete ? "🎉 Perfect! Great job!" : "Keep trying! Red squares need fixing."}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          <div className="flex items-end gap-4">
            <div className="speech-bubble mb-3">
              <p className="font-display text-sm text-[#2A1E5C]">
                {isComplete ? "🎉 You did it! Amazing!" : "You got this!"}
              </p>
            </div>
            <img 
              src="/crossy-cheer.png" 
              alt="Crossy cheering" 
              className="w-20 h-auto bob-animation"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.feature-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleMultiplayerClick = () => {
    if (isAuthenticated) {
      navigate('/room/create');
    } else {
      setAuthModalOpen(true);
    }
  };

  const features: Feature[] = [
    { 
      icon: Users, 
      title: 'Multiplayer Rooms', 
      desc: 'Create a room, share the code, and race friends to solve together in real-time.',
      color: 'bg-[#7B61FF]'
    },
    { 
      icon: Calendar, 
      title: 'Daily Streaks', 
      desc: 'Build your streak by solving daily. Use freezes to save it when life gets busy.',
      color: 'bg-[#FF4D6A]'
    },
    { 
      icon: Zap, 
      title: 'Smart Hints', 
      desc: 'Reveal a letter, check a word, or see the solution when you need help.',
      color: 'bg-[#F59E0B]'
    }
  ];

  return (
    <section id="features" ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute top-4 left-8 hidden lg:block">
        <img src="/crossy-popcorn.png" alt="Crossy with popcorn" className="w-16 h-auto bob-animation" />
      </div>
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 relative">
          <div className="lg:hidden absolute -top-4 left-1/2 -translate-x-1/2">
            <img src="/crossy-popcorn.png" alt="Crossy" className="w-14 h-auto" />
          </div>
          <div className="flex justify-center mb-4 pt-6 lg:pt-0">
            <img src="/crossy-hint.png" alt="Crossy" className="w-16 h-auto bob-animation" />
          </div>
          <h2 className="font-display font-bold text-3xl text-[#2A1E5C] mb-3">
            Why Players Love Crossy
          </h2>
          <p className="font-display text-[#6B5CA8]">
            Fun features that make solving a joy
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-5 relative">
          <div className="lg:hidden absolute top-1/2 -left-2 -translate-y-1/2">
            <img src="/crossy-coffee.png" alt="Crossy" className="w-10 h-auto opacity-80" />
          </div>
          <div className="lg:hidden absolute top-1/2 -right-2 -translate-y-1/2">
            <img src="/crossy-ball.png" alt="Crossy" className="w-10 h-auto opacity-80" />
          </div>
          
          {features.map((feature, index) => (
            <div key={index} className="feature-card crossy-card p-6 hover:-translate-y-1 transition-transform relative">
              <div className="lg:hidden absolute -top-4 left-4">
                <img 
                  src={index === 0 ? "/crossy-coffee.png" : index === 1 ? "/crossy-cheer.png" : "/crossy-thumbsup.png"} 
                  alt="Crossy" 
                  className="w-10 h-auto" 
                />
              </div>
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#2A1E5C] mb-2">
                {feature.title}
              </h3>
              <p className="font-display text-sm text-[#6B5CA8]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col items-center gap-6 mt-8">
          <button onClick={handleMultiplayerClick} className="crossy-button text-lg px-8 py-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Play Multiplayer
          </button>
          <img src="/crossy-small.png" alt="Crossy" className="w-24 h-auto bob-animation" />
        </div>

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    </section>
  );
}

// Steps Section
function Steps() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.step-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const steps: Step[] = [
    { num: '1', title: 'Read the Clue', desc: 'Tap any square to see the hint for Across or Down.' },
    { num: '2', title: 'Type to Fill', desc: 'Use your keyboard to enter letters. One per square.' },
    { num: '3', title: 'Check & Win', desc: 'Green means correct! Finish to keep your streak alive.' }
  ];

  return (
    <section ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute top-8 right-12 hidden lg:block">
        <img src="/crossy-coffee.png" alt="Crossy with coffee" className="w-14 h-auto bob-animation" style={{ animationDelay: '0.7s' }} />
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 relative">
          <div className="lg:hidden absolute -top-6 right-4">
            <img src="/crossy-coffee.png" alt="Crossy" className="w-12 h-auto" />
          </div>
          <span className="font-pixel text-xs text-[#7B61FF] tracking-widest mb-3 block pt-4 lg:pt-0">
            HOW TO PLAY
          </span>
          <h2 className="font-display font-bold text-3xl text-[#2A1E5C]">
            Three Simple Steps
          </h2>
        </div>
        
        <div className="flex flex-col md:flex-row gap-5 relative">
          <div className="lg:hidden absolute top-1/2 -left-2 -translate-y-1/2">
            <img src="/crossy-reading.png" alt="Crossy" className="w-10 h-auto opacity-70" />
          </div>
          <div className="lg:hidden absolute top-1/2 -right-2 -translate-y-1/2">
            <img src="/crossy-yoga.png" alt="Crossy" className="w-10 h-auto opacity-70" />
          </div>
          
          {steps.map((step, index) => (
            <div key={index} className="step-card flex-1 crossy-card p-6 text-center relative">
              <div className="lg:hidden absolute -top-4 left-1/2 -translate-x-1/2">
                <img 
                  src={index === 0 ? "/crossy-hint.png" : index === 1 ? "/crossy-main.png" : "/crossy-cheer.png"} 
                  alt="Crossy" 
                  className="w-10 h-auto" 
                />
              </div>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#7B61FF] text-white font-display font-bold text-xl flex items-center justify-center">
                {step.num}
              </div>
              <h3 className="font-display font-bold text-lg text-[#2A1E5C] mb-2">
                {step.title}
              </h3>
              <p className="font-display text-sm text-[#6B5CA8]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Archive Section
function Archive() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.archive-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const puzzles: ArchivePuzzle[] = [
    { title: 'Monday Crossword', size: '5×5', difficulty: 'Easy', date: 'Jan 27' },
    { title: 'Tuesday Crossword', size: '5×5', difficulty: 'Easy', date: 'Jan 28' },
    { title: 'Wednesday Crossword', size: '7×7', difficulty: 'Medium', date: 'Jan 29' },
    { title: 'Thursday Crossword', size: '9×9', difficulty: 'Hard', date: 'Jan 30' },
    { title: 'Space Week: Day 1', size: '7×7', difficulty: 'Themed', date: 'Jan 31' },
    { title: 'Friday Crossword', size: '5×5', difficulty: 'Easy', date: 'Feb 1' }
  ];

  const filters = ['All', 'Easy', 'Medium', 'Hard', 'Themed'];
  const filteredPuzzles = filter === 'All' ? puzzles : puzzles.filter(p => p.difficulty === filter);

  return (
    <section id="archive" ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute bottom-20 left-8 hidden lg:block">
        <img src="/crossy-reading.png" alt="Crossy reading" className="w-16 h-auto bob-animation" />
      </div>
      <div className="absolute top-20 right-8 hidden lg:block">
        <img src="/crossy-ball.png" alt="Crossy playing" className="w-16 h-auto wiggle-slow" />
      </div>
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 relative">
          <div className="lg:hidden absolute -top-6 left-1/2 -translate-x-1/2">
            <img src="/crossy-chat.png" alt="Crossy" className="w-14 h-auto" />
          </div>
          <div className="flex justify-center mb-4 pt-6 lg:pt-0">
            <img src="/crossy-chat.png" alt="Crossy" className="w-16 h-auto bob-animation" />
          </div>
          <h2 className="font-display font-bold text-3xl text-[#2A1E5C] mb-3">
            Puzzle Archive
          </h2>
          <p className="font-display text-[#6B5CA8]">
            Browse and replay past puzzles
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 mb-6 relative">
          <div className="lg:hidden absolute -top-8 left-1/2 -translate-x-1/2">
            <img src="/crossy-hint.png" alt="Crossy" className="w-10 h-auto" />
          </div>
          
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-display text-sm transition-colors ${
                filter === f 
                  ? 'bg-[#7B61FF] text-white' 
                  : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPuzzles.map((puzzle, index) => (
            <Link
              key={index}
              to="/archive"
              className="archive-card crossy-card p-5 hover:-translate-y-1 transition-transform cursor-pointer block"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-bold text-[#2A1E5C]">{puzzle.title}</h3>
                <ArrowRight className="w-5 h-5 text-[#6B5CA8]" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-[#F3F1FF] text-[#7B61FF] font-display font-semibold px-2 py-1 rounded">
                  {puzzle.size}
                </span>
                <span className={`font-display text-xs px-2 py-1 rounded ${
                  puzzle.difficulty === 'Easy' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' :
                  puzzle.difficulty === 'Medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                  puzzle.difficulty === 'Hard' ? 'bg-[#FF4D6A]/10 text-[#FF4D6A]' :
                  'bg-[#7B61FF]/10 text-[#7B61FF]'
                }`}>
                  {puzzle.difficulty}
                </span>
                <span className="font-display text-[#6B5CA8]">{puzzle.date}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <Link to="/archive" className="crossy-button-secondary">
            View Full Archive
          </Link>
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.testimonial-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const testimonials: Testimonial[] = [
    { quote: 'I play every morning with coffee. The streak keeps me coming back!', name: 'Alex R.' },
    { quote: 'My friends and I race in rooms. It\'s chaotic and so much fun.', name: 'Jordan T.' },
    { quote: 'The hints are just enough help without spoiling the solve.', name: 'Sam K.' }
  ];

  return (
    <section ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute top-8 left-8 hidden lg:block">
        <img src="/crossy-sleep.png" alt="Crossy sleeping" className="w-14 h-auto opacity-60" />
      </div>
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-10 relative">
          <div className="lg:hidden absolute -left-2">
            <img src="/crossy-sleep.png" alt="Crossy" className="w-10 h-auto opacity-70" />
          </div>
          <Heart className="w-6 h-6 text-[#FF4D6A] fill-[#FF4D6A]" />
          <h2 className="font-display font-bold text-3xl text-[#2A1E5C]">
            What Solvers Say
          </h2>
          <Heart className="w-6 h-6 text-[#FF4D6A] fill-[#FF4D6A]" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-5 relative">
          <div className="lg:hidden absolute top-1/2 -left-2 -translate-y-1/2">
            <img src="/crossy-popcorn.png" alt="Crossy" className="w-10 h-auto opacity-70" />
          </div>
          <div className="lg:hidden absolute top-1/2 -right-2 -translate-y-1/2">
            <img src="/crossy-gym.png" alt="Crossy" className="w-10 h-auto opacity-70" />
          </div>
          
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card crossy-card p-6 relative">
              <div className="lg:hidden absolute -top-4 left-4">
                <img 
                  src={index === 0 ? "/crossy-coffee.png" : index === 1 ? "/crossy-cheer.png" : "/crossy-thumbsup.png"} 
                  alt="Crossy" 
                  className="w-10 h-auto" 
                />
              </div>
              <div className="pt-4 lg:pt-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="font-display text-[#2A1E5C] mb-4 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7B61FF] flex items-center justify-center text-white font-display font-bold text-sm">
                    {testimonial.name[0]}
                  </div>
                  <span className="font-display font-medium text-sm text-[#6B5CA8]">
                    {testimonial.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center mt-8">
          <img src="/crossy-small.png" alt="Crossy" className="w-20 h-auto bob-animation" />
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQ() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.faq-item',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const faqs: FAQ[] = [
    { q: 'Is Crossy free to play?', a: 'Yes! Daily puzzles are completely free. Premium unlocks the full archive and unlimited hints.' },
    { q: 'Can I play on my phone?', a: 'Absolutely! Crossy works great on mobile with touch-friendly controls and responsive design.' },
    { q: 'How do multiplayer rooms work?', a: 'Create a room, share the 4-digit code with friends, and solve together with live cursors!' },
    { q: 'What happens if I miss a day?', a: 'Your streak resets, but you can use streak freezes (earned or purchased) to save it.' }
  ];

  return (
    <section ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute bottom-12 right-8 hidden lg:block">
        <img src="/crossy-yoga.png" alt="Crossy doing yoga" className="w-16 h-auto wiggle-slow" />
      </div>
      
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-8 relative">
          <div className="lg:hidden absolute -top-4 left-4">
            <img src="/crossy-hint.png" alt="Crossy" className="w-12 h-auto" />
          </div>
          <img src="/crossy-hint.png" alt="Crossy" className="w-16 h-auto bob-animation" />
        </div>
        <h2 className="font-display font-bold text-3xl text-[#2A1E5C] text-center mb-10">
          Questions?
        </h2>
        
        <div className="space-y-3 relative">
          <div className="lg:hidden absolute top-1/2 -left-4 -translate-y-1/2">
            <img src="/crossy-cool.png" alt="Crossy" className="w-10 h-auto opacity-60" />
          </div>
          <div className="lg:hidden absolute top-1/2 -right-4 -translate-y-1/2">
            <img src="/crossy-ball.png" alt="Crossy" className="w-10 h-auto opacity-60" />
          </div>
          
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item crossy-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <span className="font-display font-semibold text-[#2A1E5C]">{faq.q}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-[#6B5CA8] transition-transform ${openIndex === index ? 'rotate-180' : ''}`} 
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="font-display text-[#6B5CA8]">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Newsletter Section
function Newsletter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.newsletter-content',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section ref={sectionRef} className="relative py-16 px-4">
      <div className="absolute top-8 left-8 hidden lg:block">
        <img src="/crossy-cool.png" alt="Cool Crossy" className="w-14 h-auto bob-animation" />
      </div>
      
      <div className="max-w-xl mx-auto">
        <div className="newsletter-content crossy-card p-8 relative">
          <div className="absolute -top-14 right-8 lg:-top-16">
            <img src="/crossy-main.png" alt="Crossy" className="w-20 lg:w-24 h-auto bob-animation" />
          </div>
          <div className="lg:hidden absolute -top-8 left-2">
            <img src="/crossy-cool.png" alt="Crossy" className="w-12 h-auto" />
          </div>
          <div className="lg:hidden absolute -bottom-4 -right-2">
            <img src="/crossy-thumbsup.png" alt="Crossy" className="w-12 h-auto" />
          </div>
          
          <div className="text-center pt-6 lg:pt-4">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#2A1E5C] mb-3">
              Never Miss a Puzzle
            </h2>
            <p className="font-display text-[#6B5CA8] mb-6">
              Get daily crosswords delivered to your inbox.
            </p>
            
            {subscribed ? (
              <div className="bg-[#2ECC71]/10 rounded-xl p-4">
                <p className="font-display text-[#2ECC71] font-semibold">
                  🎉 You're subscribed! Check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5CA8]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#D6D2FF] focus:border-[#7B61FF] outline-none font-display text-[#2A1E5C] transition-colors"
                  />
                </div>
                <button type="submit" className="crossy-button flex items-center justify-center gap-2">
                  Subscribe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
            
            <p className="font-display text-xs text-[#6B5CA8] mt-4">
              No spam. Just puzzles. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="relative py-12 bg-[#2A1E5C]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center gap-6 mb-8 relative">
          <div className="lg:hidden absolute -top-6 left-4">
            <img src="/crossy-small.png" alt="Crossy" className="w-10 h-auto" />
          </div>
          <div className="lg:hidden absolute -top-6 right-4">
            <img src="/crossy-ball.png" alt="Crossy" className="w-10 h-auto" />
          </div>
          
          <img src="/crossy-small.png" alt="Crossy" className="w-16 h-auto opacity-80" />
          <span className="font-pixel text-xl text-white">Crossy</span>
          <p className="font-display text-white/60 text-center max-w-md">
            Daily puzzles, solved together. Made with 💜 by puzzle lovers.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <a href="#play" className="font-display text-sm text-white/70 hover:text-white transition-colors">
            Play
          </a>
          <a href="#features" className="font-display text-sm text-white/70 hover:text-white transition-colors">
            Features
          </a>
          <a href="#archive" className="font-display text-sm text-white/70 hover:text-white transition-colors">
            Archive
          </a>
          <a href="#" className="font-display text-sm text-white/70 hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="font-display text-sm text-white/70 hover:text-white transition-colors">
            Terms
          </a>
        </div>
        
        <div className="flex justify-center gap-4 mb-8">
          <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 1-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </a>
        </div>
        
        <div className="text-center">
          <p className="font-display text-sm text-white/50">
            © 2026 Crossy. Built for puzzle lovers.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
function LandingPage() {
  return (
    <div className="relative bg-[#F6F5FF] min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <DailyPuzzle />
        <Game />
        <Features />
        <Steps />
        <Archive />
        <Testimonials />
        <FAQ />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
