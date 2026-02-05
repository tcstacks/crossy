import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Clock,
  LogOut,
  Users,
  Trophy,
  AlertCircle,
  Smile,
} from 'lucide-react';
import { roomApi, puzzleApi, getToken } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Skeleton } from '../components/ui/skeleton';
import { ChatPanel } from '../components/ChatPanel';
import { ReactionPicker } from '../components/ReactionPicker';
import { ReactionAnimation } from '../components/ReactionAnimation';
import { Header } from '@/components/Header';
import type {
  Puzzle,
  Room,
  RoomPlayer,
  CellUpdatePayload,
  CursorMovePayload,
  PlayerProgressPayload,
  GameFinishedPayload,
  PlayerCursor,
  ChatMessagePayload,
  TypingIndicatorPayload,
  Reaction,
  ReactionPayload,
  RaceProgress,
  RaceProgressPayload,
} from '../types';

// Player colors for visual distinction
const PLAYER_COLORS = [
  '#7B61FF', // Primary purple
  '#FF4D6A', // Pink/red
  '#4DFFDF', // Cyan
  '#FFD93D', // Yellow
  '#FF6B9D', // Hot pink
  '#6BCF7F', // Green
  '#9D6BFF', // Light purple
  '#FF9D6B', // Orange
];

// Types
interface GridCell {
  row: number;
  col: number;
  letter: string;
  correctLetter: string;
  isBlocked: boolean;
  number?: number;
  filledBy?: string; // userId of the player who filled this cell
}

interface Clue {
  num: number;
  direction?: 'across' | 'down';
  clue: string;
  answer: string;
  row: number;
  col: number;
}

