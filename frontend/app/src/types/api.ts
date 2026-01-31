// Auth Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GuestLoginRequest {
  username?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// User Types
export interface User {
  id: string;
  username: string;
  email?: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  userId: string;
  totalPuzzlesSolved: number;
  averageTime: number;
  bestTime: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string;
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
export interface Puzzle {
  id: string;
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: number[][];
  solution: number[][];
  startPosition: Position;
  endPosition: Position;
  obstacles: Position[];
  createdAt: string;
}

export interface Position {
  x: number;
  y: number;
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
  maxPlayers?: number;
  puzzleId?: string;
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
  errors?: Record<string, string[]>;
}

// Generic API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
