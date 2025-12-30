'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Puzzle, Room, Player, Cell, Message, Clue } from '@/types';

interface CursorPosition {
  x: number;
  y: number;
  direction: 'across' | 'down';
}

interface PlayerCursor {
  playerId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
}

interface GameState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Puzzle
  puzzle: Puzzle | null;
  cells: Cell[][];
  selectedCell: CursorPosition | null;
  selectedClue: Clue | null;
  completedClues: string[];
  startTime: number | null;
  solveTime: number | null;

  // Room
  room: Room | null;
  players: Player[];
  playerCursors: PlayerCursor[];
  messages: Message[];
  isHost: boolean;

  // UI
  showChat: boolean;
  showClues: boolean;
  hintsUsed: number;

  // Actions
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  setPuzzle: (puzzle: Puzzle) => void;
  setCells: (cells: Cell[][]) => void;
  updateCell: (x: number, y: number, value: string | null, playerId?: string) => void;
  setSelectedCell: (position: CursorPosition | null) => void;
  setSelectedClue: (clue: Clue | null) => void;
  markClueCompleted: (clueId: string) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (userId: string) => void;
  updatePlayerCursor: (cursor: PlayerCursor) => void;
  removePlayerCursor: (playerId: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setShowChat: (show: boolean) => void;
  setShowClues: (show: boolean) => void;
  startGame: () => void;
  endGame: (solveTime: number) => void;
  incrementHints: () => void;
  resetGame: () => void;
}

const initialCells: Cell[][] = [];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      puzzle: null,
      cells: initialCells,
      selectedCell: null,
      selectedClue: null,
      completedClues: [],
      startTime: null,
      solveTime: null,
      room: null,
      players: [],
      playerCursors: [],
      messages: [],
      isHost: false,
      showChat: false,
      showClues: true,
      hintsUsed: 0,

      // Actions
      setUser: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: !!user && !!token,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      setPuzzle: (puzzle) => {
        const cells: Cell[][] = puzzle.grid.map((row) =>
          row.map(() => ({
            value: null,
            isRevealed: false,
          }))
        );
        set({ puzzle, cells, completedClues: [], solveTime: null });
      },

      setCells: (cells) => set({ cells }),

      updateCell: (x, y, value, playerId) => {
        const { cells } = get();
        const newCells = cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (rowIndex === y && colIndex === x) {
              return {
                ...cell,
                value,
                lastEditedBy: playerId,
              };
            }
            return cell;
          })
        );
        set({ cells: newCells });
      },

      setSelectedCell: (position) => set({ selectedCell: position }),

      setSelectedClue: (clue) => set({ selectedClue: clue }),

      markClueCompleted: (clueId) => {
        const { completedClues } = get();
        if (!completedClues.includes(clueId)) {
          set({ completedClues: [...completedClues, clueId] });
        }
      },

      setRoom: (room) =>
        set({
          room,
          isHost: room ? room.hostId === get().user?.id : false,
        }),

      setPlayers: (players) => set({ players }),

      addPlayer: (player) => {
        const { players } = get();
        const exists = players.some((p) => p.userId === player.userId);
        if (!exists) {
          set({ players: [...players, player] });
        }
      },

      removePlayer: (userId) => {
        const { players, playerCursors } = get();
        set({
          players: players.filter((p) => p.userId !== userId),
          playerCursors: playerCursors.filter((c) => c.playerId !== userId),
        });
      },

      updatePlayerCursor: (cursor) => {
        const { playerCursors, user } = get();
        if (cursor.playerId === user?.id) return;

        const exists = playerCursors.findIndex((c) => c.playerId === cursor.playerId);
        if (exists >= 0) {
          const newCursors = [...playerCursors];
          newCursors[exists] = cursor;
          set({ playerCursors: newCursors });
        } else {
          set({ playerCursors: [...playerCursors, cursor] });
        }
      },

      removePlayerCursor: (playerId) => {
        const { playerCursors } = get();
        set({ playerCursors: playerCursors.filter((c) => c.playerId !== playerId) });
      },

      addMessage: (message) => {
        const { messages } = get();
        set({ messages: [...messages, message] });
      },

      setMessages: (messages) => set({ messages }),

      setShowChat: (show) => set({ showChat: show }),

      setShowClues: (show) => set({ showClues: show }),

      startGame: () => set({ startTime: Date.now() }),

      endGame: (solveTime) => set({ solveTime }),

      incrementHints: () => {
        const { hintsUsed } = get();
        set({ hintsUsed: hintsUsed + 1 });
      },

      resetGame: () =>
        set({
          puzzle: null,
          cells: initialCells,
          selectedCell: null,
          selectedClue: null,
          completedClues: [],
          startTime: null,
          solveTime: null,
          room: null,
          players: [],
          playerCursors: [],
          messages: [],
          isHost: false,
          hintsUsed: 0,
        }),
    }),
    {
      name: 'crossplay-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
