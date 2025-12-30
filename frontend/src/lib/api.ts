import type { AuthResponse, Puzzle, Room, Player, RoomConfig, RoomMode, UserStats } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async guest(displayName: string): Promise<AuthResponse> {
    return this.request('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  }

  // User endpoints
  async getMe(): Promise<AuthResponse['user']> {
    return this.request('/users/me');
  }

  async getMyStats(): Promise<UserStats> {
    return this.request('/users/me/stats');
  }

  async getMyHistory(limit = 20, offset = 0): Promise<unknown[]> {
    return this.request(`/users/me/history?limit=${limit}&offset=${offset}`);
  }

  // Puzzle endpoints
  async getTodayPuzzle(): Promise<Puzzle> {
    return this.request('/puzzles/today');
  }

  async getPuzzleByDate(date: string): Promise<Puzzle> {
    return this.request(`/puzzles/${date}`);
  }

  async getArchive(difficulty?: string, limit = 20, offset = 0): Promise<Puzzle[]> {
    const params = new URLSearchParams();
    if (difficulty) params.set('difficulty', difficulty);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    return this.request(`/puzzles/archive?${params}`);
  }

  async getRandomPuzzle(difficulty?: string): Promise<Puzzle> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    return this.request(`/puzzles/random${params}`);
  }

  // Room endpoints
  async createRoom(
    puzzleId: string,
    mode: RoomMode,
    config?: Partial<RoomConfig>
  ): Promise<{ room: Room; player: Player }> {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify({ puzzleId, mode, config }),
    });
  }

  async getRoomByCode(code: string): Promise<{ room: Room; players: Player[] }> {
    return this.request(`/rooms/${code}`);
  }

  async joinRoom(
    roomId: string,
    displayName?: string,
    isSpectator = false
  ): Promise<{ room: Room; player: Player; puzzle: Puzzle; gridState: unknown }> {
    return this.request(`/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName, isSpectator }),
    });
  }

  async startRoom(roomId: string): Promise<{ message: string }> {
    return this.request(`/rooms/${roomId}/start`, {
      method: 'POST',
    });
  }

  async closeRoom(roomId: string): Promise<{ message: string }> {
    return this.request(`/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
