import type { Puzzle, GameGridState } from '@/types';

const CACHE_KEYS = {
  PUZZLES: 'crossy-cached-puzzles',
  GRID_STATES: 'crossy-grid-states',
  PENDING_ACTIONS: 'crossy-pending-actions',
} as const;

export interface CachedPuzzle {
  puzzle: Puzzle;
  cachedAt: string;
}

export interface PendingAction {
  id: string;
  type: 'save_history' | 'update_stats';
  payload: unknown;
  timestamp: string;
}

// Puzzle caching
export const puzzleCache = {
  async get(puzzleId: string): Promise<Puzzle | null> {
    try {
      const cached = localStorage.getItem(`${CACHE_KEYS.PUZZLES}-${puzzleId}`);
      if (!cached) return null;

      const data: CachedPuzzle = JSON.parse(cached);
      return data.puzzle;
    } catch (error) {
      console.error('Failed to get cached puzzle:', error);
      return null;
    }
  },

  async set(puzzle: Puzzle): Promise<void> {
    try {
      const data: CachedPuzzle = {
        puzzle,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${CACHE_KEYS.PUZZLES}-${puzzle.id}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache puzzle:', error);
    }
  },

  async getAll(): Promise<Puzzle[]> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEYS.PUZZLES));
      const puzzles: Puzzle[] = [];

      for (const key of keys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const data: CachedPuzzle = JSON.parse(cached);
          puzzles.push(data.puzzle);
        }
      }

      return puzzles.sort((a, b) =>
        new Date(b.publishedAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get all cached puzzles:', error);
      return [];
    }
  },

  async remove(puzzleId: string): Promise<void> {
    try {
      localStorage.removeItem(`${CACHE_KEYS.PUZZLES}-${puzzleId}`);
    } catch (error) {
      console.error('Failed to remove cached puzzle:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEYS.PUZZLES));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear puzzle cache:', error);
    }
  },
};

// Grid state persistence (for offline play)
export const gridStateStorage = {
  async get(puzzleId: string): Promise<GameGridState | null> {
    try {
      const stored = localStorage.getItem(`${CACHE_KEYS.GRID_STATES}-${puzzleId}`);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to get grid state:', error);
      return null;
    }
  },

  async set(puzzleId: string, gridState: GameGridState): Promise<void> {
    try {
      localStorage.setItem(`${CACHE_KEYS.GRID_STATES}-${puzzleId}`, JSON.stringify(gridState));
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  },

  async remove(puzzleId: string): Promise<void> {
    try {
      localStorage.removeItem(`${CACHE_KEYS.GRID_STATES}-${puzzleId}`);
    } catch (error) {
      console.error('Failed to remove grid state:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEYS.GRID_STATES));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear grid states:', error);
    }
  },
};

// Pending actions queue (for sync on reconnect)
export const actionQueue = {
  async getAll(): Promise<PendingAction[]> {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to get pending actions:', error);
      return [];
    }
  },

  async add(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<void> {
    try {
      const actions = await this.getAll();
      const newAction: PendingAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      actions.push(newAction);
      localStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to add pending action:', error);
    }
  },

  async remove(actionId: string): Promise<void> {
    try {
      const actions = await this.getAll();
      const filtered = actions.filter(a => a.id !== actionId);
      localStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove pending action:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(CACHE_KEYS.PENDING_ACTIONS);
    } catch (error) {
      console.error('Failed to clear pending actions:', error);
    }
  },
};

// Clean up old cached data (older than 30 days)
export async function cleanupOldCache(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEYS.PUZZLES));

    for (const key of keys) {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data: CachedPuzzle = JSON.parse(cached);
        const cachedDate = new Date(data.cachedAt);

        if (cachedDate < thirtyDaysAgo) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old cache:', error);
  }
}
