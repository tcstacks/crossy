import type { AuthResponse, Puzzle, Room, Player, RoomConfig, RoomMode, UserStats, User, GridCell, GameGridState, PuzzleHistory } from '@/types';
import { puzzleCache, actionQueue } from './offlineStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Real sample puzzle data (matches backend SamplePuzzle in puzzle/generator.go)
const getSamplePuzzle = (id: string, dateOverride?: string): Puzzle => {
  const today = dateOverride || new Date().toISOString().split('T')[0];

  // This is the exact puzzle from the backend's SamplePuzzle function
  const grid: GridCell[][] = [
    [{ letter: 'H', number: 1 }, { letter: 'E' }, { letter: 'L' }, { letter: 'L', number: 2 }, { letter: 'O' }],
    [{ letter: 'A', number: 3 }, { letter: null }, { letter: null }, { letter: 'A' }, { letter: 'N' }],
    [{ letter: 'T', number: 4 }, { letter: 'O', number: 5 }, { letter: 'P' }, { letter: 'S' }, { letter: 'E' }],
    [{ letter: 'E', number: 6 }, { letter: 'N' }, { letter: null }, { letter: null }, { letter: 'W' }],
    [{ letter: 'S', number: 7 }, { letter: 'E' }, { letter: 'W' }, { letter: 'E' }, { letter: 'D' }],
  ];

  return {
    id,
    date: today,
    title: 'Hello World',
    author: 'CrossPlay Team',
    difficulty: 'easy',
    gridWidth: 5,
    gridHeight: 5,
    grid,
    cluesAcross: [
      { number: 1, text: 'Greeting', positionX: 0, positionY: 0, length: 5, direction: 'across' },
      { number: 4, text: 'Spinning toys', positionX: 0, positionY: 2, length: 4, direction: 'across' },
      { number: 7, text: 'Stitched', positionX: 0, positionY: 4, length: 5, direction: 'across' },
    ],
    cluesDown: [
      { number: 1, text: 'Dislikes strongly', positionX: 0, positionY: 0, length: 5, direction: 'down' },
      { number: 2, text: 'Lane anagram', positionX: 3, positionY: 0, length: 4, direction: 'down' },
      { number: 3, text: 'A single time', positionX: 4, positionY: 0, length: 4, direction: 'down' },
      { number: 5, text: 'Antique', positionX: 1, positionY: 2, length: 3, direction: 'down' },
    ],
    theme: 'Greetings',
    avgSolveTime: 180,
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };
};

// Generate archive puzzles with variations
const getArchivePuzzles = (): Puzzle[] => {
  const puzzles: Puzzle[] = [];
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const titles = [
    'Hello World', 'Morning Brew', 'Afternoon Delight', 'Evening Stroll',
    'Weekend Warrior', 'Sunday Funday', 'Monday Blues', 'Midweek Magic',
  ];

  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const puzzle = getSamplePuzzle(`puzzle-${i}`, dateStr);
    puzzle.title = titles[i % titles.length];
    puzzle.difficulty = difficulties[i % 3];
    puzzles.push(puzzle);
  }
  return puzzles;
};

const generateUser = (displayName: string, isGuest = true): User => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: isGuest ? `guest-${Date.now()}@crossy.local` : `${displayName.toLowerCase().replace(/\s/g, '')}@crossy.local`,
  displayName,
  isGuest,
  createdAt: new Date().toISOString(),
});

