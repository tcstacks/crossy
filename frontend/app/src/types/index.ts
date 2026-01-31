// Re-export all API types
export type {
  // Auth Types
  RegisterRequest,
  LoginRequest,
  GuestLoginRequest,
  AuthResponse,
  // User Types
  User,
  UserStats,
  PuzzleHistory,
  SavePuzzleHistoryRequest,
  // Puzzle Types
  Puzzle,
  GridCell as ApiGridCell,
  Clue as ApiClue,
  PuzzleArchiveItem,
  GetPuzzleByDateRequest,
  GetPuzzleArchiveRequest,
  PuzzleArchiveResponse,
  // Room Types
  Room,
  RoomPlayer,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomByCodeRequest,
  JoinRoomRequest,
  JoinRoomResponse,
  StartRoomRequest,
  CloseRoomRequest,
  // Error Types
  ApiError,
  ApiResponse,
} from './api';

// Re-export all WebSocket types
export type {
  WebSocketMessage,
  ConnectionState,
  MessageHandler,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerReadyPayload,
  GameStartedPayload,
  GameFinishedPayload,
  RoomClosedPayload,
  CellUpdatePayload,
  CursorMovePayload,
  PlayerProgressPayload,
  PlayerFinishedPayload,
  ChatMessage,
  ChatMessagePayload,
  TypingIndicatorPayload,
  Reaction,
  ReactionPayload,
  Clue,
  ClueRevealedPayload,
  HintRequestedPayload,
  HintProvidedPayload,
  ErrorPayload,
  SyncStatePayload,
  OutboundMessageType,
  InboundMessageType,
  MessageType,
  UseWebSocketOptions,
  UseWebSocketReturn,
} from './websocket';

// Game State Types
export interface GridCell {
  value: number | null;
  isFixed: boolean;
  isError?: boolean;
}

export type Direction = 'across' | 'down';

export interface SelectedCell {
  row: number;
  col: number;
}

export interface PlayerCursor {
  userId: string;
  username: string;
  position: SelectedCell;
  color: string;
}

export type GameMode = 'single-player' | 'multiplayer';

export interface TimerState {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

export interface ProgressState {
  totalCells: number;
  filledCells: number;
  correctCells: number;
}

export interface GameState {
  // Single-player state
  currentPuzzle: import('./api').Puzzle | null;
  grid: GridCell[][];
  selectedCell: SelectedCell | null;
  direction: Direction;
  timer: TimerState;
  progress: ProgressState;

  // Multiplayer state
  room: import('./api').Room | null;
  players: import('./api').RoomPlayer[];
  gameMode: GameMode;
  currentTurn: string | null;
  playerCursors: PlayerCursor[];

  // Computed values
  isComplete: boolean;
  filledCells: number;
  progressPercent: number;

  // Single-player actions
  setPuzzle: (puzzle: import('./api').Puzzle) => void;
  updateCell: (row: number, col: number, value: number | null) => void;
  selectCell: (row: number, col: number) => void;
  toggleDirection: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  updateElapsedTime: (elapsed: number) => void;
  resetGame: () => void;

  // Multiplayer actions
  setRoom: (room: import('./api').Room | null) => void;
  addPlayer: (player: import('./api').RoomPlayer) => void;
  removePlayer: (userId: string) => void;
  updatePlayerCursor: (cursor: PlayerCursor) => void;
  setGameMode: (mode: GameMode) => void;
  setCurrentTurn: (userId: string | null) => void;
  clearPlayerCursors: () => void;
}

// Room State Type
export type RoomState = 'waiting' | 'playing' | 'finished' | 'closed';

// Player Type (for multiplayer games)
export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  score?: number;
  finishedAt?: string;
}

// Auth Context Types
export interface AuthContextType {
  user: import('./api').User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: (username?: string) => Promise<void>;
  logout: () => void;
}

// API Client Types
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

// Query Keys for TanStack Query
export const QueryKeys = {
  // Auth
  currentUser: ['auth', 'current-user'] as const,

  // Puzzles
  dailyPuzzle: ['puzzles', 'daily'] as const,
  puzzleByDate: (date: string) => ['puzzles', 'by-date', date] as const,
  puzzleArchive: (page: number, limit: number) => ['puzzles', 'archive', page, limit] as const,

  // User Stats
  userStats: (userId: string) => ['users', userId, 'stats'] as const,
  puzzleHistory: (userId: string) => ['users', userId, 'history'] as const,

  // Rooms
  room: (code: string) => ['rooms', code] as const,
  roomById: (id: string) => ['rooms', 'by-id', id] as const,
} as const;

// Mutation Keys for TanStack Query
export const MutationKeys = {
  // Auth
  login: ['auth', 'login'] as const,
  register: ['auth', 'register'] as const,
  guestLogin: ['auth', 'guest-login'] as const,
  logout: ['auth', 'logout'] as const,

  // Puzzles
  savePuzzleHistory: ['puzzles', 'save-history'] as const,

  // Rooms
  createRoom: ['rooms', 'create'] as const,
  joinRoom: ['rooms', 'join'] as const,
  startRoom: ['rooms', 'start'] as const,
  closeRoom: ['rooms', 'close'] as const,
} as const;
