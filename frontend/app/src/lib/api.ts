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
  GetRoomByCodeRequest,
  JoinRoomRequest,
  JoinRoomResponse,
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
    // Backend returns either { message: string } or { error: string }
    const errorMessage = error.response.data?.message || error.response.data?.error || 'An unexpected error occurred';
    const apiError: ApiError = {
      message: errorMessage,
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
    const response = await apiClient.get<Puzzle>(`/api/puzzles/${puzzleId}`);
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
    const response = await apiClient.get<UserStats>('/api/users/me/stats');
    return response.data;
  },

  /**
   * Get current user's puzzle history
   */
  getMyHistory: async (): Promise<PuzzleHistory[]> => {
    const response = await apiClient.get<PuzzleHistory[]>('/api/users/me/history');
    return response.data;
  },

  /**
   * Save puzzle completion history
   */
  savePuzzleHistory: async (data: SavePuzzleHistoryRequest): Promise<PuzzleHistory> => {
    const response = await apiClient.post<PuzzleHistory>('/api/users/me/history', data);
    return response.data;
  },
};

// Room Endpoints
export const roomApi = {
  /**
   * Create a new multiplayer room
   */
  createRoom: async (data?: CreateRoomRequest): Promise<CreateRoomResponse> => {
    const response = await apiClient.post<CreateRoomResponse>('/api/rooms', data || {});
    return response.data;
  },

  /**
   * Get room details by room code
   */
  getRoomByCode: async (data: GetRoomByCodeRequest): Promise<Room> => {
    const response = await apiClient.get<Room>(`/api/rooms/${data.code}`);
    return response.data;
  },

  /**
   * Join an existing room
   */
  joinRoom: async (data: JoinRoomRequest): Promise<JoinRoomResponse> => {
    const response = await apiClient.post<JoinRoomResponse>(`/api/rooms/${data.code}/join`);
    return response.data;
  },

  /**
   * Start the game in a room (host only)
   */
  startRoom: async (data: StartRoomRequest): Promise<Room> => {
    const response = await apiClient.post<Room>(`/api/rooms/${data.roomId}/start`);
    return response.data;
  },

  /**
   * Close a room (host only)
   */
  closeRoom: async (data: CloseRoomRequest): Promise<Room> => {
    const response = await apiClient.post<Room>(`/api/rooms/${data.roomId}/close`);
    return response.data;
  },
};

// Export the configured axios instance for custom requests
export default apiClient;
