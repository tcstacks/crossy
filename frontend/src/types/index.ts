// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  puzzlesSolved: number;
  avgSolveTime: number;
  streakCurrent: number;
  streakBest: number;
  multiplayerWins: number;
  totalPlayTime: number;
  lastPlayedAt?: string;
}

export interface PuzzleHistory {
  id: string;
  userId: string;
  puzzleId: string;
  roomId?: string;
  solveTime: number;
  completed: boolean;
  accuracy: number;
  hintsUsed: number;
  completedAt?: string;
  createdAt: string;
}

// Puzzle types
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GridCell {
  letter: string | null;
  number?: number;
  isCircled?: boolean;
  rebus?: string;
}

export interface Clue {
  number: number;
  text: string;
  answer?: string;
  positionX: number;
  positionY: number;
  length: number;
  direction: 'across' | 'down';
}

export interface Puzzle {
  id: string;
  date?: string;
  title: string;
  author: string;
  difficulty: Difficulty;
  gridWidth: number;
  gridHeight: number;
  grid: GridCell[][];
  cluesAcross: Clue[];
  cluesDown: Clue[];
  theme?: string;
  avgSolveTime?: number;
  createdAt: string;
  publishedAt?: string;
}

// Room types
export type RoomMode = 'collaborative' | 'race' | 'relay';
export type RoomState = 'lobby' | 'active' | 'completed';

export interface RoomConfig {
  maxPlayers: number;
  isPublic: boolean;
  spectatorMode: boolean;
  timerMode: 'none' | 'countdown' | 'stopwatch';
  timerSeconds?: number;
  hintsEnabled: boolean;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  puzzleId: string;
  mode: RoomMode;
  config: RoomConfig;
  state: RoomState;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Player {
  userId: string;
  roomId: string;
  displayName: string;
  cursorX?: number;
  cursorY?: number;
  isSpectator: boolean;
  isConnected: boolean;
  contribution: number;
  color: string;
  joinedAt: string;
}

// Game state types
export interface Cell {
  value: string | null;
  isRevealed: boolean;
  isCorrect?: boolean;
  lastEditedBy?: string;
}

export interface GameGridState {
  roomId: string;
  cells: Cell[][];
  completedClues: string[];
  lastUpdated: string;
}

// Chat types
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

// WebSocket message types
export type WSMessageType =
  | 'join_room'
  | 'leave_room'
  | 'cell_update'
  | 'cursor_move'
  | 'send_message'
  | 'request_hint'
  | 'start_game'
  | 'reaction'
  | 'pass_turn'
  | 'room_state'
  | 'player_joined'
  | 'player_left'
  | 'cell_updated'
  | 'cursor_moved'
  | 'new_message'
  | 'game_started'
  | 'puzzle_completed'
  | 'error'
  | 'reaction_added'
  | 'race_progress'
  | 'player_finished'
  | 'turn_changed'
  | 'room_deleted';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}

// API response types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface RoomResponse {
  room: Room;
  players: Player[];
  puzzle?: Puzzle;
  gridState?: GameGridState;
}

export interface PuzzleCompletedPayload {
  solveTime: number;
  players: PlayerResult[];
  completedAt: string;
}

export interface PlayerResult {
  userId: string;
  displayName: string;
  contribution: number;
  color: string;
}

// Race mode types
export interface RaceProgress {
  userId: string;
  displayName: string;
  progress: number;
  finishedAt?: string;
  solveTime?: number;
  rank?: number;
}

export interface RaceProgressPayload {
  leaderboard: RaceProgress[];
}

export interface PlayerFinishedPayload {
  userId: string;
  displayName: string;
  solveTime: number;
  rank: number;
}

// Relay mode types
export interface TurnChangedPayload {
  currentPlayerId: string;
  currentPlayerName: string;
  turnNumber: number;
  turnStartedAt?: string; // ISO timestamp
  turnTimeLimit?: number; // seconds
}
