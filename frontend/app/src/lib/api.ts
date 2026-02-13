import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  // Auth
  RegisterRequest,
  LoginRequest,
  GuestLoginRequest,
  AuthResponse,
  // User
  User,
  UserStats,
  PuzzleHistory,
  SavePuzzleHistoryRequest,
  // Puzzle
  Puzzle,
  GetPuzzleByDateRequest,
  GetPuzzleArchiveRequest,
  PuzzleArchiveResponse,
  // Room
  Room,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomResponse,
  GetRoomByCodeRequest,
  JoinRoomRequest,
  StartRoomRequest,
  CloseRoomRequest,
  // Error
  ApiError,
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Token management
const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle network errors
    if (!error.response) {
      const networkError: ApiError = {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      };
      return Promise.reject(networkError);
    }

    // Handle API errors
    const apiError: ApiError = {
      message: error.response.data?.message || 'An unexpected error occurred',
      statusCode: error.response.status,
      errors: error.response.data?.errors,
    };

    // Handle unauthorized errors - clear token
    if (error.response.status === 401) {
      removeToken();
    }

    return Promise.reject(apiError);
  }
);

type BackendRoomState = 'lobby' | 'active' | 'completed' | 'closed';
type BackendRoomMode = 'collaborative' | 'race' | 'relay';

interface BackendRoom {
  id: string;
  code: string;
  hostId: string;
  puzzleId: string;
  state: BackendRoomState;
  mode: BackendRoomMode;
  config: {
    maxPlayers: number;
    isPublic: boolean;
    spectatorMode: boolean;
    timerMode: 'none' | 'countdown' | 'stopwatch';
    timerSeconds?: number;
    hintsEnabled: boolean;
  };
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

interface BackendRoomPlayer {
  userId: string;
  displayName: string;
  roomId?: string;
  isSpectator?: boolean;
  isConnected?: boolean;
  contribution?: number;
  color?: string;
  joinedAt?: string;
  finishedAt?: string;
}

interface BackendRoomResponse {
  room: BackendRoom;
  player?: BackendRoomPlayer;
  players?: BackendRoomPlayer[];
}

interface BackendUserStats {
  userId: string;
  puzzlesSolved: number;
  avgSolveTime: number;
  streakCurrent: number;
  streakBest: number;
  multiplayerWins: number;
  totalPlayTime?: number;
  lastPlayedAt?: string;
}

interface BackendPuzzleHistory {
  id: string;
  userId: string;
  puzzleId: string;
  roomId?: string | null;
  solveTime: number;
  completed: boolean;
  accuracy: number;
  hintsUsed: number;
  completedAt: string;
  createdAt: string;
}

const mapRoomStatus = (state: BackendRoomState): Room['status'] => {
  if (state === 'lobby') return 'waiting';
  if (state === 'active') return 'playing';
  if (state === 'completed') return 'finished';
  return 'closed';
};

const mapRoomPlayer = (player: BackendRoomPlayer, hostId: string): Room['players'][number] => {
  const username = player.displayName || 'Player';
  return {
    userId: player.userId,
    username,
    displayName: player.displayName || username,
    isHost: player.userId === hostId,
    isReady: false,
    isSpectator: player.isSpectator ?? false,
    isConnected: player.isConnected ?? false,
    contribution: player.contribution ?? 0,
    color: player.color,
    finishedAt: player.finishedAt,
  };
};

const mapRoom = (room: BackendRoom, players: BackendRoomPlayer[] = []): Room => {
  const mappedPlayers = players.map((player) => mapRoomPlayer(player, room.hostId));
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    puzzleId: room.puzzleId,
    status: mapRoomStatus(room.state),
    players: mappedPlayers,
    maxPlayers: room.config?.maxPlayers || 8,
    state: room.state || 'lobby',
    mode: room.mode,
    config: room.config,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    finishedAt: room.endedAt,
    endedAt: room.endedAt,
  };
};

const mapGetRoomResponse = (response: BackendRoomResponse): Room => {
  const players = response.players && response.players.length > 0
    ? response.players
    : response.player
      ? [response.player]
      : [];

  return mapRoom(response.room, players);
};

const mapCreateRoomResponse = (response: BackendRoomResponse): CreateRoomResponse => {
  const room = mapGetRoomResponse(response);
  return {
    room,
    player: room.players[0] ?? {
      userId: '',
      username: 'Player',
      displayName: 'Player',
      isHost: true,
      isReady: false,
      isSpectator: false,
      isConnected: true,
      contribution: 0,
    },
  };
};

const mapJoinRoomResponse = (response: BackendRoomResponse): JoinRoomResponse => {
  const room = mapGetRoomResponse(response);
  const player = response.player
    ? mapRoomPlayer(response.player, room.hostId)
    : room.players[0] ?? {
      userId: '',
      username: 'Player',
      displayName: 'Player',
      isHost: false,
      isReady: false,
      isSpectator: false,
      isConnected: false,
      contribution: 0,
    };

  return {
    room,
    players: room.players,
    player,
  };
};

const defaultRoomConfig = {
  maxPlayers: 8,
  isPublic: false,
  spectatorMode: false,
  timerMode: 'none' as const,
  hintsEnabled: false,
};

const normalizeCreateRoomRequest = (data?: CreateRoomRequest): CreateRoomRequest => {
  if (!data) {
    return {
      puzzleId: '',
      mode: 'collaborative',
      config: defaultRoomConfig,
    };
  }

  return {
    puzzleId: data.puzzleId || '',
    mode: data.mode || 'collaborative',
    config: {
      ...defaultRoomConfig,
      ...data.config,
    },
  };
};