function MultiplayerGamePage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const token = getToken();

  // Room and game state
  const [room, setRoom] = useState<Room | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [cluesAcross, setCluesAcross] = useState<Clue[]>([]);
  const [cluesDown, setCluesDown] = useState<Clue[]>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [activeClue, setActiveClue] = useState<Clue | null>(null);
  const [timer, setTimer] = useState(0);
  const [playerCursors, setPlayerCursors] = useState<PlayerCursor[]>([]);
  const [playerProgress, setPlayerProgress] = useState<Map<string, PlayerProgressPayload>>(new Map());
  const [raceLeaderboard, setRaceLeaderboard] = useState<RaceProgress[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<{ userId?: string; username?: string } | null>(null);

  // Reaction state
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [lastReactionTime, setLastReactionTime] = useState(0);
  const [reactionCooldown, setReactionCooldown] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const REACTION_COOLDOWN_MS = 2000; // 2 second cooldown

  // Initialize WebSocket connection
  const { connectionState, sendMessage, on } = useWebSocket({
    roomCode: roomCode || '',
    token: token || '',
    autoConnect: !!roomCode && !!token,
  });

  // Fetch initial room and puzzle data
  useEffect(() => {
    const fetchGameData = async () => {
      if (!roomCode || !token) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      try {
        setLoading(true);

        // Fetch room data
        const roomData = await roomApi.getRoomByCode({ code: roomCode });
        setRoom(roomData);
        setPlayers(roomData.players);

        // Get current user ID
        const hostPlayer = roomData.players.find(p => p.isHost);
        if (hostPlayer) {
          setCurrentUserId(hostPlayer.userId);
        }

        // Fetch puzzle data
        const puzzleData = await puzzleApi.getPuzzleById(roomData.puzzleId);
        setPuzzle(puzzleData);
        initializeGridFromPuzzle(puzzleData);
        startTimeRef.current = Date.now();
      } catch (err: unknown) {
        console.error('Failed to fetch game data:', err);
        const errorMessage = err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to load game. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [roomCode, token, navigate]);

  // Initialize grid from puzzle data
  const initializeGridFromPuzzle = (puzzleData: Puzzle) => {
    const newGrid: GridCell[][] = [];
    const puzzleGrid = puzzleData.grid as import('../types/api').GridCell[][];

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

  // WebSocket event handlers
  useEffect(() => {
    if (!roomCode || connectionState !== 'connected') {
      return;
    }

    // Room state received (initial sync)
    const unsubscribeRoomState = on('room_state', (payload) => {
      console.log('Received room_state message:', payload);
      // Room state is already loaded via HTTP, but this confirms WebSocket sync
    });

    // Cell updated by another player
    const unsubscribeCellUpdated = on<CellUpdatePayload>('cell:updated', (payload) => {
      if (payload.userId === currentUserId) return; // Ignore own updates

      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[payload.row] && newGrid[payload.row][payload.col]) {
          newGrid[payload.row][payload.col].letter = payload.value !== null
            ? String.fromCharCode(65 + payload.value)
            : '';
          newGrid[payload.row][payload.col].filledBy = payload.value !== null
            ? payload.userId
            : undefined;
        }
        return newGrid;
      });
    });

    // Cursor moved by another player
    const unsubscribeCursorMoved = on<CursorMovePayload>('cursor:moved', (payload) => {
      if (payload.cursor.userId === currentUserId) return; // Ignore own cursor

      setPlayerCursors(prev => {
        const filtered = prev.filter(c => c.userId !== payload.cursor.userId);
        return [...filtered, payload.cursor];
      });
    });

    // Player progress updated
    const unsubscribePlayerProgress = on<PlayerProgressPayload>('player:progress', (payload) => {
      setPlayerProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(payload.userId, payload);
        return newMap;
      });
    });

    // Puzzle completed
    const unsubscribePuzzleCompleted = on<GameFinishedPayload>('game:finished', (payload) => {
      setWinner({
        userId: payload.winnerId,
        username: payload.winnerUsername,
      });
      setShowWinnerModal(true);
    });

    // Reaction added
    const unsubscribeReactionAdded = on<ReactionPayload>('reaction:added', (payload) => {
      setReactions((prev) => [...prev, payload.reaction]);

      // Remove reaction after it's done animating
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== payload.reaction.id));
      }, 1500);
    });

    // Race progress updated (Race mode only)
    const unsubscribeRaceProgress = on<RaceProgressPayload>('race_progress', (payload) => {
      console.log('Race progress received:', payload);
      setRaceLeaderboard(payload.leaderboard);
    });

    return () => {
      unsubscribeRoomState();
      unsubscribeCellUpdated();
      unsubscribeCursorMoved();
      unsubscribePlayerProgress();
      unsubscribePuzzleCompleted();
      unsubscribeReactionAdded();
      unsubscribeRaceProgress();
    };
  }, [roomCode, connectionState, on, currentUserId]);

  // Timer effect
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error]);

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

    // Send cursor move to other players
    if (currentUserId) {
      const playerIndex = players.findIndex(p => p.userId === currentUserId);
      sendMessage<CursorMovePayload>('cursor:move', {
        cursor: {
          userId: currentUserId,
          username: players.find(p => p.userId === currentUserId)?.username || 'Unknown',
          position: { row, col },
          color: getPlayerColor(playerIndex),
        }
      });
    }

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
    if (!selectedCell || !currentUserId) return;

    const { row, col } = selectedCell;

    if (e.key === 'Backspace') {
      const newGrid = [...grid];
      newGrid[row][col].letter = '';
      newGrid[row][col].filledBy = undefined;
      setGrid(newGrid);

      // Send cell update
      sendMessage<CellUpdatePayload>('cell:update', {
        userId: currentUserId,
        row,
        col,
        value: null,
      });

      // Update progress
      updateProgress(newGrid);
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      const newGrid = [...grid];
      const letter = e.key.toUpperCase();
      newGrid[row][col].letter = letter;
      newGrid[row][col].filledBy = currentUserId;
      setGrid(newGrid);

      // Send cell update
      const value = letter.charCodeAt(0) - 65; // Convert A-Z to 0-25
      sendMessage<CellUpdatePayload>('cell:update', {
        userId: currentUserId,
        row,
        col,
        value,
      });

      // Update progress
      updateProgress(newGrid);

      // Auto-advance
      const maxCol = grid[0]?.length || 0;
      const maxRow = grid.length || 0;
      if (direction === 'across' && col < maxCol - 1 && !grid[row][col + 1]?.isBlocked) {
        const newCell = { row, col: col + 1 };
        setSelectedCell(newCell);
        moveCursor(newCell);
      } else if (direction === 'down' && row < maxRow - 1 && !grid[row + 1]?.[col]?.isBlocked) {
        const newCell = { row: row + 1, col };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (e.key === 'ArrowRight') {
      const maxCol = grid[0]?.length || 0;
      let newCol = col + 1;
      while (newCol < maxCol && grid[row][newCol]?.isBlocked) newCol++;
      if (newCol < maxCol) {
        const newCell = { row, col: newCol };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (e.key === 'ArrowLeft') {
      let newCol = col - 1;
      while (newCol >= 0 && grid[row][newCol]?.isBlocked) newCol--;
      if (newCol >= 0) {
        const newCell = { row, col: newCol };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (e.key === 'ArrowDown') {
      const maxRow = grid.length || 0;
      let newRow = row + 1;
      while (newRow < maxRow && grid[newRow]?.[col]?.isBlocked) newRow++;
      if (newRow < maxRow) {
        const newCell = { row: newRow, col };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (e.key === 'ArrowUp') {
      let newRow = row - 1;
      while (newRow >= 0 && grid[newRow]?.[col]?.isBlocked) newRow--;
      if (newRow >= 0) {
        const newCell = { row: newRow, col };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    }
  };

  const moveCursor = useCallback((cell: { row: number, col: number }) => {
    if (!currentUserId) return;

    const playerIndex = players.findIndex(p => p.userId === currentUserId);
    sendMessage<CursorMovePayload>('cursor:move', {
      cursor: {
        userId: currentUserId,
        username: players.find(p => p.userId === currentUserId)?.username || 'Unknown',
        position: cell,
        color: getPlayerColor(playerIndex),
      }
    });
  }, [currentUserId, players, sendMessage]);

  const updateProgress = useCallback((currentGrid: GridCell[][]) => {
    if (!currentUserId) return;

    const totalCells = currentGrid.flat().filter(c => !c.isBlocked).length;
    const filledCells = currentGrid.flat().filter(c => !c.isBlocked && c.letter !== '').length;
    const correctCells = currentGrid.flat().filter(c => !c.isBlocked && c.letter === c.correctLetter).length;
    const progressPercent = Math.round((filledCells / totalCells) * 100);

    sendMessage<PlayerProgressPayload>('player:progress', {
      userId: currentUserId,
      filledCells,
      correctCells,
      progressPercent,
    });
  }, [currentUserId, sendMessage]);

  const handleLeaveGame = async () => {
    if (!room) return;

    try {
      await roomApi.closeRoom({ roomId: room.id });
      navigate('/');
    } catch (err: unknown) {
      console.error('Failed to leave game:', err);
      navigate('/');
    }
  };

  const getPlayerColor = (index: number): string => {
    return PLAYER_COLORS[index % PLAYER_COLORS.length];
  };

  const getPlayerProgress = (userId: string): number => {
    const progress = playerProgress.get(userId);
    return progress?.progressPercent || 0;
  };

  // Chat handlers
  const handleSendChatMessage = useCallback((message: string) => {
    if (!currentUserId || !roomCode) return;

    sendMessage<ChatMessagePayload>('chat:message', {
      message: {
        id: `${currentUserId}-${Date.now()}`,
        userId: currentUserId,
        username: players.find(p => p.userId === currentUserId)?.username || 'Unknown',
        message,
        timestamp: Date.now(),
      }
    });
  }, [currentUserId, roomCode, players, sendMessage]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!currentUserId) return;

    sendMessage<TypingIndicatorPayload>('chat:typing', {
      userId: currentUserId,
      username: players.find(p => p.userId === currentUserId)?.username || 'Unknown',
      isTyping,
    });
  }, [currentUserId, players, sendMessage]);

  // Reaction handlers
  const handleReactionSelect = useCallback((emoji: string) => {
    if (!currentUserId || reactionCooldown) return;

    const now = Date.now();
    if (now - lastReactionTime < REACTION_COOLDOWN_MS) {
      return; // Still in cooldown
    }

    const reaction: Reaction = {
      id: `${currentUserId}-${now}`,
      userId: currentUserId,
      username: players.find(p => p.userId === currentUserId)?.username || 'Unknown',
      emoji,
      timestamp: now,
    };

    sendMessage<ReactionPayload>('reaction:add', { reaction });

    // Set cooldown
    setLastReactionTime(now);
    setReactionCooldown(true);

    setTimeout(() => {
      setReactionCooldown(false);
    }, REACTION_COOLDOWN_MS);
  }, [currentUserId, players, sendMessage, reactionCooldown, lastReactionTime, REACTION_COOLDOWN_MS]);

  const toggleReactionPicker = () => {
    setIsReactionPickerOpen(!isReactionPickerOpen);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        <Header />
        <div className="h-16" />

        <main className="max-w-6xl mx-auto px-4 py-6">
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
        <div className="h-16" />

        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="crossy-card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-[#FF4D6A] mx-auto mb-4" />
            <h2 className="font-display font-bold text-xl text-[#2A1E5C] mb-2">
              Oops! Something went wrong
            </h2>
            <p className="font-display text-[#6B5CA8] mb-6">
              {error}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      {/* Reaction Animations */}
      <ReactionAnimation reactions={reactions} />

      <Header />
      <div className="h-16" />

      {/* Title Bar */}
      <div className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-[#2A1E5C]">
                {puzzle?.title || 'Multiplayer Crossword'}
              </h1>
              <p className="font-display text-sm text-[#6B5CA8]">
                Room: {roomCode} • {players.length} Players
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-[#F3F1FF] px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-[#7B61FF]" />
                <span className="font-display text-sm text-[#6B5CA8]">{formatTime(timer)}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                connectionState === 'connected' ? 'bg-[#6BCF7F]/20' : 'bg-[#FF4D6A]/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' ? 'bg-[#6BCF7F]' : 'bg-[#FF4D6A]'
                }`} />
                <span className="font-display text-xs text-[#6B5CA8]">
                  {connectionState === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={toggleReactionPicker}
                  disabled={reactionCooldown}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                    reactionCooldown
                      ? 'bg-[#ECE9FF] text-[#6B5CA8]/50 cursor-not-allowed'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                  title={reactionCooldown ? 'Cooldown active' : 'Send reaction'}
                >
                  <Smile className="w-5 h-5" />
                </button>
                <ReactionPicker
                  isOpen={isReactionPickerOpen}
                  onClose={() => setIsReactionPickerOpen(false)}
                  onReactionSelect={handleReactionSelect}
                />
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
              {activeClue?.clue || 'Select a cell to see the clue'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_300px_350px] gap-6">
          {/* Grid Container */}
          <div>
            <div className="flex justify-center mb-6 relative">
              {/* Crossy mascot peeking from top-right */}
              <img
                src="/crossy-main.png"
                alt="Crossy"
                className="absolute -top-4 -right-2 w-12 h-12 sm:w-14 sm:h-14 z-20"
              />

              {/* Grid Container */}
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
                    row.map((cell, colIndex) => {
                      const otherPlayerCursor = playerCursors.find(
                        c => c.position.row === rowIndex && c.position.col === colIndex
                      );

                      // Get the color of the player who filled this cell
                      const filledByPlayerIndex = cell.filledBy
                        ? players.findIndex(p => p.userId === cell.filledBy)
                        : -1;
                      const letterColor = filledByPlayerIndex >= 0
                        ? getPlayerColor(filledByPlayerIndex)
                        : undefined;

                      return (
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
                                : otherPlayerCursor
                                  ? `border-[${otherPlayerCursor.color}] bg-[${otherPlayerCursor.color}]/10`
                                  : 'bg-white border-[#7B61FF] text-[#2A1E5C] hover:bg-[#F3F1FF]'
                            }
                          `}
                          style={otherPlayerCursor ? {
                            borderColor: otherPlayerCursor.color,
                            backgroundColor: `${otherPlayerCursor.color}15`,
                          } : undefined}
                        >
                          {cell.number && (
                            <span className="absolute top-0.5 left-1 text-[8px] font-display font-bold text-[#7B61FF] leading-none">
                              {cell.number}
                            </span>
                          )}
                          <span
                            className="relative z-10"
                            style={letterColor ? { color: letterColor } : undefined}
                          >
                            {cell.letter}
                          </span>
                          {otherPlayerCursor && (
                            <div
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                              style={{ backgroundColor: otherPlayerCursor.color }}
                            />
                          )}
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>

            {/* Leave Game Button */}
            <div className="flex justify-center">
              <button
                onClick={handleLeaveGame}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#FF4D6A] font-display font-semibold rounded-xl border-2 border-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Game
              </button>
            </div>
          </div>

          {/* Player List Sidebar */}
          <div className="space-y-4">
            <div className="crossy-card p-4">
              <div className="flex items-center gap-2 mb-4">
                {room?.mode === 'race' ? (
                  <Trophy className="w-5 h-5 text-[#7B61FF]" />
                ) : (
                  <Users className="w-5 h-5 text-[#7B61FF]" />
                )}
                <h2 className="font-display font-semibold text-[#2A1E5C]">
                  {room?.mode === 'race' ? 'Race Leaderboard' : `Players (${players.length})`}
                </h2>
              </div>
              <div className="space-y-3">
                {room?.mode === 'race' && raceLeaderboard.length > 0 ? (
                  // Race mode: Show sorted leaderboard with rankings
                  [...raceLeaderboard]
                    .sort((a, b) => {
                      // Sort by: finished first, then by progress
                      if (a.finishedAt && !b.finishedAt) return -1;
                      if (!a.finishedAt && b.finishedAt) return 1;
                      if (a.rank && b.rank) return a.rank - b.rank;
                      return b.progress - a.progress;
                    })
                    .map((racePlayer, index) => {
                      const player = players.find(p => p.userId === racePlayer.userId);
                      const isCurrentPlayer = racePlayer.userId === currentUserId;
                      const playerIndex = players.findIndex(p => p.userId === racePlayer.userId);

                      return (
                        <div
                          key={racePlayer.userId}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            isCurrentPlayer
                              ? 'bg-[#7B61FF]/10 border-[#7B61FF]'
                              : racePlayer.finishedAt
                              ? 'bg-[#6BCF7F]/10 border-[#6BCF7F]'
                              : 'bg-[#F3F1FF] border-[#ECE9FF]'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {/* Rank Badge */}
                            {racePlayer.rank && (
                              <div className="w-8 h-8 rounded-full bg-[#FFD93D] border-2 border-[#2A1E5C] flex items-center justify-center font-display font-bold text-[#2A1E5C] text-sm">
                                {racePlayer.rank}
                              </div>
                            )}
                            {!racePlayer.rank && (
                              <div className="w-8 h-8 rounded-full bg-[#ECE9FF] flex items-center justify-center font-display font-bold text-[#6B5CA8] text-sm">
                                {index + 1}
                              </div>
                            )}

                            {/* Player Avatar */}
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white text-sm"
                              style={{ backgroundColor: getPlayerColor(playerIndex) }}
                            >
                              {racePlayer.displayName.charAt(0).toUpperCase()}
                            </div>

                            {/* Player Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-semibold text-[#2A1E5C] truncate">
                                {racePlayer.displayName}
                                {isCurrentPlayer && ' (You)'}
                              </p>
                              <p className="font-display text-xs text-[#6B5CA8]">
                                {racePlayer.finishedAt
                                  ? `Finished in ${racePlayer.solveTime}s`
                                  : `${Math.round(racePlayer.progress)}% complete`
                                }
                              </p>
                            </div>

                            {/* Status Indicator */}
                            {racePlayer.finishedAt ? (
                              <Trophy className="w-5 h-5 text-[#6BCF7F]" />
                            ) : (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getPlayerColor(playerIndex) }}
                              />
                            )}
                          </div>

                          {/* Progress Bar */}
                          {!racePlayer.finishedAt && (
                            <div className="h-2 bg-[#F3F1FF] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${racePlayer.progress}%`,
                                  backgroundColor: getPlayerColor(playerIndex)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  // Collaborative/Relay mode: Show regular player list
                  players.map((player, index) => {
                    const progress = getPlayerProgress(player.userId);
                    const isCurrentPlayer = player.userId === currentUserId;

                    return (
                      <div
                        key={player.userId}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          isCurrentPlayer
                            ? 'bg-[#7B61FF]/10 border-[#7B61FF]'
                            : 'bg-[#F3F1FF] border-[#ECE9FF]'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {/* Player Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white text-sm"
                            style={{ backgroundColor: getPlayerColor(index) }}
                          >
                            {player.username.charAt(0).toUpperCase()}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-[#2A1E5C] truncate">
                              {player.username}
                              {isCurrentPlayer && ' (You)'}
                            </p>
                            <p className="font-display text-xs text-[#6B5CA8]">
                              {progress}% complete
                            </p>
                          </div>

                          {/* Status Indicator */}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getPlayerColor(index) }}
                          />
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-[#F3F1FF] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: getPlayerColor(index)
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Crossy with speech bubble */}
            <div className="flex justify-center">
              <div className="flex items-end gap-3">
                <div className="relative bg-white px-4 py-2 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
                  <p className="font-display text-xs text-[#2A1E5C]">
                    Race to finish!
                  </p>
                  <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
                </div>
                <img src="/crossy-main.png" alt="Crossy" className="w-12 h-12" />
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="hidden lg:block h-[600px]">
            <ChatPanel
              roomCode={roomCode || ''}
              currentUserId={currentUserId}
              onSendMessage={handleSendChatMessage}
              onTyping={handleTyping}
              on={on}
            />
          </div>
        </div>
      </main>

      {/* Winner Modal */}
      {showWinnerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border-2 border-[#2A1E5C] shadow-[0_8px_0_#2A1E5C]">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#FFD93D] rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-12 h-12 text-[#2A1E5C]" />
              </div>
              <h2 className="font-display font-bold text-2xl text-[#2A1E5C] mb-2">
                {winner?.userId === currentUserId ? 'You Won!' : 'Game Complete!'}
              </h2>
              <p className="font-display text-[#6B5CA8] mb-6">
                {winner?.username || 'Someone'} completed the puzzle first!
              </p>

              {/* Stats */}
              <div className="bg-[#F3F1FF] rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-sm text-[#6B5CA8]">Time</span>
                  <span className="font-display font-semibold text-[#2A1E5C]">{formatTime(timer)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#6B5CA8]">Winner</span>
                  <span className="font-display font-semibold text-[#2A1E5C]">
                    {winner?.username || 'Unknown'}
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
                  onClick={() => setShowWinnerModal(false)}
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

export default MultiplayerGamePage;
