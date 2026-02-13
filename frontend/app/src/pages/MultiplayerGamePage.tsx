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
import { useAuth } from '@/contexts/AuthContext';
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
  JoinRoomPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  CellUpdatePayload,
  CursorMovePayload,
  PlayerProgressPayload,
  GameFinishedPayload,
  ChatMessagePayload,
  PlayerCursor,
  Reaction,
  ReactionPayload,
  RoomClosedPayload,
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
  const { token, user, isLoading: authLoading } = useAuth();
  const resolvedToken = token || getToken();

  // Room and game state
  const [room, setRoom] = useState<Room | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
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
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<{ userId?: string; username?: string } | null>(null);
  const [chatBubbles, setChatBubbles] = useState<Array<{
    id: string;
    displayName: string;
    text: string;
  }>>([]);

  // Reaction state
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [lastReactionTime, setLastReactionTime] = useState(0);
  const [reactionCooldown, setReactionCooldown] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(false);
  const [metaPanel, setMetaPanel] = useState<'players' | 'chat'>('players');

  const gridRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const REACTION_COOLDOWN_MS = 2000; // 2 second cooldown

  // Initialize WebSocket connection
  const { connectionState, sendMessage, on } = useWebSocket({
    roomCode: roomCode || '',
    token: resolvedToken || '',
    autoConnect: !!roomCode && !!resolvedToken,
  });

  const normalizePlayer = useCallback((player: RoomPlayer): RoomPlayer => {
    const displayName = player.displayName || player.username || 'Player';
    return {
      ...player,
      username: player.username || displayName,
      displayName,
      isHost: player.isHost ?? (room?.hostId ? player.userId === room.hostId : false),
      isReady: player.isReady ?? false,
      isConnected: player.isConnected ?? true,
      contribution: player.contribution ?? 0,
    };
  }, [room?.hostId]);

  // Initialize grid from puzzle data
  const initializeGridFromPuzzle = useCallback((puzzleData: Puzzle) => {
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
          number: cell.number != null ? Number(cell.number) : undefined
        });
      }
      newGrid.push(rowCells);
    }

    setGrid(newGrid);

    // Map clues from API format to UI format
    const mappedAcross = puzzleData.cluesAcross.map(c => ({
      num: Number(c.number),
      direction: 'across' as const,
      clue: c.text,
      answer: c.answer,
      row: Number(c.positionY),
      col: Number(c.positionX)
    }));

    const mappedDown = puzzleData.cluesDown.map(c => ({
      num: Number(c.number),
      direction: 'down' as const,
      clue: c.text,
      answer: c.answer,
      row: Number(c.positionY),
      col: Number(c.positionX)
    }));

    setCluesAcross(mappedAcross);
    setCluesDown(mappedDown);
    setActiveClue(mappedAcross[0] || null);
  }, []);

  // Fetch initial room and puzzle data
  useEffect(() => {
    const fetchGameData = async () => {
      if (authLoading) {
        return;
      }

      if (!roomCode || !resolvedToken) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      if (!user) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      try {
        setLoading(true);

        // Fetch room and set user data
        const [roomData] = await Promise.all([
          roomApi.getRoomByCode({ code: roomCode }),
        ]);
        let effectiveRoom = roomData;
        const isCurrentUserInRoom = roomData.players.some((player) => player.userId === user.id);
        if (!isCurrentUserInRoom && roomData.status !== 'finished' && roomData.status !== 'closed') {
          const joinResponse = await roomApi.joinRoom({
            code: roomCode,
            displayName: user.displayName,
            isSpectator: false,
          });
          effectiveRoom = joinResponse.room;
        }

        setRoom(effectiveRoom);
        setPlayers(effectiveRoom.players.map(normalizePlayer));
        setCurrentUserId(user.id);

        // Fetch puzzle data
        const puzzleData = await puzzleApi.getPuzzleById(effectiveRoom.puzzleId);
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
  }, [roomCode, resolvedToken, user?.id, authLoading, navigate, normalizePlayer, initializeGridFromPuzzle]);

  // WebSocket event handlers
  useEffect(() => {
    if (!roomCode || connectionState !== 'connected') {
      return;
    }

    const unsubscribeRoomState = on<{ players?: RoomPlayer[] }>('room_state', (payload) => {
      setHasJoinedRoom(true);
      if (Array.isArray(payload.players)) {
        setPlayers(payload.players.map((player) => normalizePlayer(player as RoomPlayer)));
      }
    });

    const unsubscribeCellUpdated = on<CellUpdatePayload>('cell_updated', (payload) => {
      if (payload.playerId === currentUserId) return; // Ignore own updates

      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        if (newGrid[payload.y] && newGrid[payload.y][payload.x]) {
          newGrid[payload.y][payload.x].letter = payload.value
            ? payload.value.toUpperCase()
            : '';
        }
        return newGrid;
      });
    });

    const unsubscribeCursorMoved = on<CursorMovePayload>('cursor_moved', (payload) => {
      if (payload.playerId === currentUserId) return; // Ignore own cursor

      setPlayerCursors(prev => {
        const filtered = prev.filter(c => c.userId !== payload.playerId);
        return [...filtered, {
          userId: payload.playerId,
          username: payload.displayName,
          position: { row: payload.y, col: payload.x },
          color: payload.color,
        }];
      });
    });

    const unsubscribePlayerJoined = on<PlayerJoinedPayload>('player_joined', (payload) => {
      setPlayers(prev => {
        if (prev.some(p => p.userId === payload.player.userId)) {
          return prev;
        }
        return [...prev, normalizePlayer(payload.player as RoomPlayer)];
      });
    });

    const unsubscribePlayerLeft = on<PlayerLeftPayload>('player_left', (payload) => {
      setPlayers(prev => prev.filter((p) => p.userId !== payload.userId));
    });

    const unsubscribeRoomDeleted = on<RoomClosedPayload>('room_deleted', () => {
      navigate('/', {
        state: { message: 'The room has been closed by the host.' },
      });
    });

    const unsubscribePuzzleCompleted = on<GameFinishedPayload>('puzzle_completed', (payload) => {
      const winnerEntry = [...payload.players].sort((a, b) => b.contribution - a.contribution)[0];
      setWinner({
        userId: winnerEntry?.userId,
        username: winnerEntry?.displayName,
      });
      setShowWinnerModal(true);
    });

    const unsubscribeReactionAdded = on<ReactionPayload>('reaction_added', (payload) => {
      if (payload.action !== 'added' || !payload.emoji) return;

      const player = players.find(p => p.userId === payload.userId);

      const reaction: Reaction = {
        id: `${payload.userId}-${payload.clueId}-${Date.now()}`,
        userId: payload.userId,
        username: player ? (player.username || player.displayName) : 'Unknown',
        emoji: payload.emoji,
        clueId: payload.clueId,
        timestamp: Date.now(),
      };

      setReactions((prev) => [...prev, reaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 1500);
    });

    const unsubscribeNewMessage = on<ChatMessagePayload>('new_message', (payload) => {
      const bubble = {
        id: payload.id,
        displayName: payload.displayName,
        text: payload.text,
      };

      setChatBubbles((prev) => {
        const next = [...prev, bubble];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      setTimeout(() => {
        setChatBubbles((prev) => prev.filter((item) => item.id !== bubble.id));
      }, 4500);
    });

    return () => {
      unsubscribeRoomState();
      unsubscribeCellUpdated();
      unsubscribeCursorMoved();
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribeRoomDeleted();
      unsubscribePuzzleCompleted();
      unsubscribeReactionAdded();
      unsubscribeNewMessage();
    };
  }, [roomCode, connectionState, on, currentUserId, navigate, players, normalizePlayer]);

  useEffect(() => {
    if (connectionState !== 'connected') {
      setHasJoinedRoom(false);
      return;
    }
  }, [connectionState, roomCode]);

  // Join room over WebSocket for real-time updates
  useEffect(() => {
    if (!roomCode || connectionState !== 'connected' || !user?.displayName || hasJoinedRoom) {
      return;
    }

    const sendJoin = () => {
      sendMessage<JoinRoomPayload>('join_room', {
        roomCode,
        displayName: user.displayName,
        isSpectator: false,
      });
    };

    sendJoin();
    const retryId = window.setInterval(() => {
      if (!hasJoinedRoom) {
        sendJoin();
      }
    }, 1000);

    return () => {
      window.clearInterval(retryId);
    };
  }, [roomCode, connectionState, user?.displayName, hasJoinedRoom, sendMessage]);

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

  const getClueForCell = (row: number, col: number, clueDirection: 'across' | 'down') => {
    const matchingClues = clueDirection === 'across' ? cluesAcross : cluesDown;
    return matchingClues.find((clue) => {
      const clueRow = Number(clue.row);
      const clueCol = Number(clue.col);
      const clueLen = clue.answer ? clue.answer.length : 0;

      if (clueDirection === 'across') {
        return (
          clue.direction === 'across' &&
          clueRow === row &&
          col >= clueCol &&
          col < clueCol + clueLen
        );
      }

      return (
        clue.direction === 'down' &&
        clueCol === col &&
        row >= clueRow &&
        row < clueRow + clueLen
      );
    });
  };

  const getClueForLineStart = (row: number, col: number, clueDirection: 'across' | 'down') => {
    const matchingClues = clueDirection === 'across' ? cluesAcross : cluesDown;

    if (clueDirection === 'across') {
      let startCol = col;
      for (let c = col - 1; c >= 0; c--) {
        if (grid[row]?.[c]?.isBlocked) break;
        if (grid[row]?.[c]?.number != null) {
          startCol = c;
        }
      }

      const startNumber = Number(grid[row]?.[startCol]?.number);
      if (Number.isNaN(startNumber)) return null;

      return matchingClues.find((clue) => Number(clue.num) === startNumber);
    }

    let startRow = row;
    for (let r = row - 1; r >= 0; r--) {
      if (grid[r]?.[col]?.isBlocked) break;
      if (grid[r]?.[col]?.number != null) {
        startRow = r;
      }
    }

    const startNumber = Number(grid[startRow]?.[col]?.number);
    if (Number.isNaN(startNumber)) return null;

    return matchingClues.find((clue) => Number(clue.num) === startNumber);
  };

  const getClueForCellOrNumber = (row: number, col: number, clueDirection: 'across' | 'down') => {
    const directClue = getClueForCell(row, col, clueDirection);
    if (directClue) return directClue;

    const cell = grid[row]?.[col];
    const matchingClues = clueDirection === 'across' ? cluesAcross : cluesDown;
    const cellNumber = cell?.number != null ? Number(cell.number) : null;

    const lineNumberClue = cellNumber != null
      ? matchingClues.find((clue) => Number(clue.num) === cellNumber)
      : null;
    if (lineNumberClue) return lineNumberClue;

    return getClueForLineStart(row, col, clueDirection);
  };

  const getPreviousCellInDirection = (row: number, col: number, clueDirection: 'across' | 'down') => {
    if (clueDirection === 'across') {
      for (let nextCol = col - 1; nextCol >= 0; nextCol--) {
        if (!grid[row][nextCol]?.isBlocked) {
          return { row, col: nextCol };
        }
      }
      return null;
    }

    for (let nextRow = row - 1; nextRow >= 0; nextRow--) {
      if (!grid[nextRow]?.[col]?.isBlocked) {
        return { row: nextRow, col };
      }
    }
    return null;
  };

  const isCellInActiveLine = (row: number, col: number) => {
    if (!selectedCell) return false;

    const lineDirection = activeClue?.direction || direction;
    const lineClue =
      getClueForCell(selectedCell.row, selectedCell.col, lineDirection) ||
      getClueForLineStart(selectedCell.row, selectedCell.col, lineDirection) ||
      (lineDirection === 'across'
        ? getClueForCell(selectedCell.row, selectedCell.col, 'down') || getClueForLineStart(selectedCell.row, selectedCell.col, 'down')
        : getClueForCell(selectedCell.row, selectedCell.col, 'across') || getClueForLineStart(selectedCell.row, selectedCell.col, 'across'));

    if (!lineClue) return false;

    if (lineClue.direction === 'across') {
      const clueRow = Number(lineClue.row);
      const clueCol = Number(lineClue.col);
      return (
        clueRow === row &&
        col >= clueCol &&
        col < clueCol + lineClue.answer.length
      );
    }

    const clueRow = Number(lineClue.row);
    const clueCol = Number(lineClue.col);
    return (
      clueCol === col &&
      row >= clueRow &&
      row < clueRow + lineClue.answer.length
    );
  };

  const getDisplayClueForSelection = (row: number, col: number, preferredDirection: 'across' | 'down') => {
    const fallbackDirection = preferredDirection === 'across' ? 'down' : 'across';
    return (
      getClueForCellOrNumber(row, col, preferredDirection) ||
      getClueForCellOrNumber(row, col, fallbackDirection) ||
      (grid[row]?.[col]?.number
        ? (
          (preferredDirection === 'across' ? cluesAcross : cluesDown).find(
            (clue) => Number(clue.num) === Number(grid[row][col].number)
          ) ||
          (fallbackDirection === 'across' ? cluesAcross : cluesDown).find(
            (clue) => Number(clue.num) === Number(grid[row][col].number)
          )
        )
        : null)
    );
  };

  const resolvedActiveClue = activeClue
    ? activeClue
    : (selectedCell
      ? getDisplayClueForSelection(selectedCell.row, selectedCell.col, direction)
      : null);

  const currentClueHint = resolvedActiveClue?.clue || 'Select a square to activate a hint.';
  const currentCluePosition = selectedCell
    ? `Row ${selectedCell.row + 1} · Col ${selectedCell.col + 1}`
    : 'No square selected';
  const currentClueLabel = resolvedActiveClue
    ? `${resolvedActiveClue.direction === 'down' ? 'Down' : 'Across'} #${resolvedActiveClue.num}`
    : 'Select a clue';

  const getNextDirectionForCell = (row: number, col: number, requestedDirection: 'across' | 'down') => {
    const acrossClue = getClueForCellOrNumber(row, col, 'across');
    const downClue = getClueForCellOrNumber(row, col, 'down');
    const isCurrentCellSelected = selectedCell?.row === row && selectedCell?.col === col;
    const currentDisplayDirection = activeClue?.direction || direction;
    const hasBothDirections = Boolean(acrossClue && downClue);

    if (isCurrentCellSelected && hasBothDirections && activeClue) {
      return currentDisplayDirection === 'across' ? 'down' : 'across';
    }

    if (isCurrentCellSelected && requestedDirection === direction && hasBothDirections) {
      return direction === 'across' ? 'down' : 'across';
    }

    return requestedDirection;
  };

  const handleCellClick = (row: number, col: number) => {
    if (grid[row][col].isBlocked) return;
    
    const nextDirection = selectedCell?.row === row && selectedCell?.col === col
      ? direction === 'across' ? 'down' : 'across'
      : direction;
    const resolvedDirection = getNextDirectionForCell(row, col, nextDirection);
    const fallbackDirection = resolvedDirection === 'across' ? 'down' : 'across';

    let targetClue = getClueForCellOrNumber(row, col, resolvedDirection);
    let targetDirection = resolvedDirection;
    if (!targetClue) {
      targetClue = getClueForCellOrNumber(row, col, fallbackDirection);
      targetDirection = fallbackDirection;
    }

    setDirection(targetDirection);

    setSelectedCell({ row, col });
    setActiveClue(targetClue ?? getDisplayClueForSelection(row, col, targetDirection) ?? null);

    // Send cursor move to other players
    if (currentUserId) {
      const playerIndex = players.findIndex(p => p.userId === currentUserId);
      sendMessage<CursorMovePayload>('cursor_move', {
        playerId: currentUserId,
        displayName: players.find(p => p.userId === currentUserId)?.displayName || 'Unknown',
        x: col,
        y: row,
        color: getPlayerColor(playerIndex),
      });
    }

    mobileInputRef.current?.focus({ preventScroll: true } as FocusOptions);

  };

  const handleCellInputKey = (key: string) => {
    if (!selectedCell || !currentUserId) return;

    const { row, col } = selectedCell;

    if (key === 'Backspace') {
      const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
      const previousCell = getPreviousCellInDirection(row, col, direction);
      const updatedPositions = [{ row, col, value: '' }];

      newGrid[row][col].letter = '';

      if (!grid[row][col].letter && previousCell) {
        newGrid[previousCell.row][previousCell.col].letter = '';
        updatedPositions.push({
          row: previousCell.row,
          col: previousCell.col,
          value: '',
        });
      }

      if (previousCell) {
        const newCell = previousCell;
        setSelectedCell(newCell);
        moveCursor(newCell);
      }

      setGrid(newGrid);
      updateProgress(newGrid);
      const uniqueUpdates = new Set<string>();
      updatedPositions.forEach((entry) => {
        const updateKey = `${entry.row}-${entry.col}`;
        if (uniqueUpdates.has(updateKey)) return;
        uniqueUpdates.add(updateKey);
        sendMessage<CellUpdatePayload>('cell_update', {
          x: entry.col,
          y: entry.row,
          value: entry.value,
        });
      });
    } else if (key.length === 1 && key.match(/^[a-zA-Z]$/)) {
      const newGrid = [...grid];
      const letter = key.toUpperCase();
      newGrid[row][col].letter = letter;
      setGrid(newGrid);

      sendMessage<CellUpdatePayload>('cell_update', {
        x: col,
        y: row,
        value: letter,
      });

      updateProgress(newGrid);

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
    } else if (key === 'ArrowRight') {
      const maxCol = grid[0]?.length || 0;
      let newCol = col + 1;
      while (newCol < maxCol && grid[row][newCol]?.isBlocked) newCol++;
      if (newCol < maxCol) {
        const newCell = { row, col: newCol };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (key === 'ArrowLeft') {
      let newCol = col - 1;
      while (newCol >= 0 && grid[row][newCol]?.isBlocked) newCol--;
      if (newCol >= 0) {
        const newCell = { row, col: newCol };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (key === 'ArrowDown') {
      const maxRow = grid.length || 0;
      let newRow = row + 1;
      while (newRow < maxRow && grid[newRow]?.[col]?.isBlocked) newRow++;
      if (newRow < maxRow) {
        const newCell = { row: newRow, col };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    } else if (key === 'ArrowUp') {
      let newRow = row - 1;
      while (newRow >= 0 && grid[newRow]?.[col]?.isBlocked) newRow--;
      if (newRow >= 0) {
        const newCell = { row: newRow, col };
        setSelectedCell(newCell);
        moveCursor(newCell);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || !currentUserId) return;

    const key = e.key;
    if (key === 'Backspace' || key.startsWith('Arrow')) {
      e.preventDefault();
      handleCellInputKey(key);
    } else if (key.length === 1 && key.match(/^[a-zA-Z]$/)) {
      e.preventDefault();
      handleCellInputKey(key);
    }
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!selectedCell || !currentUserId) return;
    e.stopPropagation();

    if (e.key === 'Backspace' || e.key.startsWith('Arrow')) {
      e.preventDefault();
      handleCellInputKey(e.key);
    }
  };

  const handleMobileInput = (value: string) => {
    if (!selectedCell || !currentUserId) return;

    const normalized = value.replace(/[^a-zA-Z]/g, '').slice(-1);
    if (!normalized) return;

    handleCellInputKey(normalized);
    if (mobileInputRef.current) {
      mobileInputRef.current.value = '';
    }
  };

  const moveCursor = useCallback((cell: { row: number, col: number }) => {
    if (!currentUserId) return;

    const playerIndex = players.findIndex(p => p.userId === currentUserId);
    sendMessage<CursorMovePayload>('cursor_move', {
      playerId: currentUserId,
      displayName: players.find(p => p.userId === currentUserId)?.displayName || 'Unknown',
      x: cell.col,
      y: cell.row,
      color: getPlayerColor(playerIndex),
    });
  }, [currentUserId, players, sendMessage]);

  const handleClueSelect = useCallback((clue: Clue) => {
    const nextDirection = clue.direction || 'across';
    setDirection(nextDirection);
    setActiveClue(clue);

    if (grid[clue.row]?.[clue.col] && !grid[clue.row][clue.col].isBlocked) {
      const targetCell = { row: clue.row, col: clue.col };
      setSelectedCell(targetCell);
      moveCursor(targetCell);
      mobileInputRef.current?.focus({ preventScroll: true } as FocusOptions);
    }
  }, [grid, moveCursor]);

  const updateProgress = useCallback((currentGrid: GridCell[][]) => {
    if (!currentUserId) return;

    const totalCells = currentGrid.flat().filter(c => !c.isBlocked).length;
    const filledCells = currentGrid.flat().filter(c => !c.isBlocked && c.letter !== '').length;
    const correctCells = currentGrid.flat().filter(c => !c.isBlocked && c.letter === c.correctLetter).length;
    const progressPercent = Math.round((filledCells / totalCells) * 100);

    setPlayerProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentUserId, {
        userId: currentUserId,
        filledCells,
        correctCells,
        progressPercent,
      });
      return newMap;
    });
  }, [currentUserId]);

  const handleLeaveGame = async () => {
    if (!room || !currentUserId) return;

    try {
      if (connectionState === 'connected' && hasJoinedRoom) {
        sendMessage<Record<string, never>>('leave_room', {});
        navigate('/');
        return;
      }

      if (room.hostId === currentUserId) {
        await roomApi.closeRoom({ roomId: room.id });
      }
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

    sendMessage<{ text: string }>('send_message', {
      text: message,
    });
  }, [currentUserId, roomCode, sendMessage]);

  const handleTyping = useCallback(() => {}, []);

  // Reaction handlers
  const handleReactionSelect = useCallback((emoji: string) => {
    if (!currentUserId || reactionCooldown) return;

    const now = Date.now();
    if (now - lastReactionTime < REACTION_COOLDOWN_MS) {
      return; // Still in cooldown
    }

    const clueId = activeClue
      ? `${activeClue.direction || 'across'}-${activeClue.num}`
      : `${currentUserId}-general`;

    sendMessage<{ clueId: string; emoji: string }>('reaction', {
      clueId,
      emoji,
    });

    // Set cooldown
    setLastReactionTime(now);
    setReactionCooldown(true);

    setTimeout(() => {
      setReactionCooldown(false);
    }, REACTION_COOLDOWN_MS);
  }, [currentUserId, sendMessage, reactionCooldown, lastReactionTime]);

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

      <style>{`
        @keyframes chatBubblePop {
          0% {
            opacity: 0;
            transform: translateY(-18px) scale(0.85) rotate(-1.5deg);
          }
          55% {
            opacity: 1;
            transform: translateY(4px) scale(1.03) rotate(1.5deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        @keyframes chatBubbleFade {
          0%, 12% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(10px) scale(0.97);
          }
        }

        .chat-bubble-enter {
          animation: chatBubblePop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .chat-bubble-exit {
          animation: chatBubbleFade 1200ms cubic-bezier(0.22, 1, 0.36, 1) 2.3s forwards;
        }
      `}</style>

      <div className="pointer-events-none fixed right-6 top-28 z-50 flex w-[min(92vw,24rem)] flex-col gap-2 sm:right-8">
        {chatBubbles.map((message) => (
          <div
            key={message.id}
            className="chat-bubble-enter chat-bubble-exit pointer-events-auto relative bg-[#2A1E5C] text-white rounded-2xl border-2 border-white/30 px-4 py-2.5 shadow-[0_10px_25px_rgba(42,30,92,0.2)]"
          >
            <div className="font-display text-xs font-semibold text-[#D6CBFF] mb-0.5">
              {message.displayName}
            </div>
            <p className="font-display text-sm leading-tight">{message.text}</p>
          </div>
        ))}
      </div>

      <Header />
      <div className="h-16" />

      {/* Focused Gameplay Header */}
      <div className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-[1600px] mx-auto px-4 py-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-xs uppercase tracking-wide text-[#6B5CA8]">Multiplayer Solve</p>
              <h1 className="font-display font-bold text-lg sm:text-xl text-[#2A1E5C]">
                {puzzle?.title || 'Multiplayer Crossword'}
              </h1>
              <p className="font-display text-xs text-[#6B5CA8]">
                Room {roomCode} • {players.length} players
              </p>
            </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#F3F1FF] px-2.5 py-1 rounded-full">
                  <Clock className="w-4 h-4 text-[#7B61FF]" />
                <span className="font-display text-xs text-[#6B5CA8]">{formatTime(timer)}</span>
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
              <button
                onClick={() => setShowMetaPanel((open) => !open)}
                className={`px-3 py-1.5 rounded-lg font-display text-xs sm:text-sm font-semibold border transition-colors ${
                  showMetaPanel
                    ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                    : 'bg-white text-[#6B5CA8] border-[#ECE9FF] hover:bg-[#F3F1FF]'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-1.5 align-middle" />
                {showMetaPanel ? 'Close room panel' : 'Players'}
              </button>
              <button
                onClick={handleLeaveGame}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#FF4D6A] font-display font-semibold rounded-lg border-2 border-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Clue Bar */}
      <div className="bg-[#7B61FF] border-y border-[#6A53E8]">
        <div className="max-w-[1320px] mx-auto px-4 py-2.5">
          <div className="flex flex-col gap-1.5 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.14em] text-white/80">
                {currentClueLabel}
              </p>
              <p className="font-display font-semibold text-sm text-white leading-tight">
                {currentClueHint}
              </p>
            </div>
            <p className="font-display text-xs text-white/80">
              {currentCluePosition}
            </p>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <section className="space-y-3 max-w-3xl mx-auto">
          <div className="crossy-card p-3">
            <div className="flex justify-center w-full">
              <div
                ref={gridRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="relative bg-white rounded-2xl p-3 outline-none w-full"
              >
                <input
                  ref={mobileInputRef}
                type="text"
              inputMode="text"
              autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={1}
                  className="absolute left-0 top-0 w-10 h-10 opacity-0"
                  onKeyDown={handleMobileKeyDown}
                  onChange={(e) => handleMobileInput(e.target.value)}
                />
                <div
                  className="grid gap-1 w-full"
                  style={{
                    gridTemplateColumns: `repeat(${puzzle?.gridWidth || 7}, 1fr)`,
                    width: '100%',
                  }}
                >
                  {grid.map((row, rowIndex) => (
                    row.map((cell, colIndex) => {
                      const isSelectedCell = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                      const isActiveLineCell = isCellInActiveLine(rowIndex, colIndex);
                      const otherPlayerCursor = playerCursors.find(
                        c => c.position.row === rowIndex && c.position.col === colIndex
                      );

                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onTouchStart={(event) => {
                            event.preventDefault();
                            handleCellClick(rowIndex, colIndex);
                          }}
                          className={`
                            relative w-full aspect-square flex items-center justify-center
                            text-base sm:text-lg font-display font-bold
                            rounded-lg border-2 cursor-pointer select-none
                            transition-all duration-150
                            ${cell.isBlocked
                              ? 'bg-[#2A1E5C] border-[#2A1E5C]'
                              : isSelectedCell
                                ? 'bg-[#7B61FF] border-[#7B61FF] text-white shadow-inner'
                                : isActiveLineCell
                                  ? 'bg-[#EEE6FF] border-[#8A6BFA] ring-2 ring-[#8A6BFA]/55 text-[#2A1E5C] shadow-[inset_0_0_0_1px_rgba(138,107,250,0.35)]'
                                  : otherPlayerCursor
                                    ? `border-[#7B61C6] bg-white text-[#2A1E5C]`
                                    : 'bg-white border-[#7B61FF] text-[#2A1E5C] hover:bg-[#F3F1FF]'
                            }
                          `}
                          style={otherPlayerCursor ? {
                            borderColor: otherPlayerCursor.color,
                            backgroundColor: `${otherPlayerCursor.color}15`,
                          } : undefined}
                        >
                          {cell.number && (
                            <span className={`absolute top-0.5 left-1 text-[22px] sm:text-[24px] font-display font-bold leading-none ${
                              isSelectedCell ? 'text-white' : 'text-[#6F4EC2]'
                            }`}>
                              {cell.number}
                            </span>
                          )}
                          <span className="relative z-10 leading-none">{cell.letter}</span>
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
          </div>

          <div className="crossy-card p-2 sm:p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => setDirection('across')}
                className={`px-2.5 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                  direction === 'across' ? 'bg-[#7B61FF] text-white' : 'bg-[#F3F1FF] text-[#6B5CA8]'
                }`}
              >
                Across
              </button>
              <button
                onClick={() => setDirection('down')}
                className={`px-2.5 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
                  direction === 'down' ? 'bg-[#7B61FF] text-white' : 'bg-[#F3F1FF] text-[#6B5CA8]'
                }`}
              >
                Down
              </button>
            </div>
            <p className="font-display text-sm text-[#2A1E5C] mb-1.5">
              {resolvedActiveClue?.num || 1} · {resolvedActiveClue?.clue || 'Select a square to activate a clue.'}
            </p>
            <div className="space-y-1 max-h-36 overflow-auto pr-1">
              {(direction === 'across' ? cluesAcross : cluesDown).map((clue) => (
                <button
                  key={`${direction}-${clue.num}-${clue.row}-${clue.col}`}
                  onClick={() => handleClueSelect(clue)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                    resolvedActiveClue?.direction === direction && resolvedActiveClue?.num === clue.num
                      ? 'bg-[#7B61FF]/10 border-[#7B61FF] text-[#2A1E5C]'
                      : 'bg-white border-[#ECE9FF] text-[#6B5CA8] hover:bg-[#F3F1FF]'
                  }`}
                >
                  <span className="font-display font-semibold text-xs mr-1">{clue.num}.</span>
                  <span className="font-display text-sm">{clue.clue}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-0 bg-black/25 z-30 transition-opacity duration-150 ${
          showMetaPanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowMetaPanel(false)}
      />

      <aside
        className={`fixed z-40 top-20 right-3 w-[min(92vw,22rem)] sm:w-[20rem] md:w-[23rem] transition-all duration-200 ${
          showMetaPanel
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="crossy-card p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7B61FF]" />
              <h2 className="font-display font-semibold text-[#2A1E5C] text-sm">
                Room details
              </h2>
            </div>
            <button
              onClick={() => setShowMetaPanel(false)}
              className="text-[#6B5CA8] text-xs font-semibold py-1 px-2 border border-[#ECE9FF] rounded-md bg-white hover:bg-[#F3F1FF]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMetaPanel('players')}
              className={`px-3 py-2 rounded-lg font-display text-sm font-semibold border transition-colors ${
                metaPanel === 'players'
                  ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                  : 'bg-white text-[#6B5CA8] border-[#ECE9FF] hover:bg-[#F3F1FF]'
              }`}
            >
              Players
            </button>
            <button
              type="button"
              onClick={() => setMetaPanel('chat')}
              className={`px-3 py-2 rounded-lg font-display text-sm font-semibold border transition-colors ${
                metaPanel === 'chat'
                  ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                  : 'bg-white text-[#6B5CA8] border-[#ECE9FF] hover:bg-[#F3F1FF]'
              }`}
            >
              Chat
            </button>
          </div>

          {metaPanel === 'players' ? (
            <div className="max-h-[22rem]">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-[#2A1E5C]">
                  Players ({players.length})
                </h3>
              </div>

              <div className="space-y-2">
                {players.map((player, index) => {
                  const progress = getPlayerProgress(player.userId);
                  const isCurrentPlayer = player.userId === currentUserId;

                  return (
                    <div
                      key={player.userId}
                      className={`p-2.5 rounded-xl border-2 transition-all ${
                        isCurrentPlayer
                          ? 'bg-[#7B61FF]/10 border-[#7B61FF]'
                          : 'bg-[#F3F1FF] border-[#ECE9FF]'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-white text-xs"
                          style={{ backgroundColor: getPlayerColor(index) }}
                        >
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-xs text-[#2A1E5C] truncate">
                            {player.username}
                            {isCurrentPlayer && ' (You)'}
                          </p>
                          <p className="font-display text-xs text-[#6B5CA8]">
                            {progress}% complete
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
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
                })}
              </div>
            </div>
          ) : (
            <div className="h-[22rem]">
              <ChatPanel
                roomCode={roomCode || ''}
                currentUserId={currentUserId}
                onSendMessage={handleSendChatMessage}
                onTyping={handleTyping}
                on={on}
              />
            </div>
          )}
        </div>
      </aside>

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
