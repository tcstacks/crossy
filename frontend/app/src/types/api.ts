// Auth Types
export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GuestLoginRequest {
  displayName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// User Types
export interface User {
  id: string;
  displayName: string;
  email?: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  userId: string;
  puzzlesSolved: number;
  avgSolveTime: number;
  streakCurrent: number;
  streakBest: number;
  multiplayerWins: number;
  totalPlayTime: number;
  lastPlayedAt: string | null;
}

export interface PuzzleHistory {
  id: string;
  userId: string;
  puzzleId: string;
  completedAt: string;
  timeTaken: number;
  moveCount: number;
  solved: boolean;
}

export interface SavePuzzleHistoryRequest {
  puzzleId: string;
  completedAt: string;
  timeTaken: number;
  moveCount: number;
  solved: boolean;
}

// Puzzle Types
export interface GridCell {
  letter: string | null; // null = black square
  number?: number; // clue number if start of word
  isCircled?: boolean;
  rebus?: string; // for rebus puzzles
}

export interface Clue {
  number: number;
  text: string;
  answer: string;
  positionX: number; // starting cell column
  positionY: number; // starting cell row
  length: number;
  direction: 'across' | 'down';
}

export interface Puzzle {
  id: string;
  date?: string; // YYYY-MM-DD, optional for archive-only
  title: string;
  author: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridWidth: number;
  gridHeight: number;
  grid: GridCell[][] | number[][]; // Support both crossword and number-grid puzzles
  cluesAcross: Clue[];
  cluesDown: Clue[];
  theme?: string;
  avgSolveTime?: number; // seconds, populated after release
  createdAt: string;
  publishedAt?: string;
  status: string; // draft, approved, published
  solution?: number[][]; // For number-grid puzzles compatibility
}

export interface PuzzleArchiveItem {
  id: string;
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  solved?: boolean;
}

export interface GetPuzzleByDateRequest {
  date: string;
}

export interface GetPuzzleArchiveRequest {
  page?: number;
  limit?: number;
}

export interface PuzzleArchiveResponse {
  puzzles: PuzzleArchiveItem[];
  total: number;
  page: number;
  limit: number;
}

// Room Types
export interface Room {
  id: string;
  code: string;
  hostId: string;
  puzzleId: string;
  status: 'waiting' | 'playing' | 'finished' | 'closed';
  players: RoomPlayer[];
  maxPlayers: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  score?: number;
  finishedAt?: string;
}

export interface CreateRoomRequest {
  puzzleId?: string;
  mode?: 'collaborative' | 'race' | 'relay';
  config?: {
    maxPlayers?: number;
  };
}

export interface CreateRoomResponse {
  room: Room;
}

export interface GetRoomByCodeRequest {
  code: string;
}

export interface JoinRoomRequest {
  code: string;
}

export interface JoinRoomResponse {
  room: Room;
}

export interface StartRoomRequest {
  roomId: string;
}

export interface CloseRoomRequest {
  roomId: string;
}

// Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string; // Backend sometimes returns error instead of message
  errors?: Record<string, string[]>;
}

// Generic API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
