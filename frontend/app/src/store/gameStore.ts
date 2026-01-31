import { create } from 'zustand';
import type { Puzzle, Room, RoomPlayer, GridCell, PlayerCursor, GameMode, ProgressState, GameState } from '../types';

// No additional interface needed - GameState already has all the properties

// Helper function to initialize empty grid
const initializeGrid = (puzzle: Puzzle | null): GridCell[][] => {
  if (!puzzle) {
    return [];
  }

  const gridSize = puzzle.grid.length;
  const newGrid: GridCell[][] = [];

  for (let i = 0; i < gridSize; i++) {
    newGrid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      newGrid[i][j] = {
        value: null,
        isFixed: false,
        isError: false,
      };
    }
  }

  return newGrid;
};

// Helper function to calculate progress
const calculateProgress = (grid: GridCell[][], puzzle: Puzzle | null): ProgressState => {
  if (!puzzle || grid.length === 0) {
    return {
      totalCells: 0,
      filledCells: 0,
      correctCells: 0,
    };
  }

  let totalCells = 0;
  let filledCells = 0;
  let correctCells = 0;

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      // Count only playable cells (not obstacles)
      if (puzzle.grid[i][j] !== -1) {
        totalCells++;
        if (grid[i][j].value !== null) {
          filledCells++;
          if (puzzle.solution && grid[i][j].value === puzzle.solution[i][j]) {
            correctCells++;
          }
        }
      }
    }
  }

  return {
    totalCells,
    filledCells,
    correctCells,
  };
};

// Helper function to check if game is complete
const checkIsComplete = (grid: GridCell[][], puzzle: Puzzle | null): boolean => {
  if (!puzzle || grid.length === 0) {
    return false;
  }

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      // Skip obstacles
      if (puzzle.grid[i][j] === -1) {
        continue;
      }
      // Check if cell is filled and correct
      if (!puzzle.solution || grid[i][j].value !== puzzle.solution[i][j]) {
        return false;
      }
    }
  }

  return true;
};

// Create the game store
export const useGameStore = create<GameState>((set, get) => ({
  // Initial single-player state
  currentPuzzle: null,
  grid: [],
  selectedCell: null,
  direction: 'across',
  timer: {
    startTime: null,
    elapsedTime: 0,
    isRunning: false,
  },
  progress: {
    totalCells: 0,
    filledCells: 0,
    correctCells: 0,
  },

  // Initial multiplayer state
  room: null,
  players: [],
  gameMode: 'single-player',
  currentTurn: null,
  playerCursors: [],

  // Initial computed values
  isComplete: false,
  filledCells: 0,
  progressPercent: 0,

  // Single-player actions
  setPuzzle: (puzzle: Puzzle) => {
    const newGrid = initializeGrid(puzzle);
    const progress = calculateProgress(newGrid, puzzle);
    const isComplete = checkIsComplete(newGrid, puzzle);

    set({
      currentPuzzle: puzzle,
      grid: newGrid,
      selectedCell: null,
      progress,
      isComplete,
      filledCells: progress.filledCells,
      progressPercent: progress.totalCells > 0 ? (progress.filledCells / progress.totalCells) * 100 : 0,
    });
  },

  updateCell: (row: number, col: number, value: number | null) => {
    const state = get();
    const { grid, currentPuzzle } = state;

    if (!currentPuzzle || row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
      return;
    }

    // Don't update fixed cells
    if (grid[row][col].isFixed) {
      return;
    }

    const newGrid = grid.map((rowArr, i) =>
      rowArr.map((cell, j) => {
        if (i === row && j === col) {
          return {
            ...cell,
            value,
            isError: value !== null && currentPuzzle.solution && value !== currentPuzzle.solution[i][j],
          };
        }
        return cell;
      })
    );

    const progress = calculateProgress(newGrid, currentPuzzle);
    const isComplete = checkIsComplete(newGrid, currentPuzzle);

    set({
      grid: newGrid,
      progress,
      isComplete,
      filledCells: progress.filledCells,
      progressPercent: progress.totalCells > 0 ? (progress.filledCells / progress.totalCells) * 100 : 0,
    });
  },

  selectCell: (row: number, col: number) => {
    set({
      selectedCell: { row, col },
    });
  },

  toggleDirection: () => {
    const { direction } = get();
    set({
      direction: direction === 'across' ? 'down' : 'across',
    });
  },

  startTimer: () => {
    set({
      timer: {
        startTime: Date.now(),
        elapsedTime: 0,
        isRunning: true,
      },
    });
  },

  stopTimer: () => {
    const { timer } = get();
    set({
      timer: {
        ...timer,
        isRunning: false,
      },
    });
  },

  updateElapsedTime: (elapsed: number) => {
    const { timer } = get();
    set({
      timer: {
        ...timer,
        elapsedTime: elapsed,
      },
    });
  },

  resetGame: () => {
    const { currentPuzzle } = get();
    const newGrid = initializeGrid(currentPuzzle);
    const progress = calculateProgress(newGrid, currentPuzzle);
    const isComplete = checkIsComplete(newGrid, currentPuzzle);

    set({
      grid: newGrid,
      selectedCell: null,
      direction: 'across',
      timer: {
        startTime: null,
        elapsedTime: 0,
        isRunning: false,
      },
      progress,
      isComplete,
      filledCells: progress.filledCells,
      progressPercent: 0,
    });
  },

  // Multiplayer actions
  setRoom: (room: Room | null) => {
    set({
      room,
      players: room?.players || [],
    });
  },

  addPlayer: (player: RoomPlayer) => {
    const { players } = get();
    const existingIndex = players.findIndex(p => p.userId === player.userId);

    if (existingIndex >= 0) {
      // Update existing player
      const newPlayers = [...players];
      newPlayers[existingIndex] = player;
      set({ players: newPlayers });
    } else {
      // Add new player
      set({ players: [...players, player] });
    }
  },

  removePlayer: (userId: string) => {
    const { players, playerCursors } = get();
    set({
      players: players.filter(p => p.userId !== userId),
      playerCursors: playerCursors.filter(c => c.userId !== userId),
    });
  },

  updatePlayerCursor: (cursor: PlayerCursor) => {
    const { playerCursors } = get();
    const existingIndex = playerCursors.findIndex(c => c.userId === cursor.userId);

    if (existingIndex >= 0) {
      // Update existing cursor
      const newCursors = [...playerCursors];
      newCursors[existingIndex] = cursor;
      set({ playerCursors: newCursors });
    } else {
      // Add new cursor
      set({ playerCursors: [...playerCursors, cursor] });
    }
  },

  setGameMode: (mode: GameMode) => {
    set({ gameMode: mode });
  },

  setCurrentTurn: (userId: string | null) => {
    set({ currentTurn: userId });
  },

  clearPlayerCursors: () => {
    set({ playerCursors: [] });
  },
}));