const generateToken = (): string => {
  return `token-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
};

const localRooms: Map<string, { room: Room; players: Player[] }> = new Map();

class ApiClient {
  private token: string | null = null;
  private useMockData = true; // Enable mock data by default since backend isn't running

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

    try {
      const response = await fetch(`${API_BASE}/api${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      this.useMockData = false; // Backend is working, disable mock data
      return response.json();
    } catch {
      // If request fails, we'll use mock data
      this.useMockData = true;
      throw new Error('Backend unavailable');
    }
  }

  // Auth endpoints
  async register(email: string, _password: string, displayName: string): Promise<AuthResponse> {
    try {
      return await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: _password, displayName }),
      });
    } catch {
      // Local registration
      const user = generateUser(displayName, false);
      user.email = email;
      return { user, token: generateToken() };
    }
  }

  async login(email: string, _password: string): Promise<AuthResponse> {
    try {
      return await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: _password }),
      });
    } catch {
      // Local login
      const displayName = email.split('@')[0];
      const user = generateUser(displayName, false);
      user.email = email;
      return { user, token: generateToken() };
    }
  }

  async guest(displayName: string): Promise<AuthResponse> {
    try {
      return await this.request('/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      });
    } catch {
      // Local guest login
      const user = generateUser(displayName || 'Guest', true);
      return { user, token: generateToken() };
    }
  }

  // User endpoints
  async getMe(): Promise<AuthResponse['user']> {
    try {
      return await this.request('/users/me');
    } catch {
      return generateUser('Guest', true);
    }
  }

  async getMyStats(): Promise<UserStats> {
    try {
      return await this.request('/users/me/stats');
    } catch {
      return {
        userId: 'mock-user',
        puzzlesSolved: 5,
        avgSolveTime: 240,
        streakCurrent: 3,
        streakBest: 7,
        multiplayerWins: 2,
        totalPlayTime: 3600,
        lastPlayedAt: new Date().toISOString(),
      };
    }
  }

  async getMyHistory(_limit = 20, _offset = 0): Promise<PuzzleHistory[]> {
    try {
      return await this.request(`/users/me/history?limit=${_limit}&offset=${_offset}`);
    } catch {
      return [];
    }
  }

  async savePuzzleHistory(data: {
    puzzleId: string;
    solveTime: number;
    completed: boolean;
    accuracy: number;
    hintsUsed: number;
  }): Promise<void> {
    try {
      await this.request('/users/me/history', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('Failed to save puzzle history:', error);
      // Queue the action for sync when back online
      if (!navigator.onLine) {
        await actionQueue.add({
          type: 'save_history',
          payload: data,
        });
        console.log('Puzzle history queued for sync when online');
      }
    }
  }

  // Puzzle endpoints
  async getTodayPuzzle(): Promise<Puzzle> {
    try {
      const puzzle = await this.request<Puzzle>('/puzzles/today');
      // Cache the puzzle for offline use
      await puzzleCache.set(puzzle);
      return puzzle;
    } catch {
      // Try to get from cache if offline
      const today = new Date().toISOString().split('T')[0];
      const cached = await puzzleCache.get(`today-puzzle-${today}`);
      if (cached) {
        return cached;
      }
      // Fallback to sample puzzle
      const puzzle = getSamplePuzzle('today-puzzle');
      await puzzleCache.set(puzzle);
      return puzzle;
    }
  }

  async getPuzzleByDate(date: string): Promise<Puzzle> {
    try {
      const puzzle = await this.request<Puzzle>(`/puzzles/${date}`);
      await puzzleCache.set(puzzle);
      return puzzle;
    } catch {
      // Try cache first
      const cached = await puzzleCache.get(`puzzle-${date}`);
      if (cached) {
        return cached;
      }
      // Fallback to sample
      const puzzle = getSamplePuzzle(`puzzle-${date}`, date);
      await puzzleCache.set(puzzle);
      return puzzle;
    }
  }

  async getArchive(difficulty?: string, limit = 20, offset = 0): Promise<Puzzle[]> {
    try {
      const params = new URLSearchParams();
      if (difficulty) params.set('difficulty', difficulty);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());
      const result = await this.request<Puzzle[]>(`/puzzles/archive?${params}`);

      // Cache each puzzle
      for (const puzzle of result) {
        await puzzleCache.set(puzzle);
      }

      // Fallback to mock data if backend returns empty
      if (result.length === 0) {
        let puzzles = getArchivePuzzles();
        if (difficulty) {
          puzzles = puzzles.filter(p => p.difficulty === difficulty);
        }
        const paginated = puzzles.slice(offset, offset + limit);
        for (const puzzle of paginated) {
          await puzzleCache.set(puzzle);
        }
        return paginated;
      }
      return result;
    } catch {
      // Try to get from cache when offline
      const allCached = await puzzleCache.getAll();
      if (allCached.length > 0) {
        let filtered = allCached;
        if (difficulty) {
          filtered = filtered.filter(p => p.difficulty === difficulty);
        }
        return filtered.slice(offset, offset + limit);
      }

      // Fallback to mock data
      let puzzles = getArchivePuzzles();
      if (difficulty) {
        puzzles = puzzles.filter(p => p.difficulty === difficulty);
      }
      const paginated = puzzles.slice(offset, offset + limit);
      for (const puzzle of paginated) {
        await puzzleCache.set(puzzle);
      }
      return paginated;
    }
  }

  async getRandomPuzzle(difficulty?: string): Promise<Puzzle> {
    try {
      const params = difficulty ? `?difficulty=${difficulty}` : '';
      const puzzle = await this.request<Puzzle>(`/puzzles/random${params}`);
      await puzzleCache.set(puzzle);
      return puzzle;
    } catch {
      // Try to get random from cache when offline
      const allCached = await puzzleCache.getAll();
      if (allCached.length > 0) {
        let candidates = allCached;
        if (difficulty) {
          candidates = candidates.filter(p => p.difficulty === difficulty);
        }
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      // Fallback to sample
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const puzzle = getSamplePuzzle(`random-${Date.now()}`, date.toISOString().split('T')[0]);
      if (difficulty) {
        puzzle.difficulty = difficulty as 'easy' | 'medium' | 'hard';
      }
      await puzzleCache.set(puzzle);
      return puzzle;
    }
  }

  // Room endpoints
  async createRoom(
    puzzleId: string,
    mode: RoomMode,
    config?: Partial<RoomConfig>,
    user?: { id: string; displayName: string }
  ): Promise<{ room: Room; player: Player }> {
    try {
      return await this.request('/rooms', {
        method: 'POST',
        body: JSON.stringify({ puzzleId, mode, config }),
      });
    } catch {
      // Mock room creation - use actual user info if provided
      const userId = user?.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const displayName = user?.displayName || 'Host';
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      const room: Room = {
        id: `room-${Date.now()}`,
        code: roomCode,
        hostId: userId,
        puzzleId,
        mode,
        config: {
          maxPlayers: config?.maxPlayers || 8,
          isPublic: config?.isPublic || false,
          spectatorMode: config?.spectatorMode || true,
          timerMode: config?.timerMode || 'none',
          hintsEnabled: config?.hintsEnabled ?? true,
        },
        state: 'lobby',
        createdAt: new Date().toISOString(),
      };
      const player: Player = {
        userId,
        roomId: room.id,
        displayName,
        isSpectator: false,
        isConnected: true,
        contribution: 0,
        color: '#FF6B6B',
        joinedAt: new Date().toISOString(),
      };
      localRooms.set(roomCode, { room, players: [player] });
      return { room, player };
    }
  }

  async getRoomByCode(code: string): Promise<{ room: Room; players: Player[] }> {
    try {
      return await this.request(`/rooms/${code}`);
    } catch {
      const localRoom = localRooms.get(code.toUpperCase());
      if (localRoom) {
        return localRoom;
      }
      throw new Error('Room not found');
    }
  }

  async joinRoom(
    roomId: string,
    displayName?: string,
    isSpectator = false,
    userId?: string
  ): Promise<{ room: Room; player: Player; puzzle?: Puzzle; gridState?: GameGridState }> {
    try {
      return await this.request(`/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ displayName, isSpectator }),
      });
    } catch {
      // Mock fallback for local development
      const roomEntries = Array.from(localRooms.values());
      for (const data of roomEntries) {
        if (data.room.id === roomId) {
          // Check if user is already in the room (e.g., they're the host)
          const existingPlayer = userId ? data.players.find(p => p.userId === userId) : null;

          let player: Player;
          if (existingPlayer) {
            // User is already in the room (host rejoining)
            player = existingPlayer;
          } else {
            // New player joining
            const playerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
            player = {
              userId: userId || `user-${Date.now()}`,
              roomId: data.room.id,
              displayName: displayName || 'Player',
              isSpectator,
              isConnected: true,
              contribution: 0,
              color: playerColors[data.players.length % playerColors.length],
              joinedAt: new Date().toISOString(),
            };
            data.players.push(player);
          }

          // Get puzzle for response
          const puzzle = getSamplePuzzle(data.room.puzzleId);

          // Create empty grid state
          const gridState: GameGridState = {
            roomId: data.room.id,
            cells: puzzle.grid.map(row => row.map(() => ({ value: null, isRevealed: false }))),
            completedClues: [],
            lastUpdated: new Date().toISOString(),
          };

          return { room: data.room, player, puzzle, gridState };
        }
      }
      throw new Error('Room not found');
    }
  }

  async startRoom(roomId: string): Promise<{ message: string }> {
    try {
      return await this.request(`/rooms/${roomId}/start`, {
        method: 'POST',
      });
    } catch {
      return { message: 'Room started' };
    }
  }

  async closeRoom(roomId: string): Promise<{ message: string }> {
    try {
      return await this.request(`/rooms/${roomId}`, {
        method: 'DELETE',
      });
    } catch {
      return { message: 'Room closed' };
    }
  }
}

export const api = new ApiClient();