const mapUserStats = (stats: BackendUserStats): UserStats => {
  const avgSolveTime = stats.avgSolveTime || 0;
  return {
    userId: stats.userId,
    totalPuzzlesSolved: stats.puzzlesSolved || 0,
    averageTime: avgSolveTime,
    bestTime: avgSolveTime,
    currentStreak: stats.streakCurrent || 0,
    longestStreak: stats.streakBest || 0,
    multiplayerWins: stats.multiplayerWins || 0,
    lastPlayedAt: stats.lastPlayedAt || '',
  };
};

const mapPuzzleHistory = (entry: BackendPuzzleHistory): PuzzleHistory => {
  return {
    id: entry.id,
    userId: entry.userId,
    puzzleId: entry.puzzleId,
    completedAt: entry.completedAt,
    timeTaken: entry.solveTime,
    moveCount: 0,
    solved: entry.completed,
    accuracy: entry.accuracy,
    hintsUsed: entry.hintsUsed,
  };
};

// Auth Endpoints
export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
    if (response.data.token) {
      setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
    if (response.data.token) {
      setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Login as guest
   */
  guestLogin: async (data?: GuestLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/guest', data || {});
    if (response.data.token) {
      setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Logout - clear token
   */
  logout: (): void => {
    removeToken();
  },
};

// Puzzle Endpoints
export const puzzleApi = {
  /**
   * Get today's puzzle
   */
  getTodayPuzzle: async (): Promise<Puzzle> => {
    const response = await apiClient.get<Puzzle>('/api/puzzles/today');
    return response.data;
  },

  /**
   * Get puzzle by specific date
   */
  getPuzzleByDate: async (data: GetPuzzleByDateRequest): Promise<Puzzle> => {
    const response = await apiClient.get<Puzzle>(`/api/puzzles/${data.date}`);
    return response.data;
  },

  /**
   * Get a random puzzle
   */
  getRandomPuzzle: async (): Promise<Puzzle> => {
    const response = await apiClient.get<Puzzle>('/api/puzzles/random');
    return response.data;
  },

  /**
   * Get puzzle archive with pagination
   */
  getPuzzleArchive: async (params?: GetPuzzleArchiveRequest): Promise<PuzzleArchiveResponse> => {
    const response = await apiClient.get<PuzzleArchiveResponse>('/api/puzzles/archive', {
      params,
    });
    return response.data;
  },

  /**
   * Get puzzle by ID
   */
  getPuzzleById: async (puzzleId: string): Promise<Puzzle> => {
    const response = await apiClient.get<Puzzle>(`/api/puzzles/id/${puzzleId}`);
    return response.data;
  },
};

// User Endpoints
export const userApi = {
  /**
   * Get current user profile
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/users/me');
    return response.data;
  },

  /**
   * Get current user's stats
   */
  getMyStats: async (): Promise<UserStats> => {
    const response = await apiClient.get<BackendUserStats>('/api/users/me/stats');
    return mapUserStats(response.data);
  },

  /**
   * Get current user's puzzle history
   */
  getMyHistory: async (): Promise<PuzzleHistory[]> => {
    const response = await apiClient.get<BackendPuzzleHistory[]>('/api/users/me/history');
    return (response.data || []).map(mapPuzzleHistory);
  },

  /**
   * Save puzzle completion history
   */
  savePuzzleHistory: async (data: SavePuzzleHistoryRequest): Promise<PuzzleHistory> => {
    const payload = {
      puzzleId: data.puzzleId,
      solveTime: data.timeTaken,
      completed: data.solved,
      accuracy: data.accuracy ?? (data.solved ? 100 : 0),
      hintsUsed: data.hintsUsed ?? 0,
      completedAt: data.completedAt,
      moveCount: data.moveCount,
    };
    const response = await apiClient.post<BackendPuzzleHistory>('/api/users/me/history', payload);
    return mapPuzzleHistory(response.data);
  },
};

// Room Endpoints
export const roomApi = {
  /**
   * Create a new multiplayer room
   */
  createRoom: async (data?: CreateRoomRequest): Promise<CreateRoomResponse> => {
    const requestData = normalizeCreateRoomRequest(data);
    const response = await apiClient.post<BackendRoomResponse>('/api/rooms', requestData);
    return mapCreateRoomResponse(response.data);
  },

  /**
   * Get room details by room code
   */
  getRoomByCode: async (data: GetRoomByCodeRequest): Promise<Room> => {
    const response = await apiClient.get<BackendRoomResponse>(`/api/rooms/${data.code}`);
    return mapGetRoomResponse(response.data);
  },

  /**
   * Join an existing room
   */
  joinRoom: async (data: JoinRoomRequest): Promise<JoinRoomResponse> => {
    const response = await apiClient.post<BackendRoomResponse>('/api/rooms/join', data);
    return mapJoinRoomResponse(response.data);
  },

  /**
   * Start the game in a room (host only)
   */
  startRoom: async (data: StartRoomRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/api/rooms/${data.roomId}/start`);
    return response.data;
  },

  /**
   * Close a room (host only)
   */
  closeRoom: async (data: CloseRoomRequest): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api/rooms/${data.roomId}`);
    return response.data;
  },
};

// Export the configured axios instance for custom requests
export default apiClient;
