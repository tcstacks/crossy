import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GameplayPage from './GameplayPage';
import { puzzleApi } from '../lib/api';
import { AuthProvider } from '../contexts/AuthContext';
import type { Puzzle } from '../types/api';

// Mock the API module
vi.mock('../lib/api', () => ({
  puzzleApi: {
    getTodayPuzzle: vi.fn(),
    getPuzzleByDate: vi.fn(),
  },
  userApi: {
    savePuzzleHistory: vi.fn(),
    getMe: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    guestLogin: vi.fn(),
    logout: vi.fn(),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
}));

// Mock puzzle data
const createMockPuzzle = (date: string, title: string): Puzzle => ({
  id: `puzzle-${date}`,
  date,
  title,
  author: 'Test Author',
  difficulty: 'medium',
  gridWidth: 5,
  gridHeight: 5,
  grid: Array(5).fill(null).map(() =>
    Array(5).fill(null).map(() => ({ letter: 'A', number: undefined }))
  ),
  cluesAcross: [
    { number: 1, text: 'Test clue across', answer: 'AAAAA', positionX: 0, positionY: 0, length: 5, direction: 'across' },
  ],
  cluesDown: [
    { number: 1, text: 'Test clue down', answer: 'AAAAA', positionX: 0, positionY: 0, length: 5, direction: 'down' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  status: 'published',
});

const todayPuzzle = createMockPuzzle('2024-12-01', "Today's Daily Puzzle");
const archivePuzzle = createMockPuzzle('2024-01-15', 'Archive Puzzle - Jan 15');

// Helper to create wrapper with providers
const createWrapper = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route path="/play" element={children} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };
};

describe('GameplayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Archive puzzle loading', () => {
    it('loads puzzle by date when date query parameter is provided', async () => {
      // Setup: getPuzzleByDate returns the archive puzzle
      (puzzleApi.getPuzzleByDate as Mock).mockResolvedValue(archivePuzzle);
      (puzzleApi.getTodayPuzzle as Mock).mockResolvedValue(todayPuzzle);

      // Render with date query parameter (simulating click from archive page)
      render(<GameplayPage />, {
        wrapper: createWrapper('/play?date=2024-01-15'),
      });

      // Wait for the puzzle to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // CRITICAL: getPuzzleByDate should be called with the date from URL
      expect(puzzleApi.getPuzzleByDate).toHaveBeenCalledWith({ date: '2024-01-15' });

      // getTodayPuzzle should NOT be called when a date is provided
      expect(puzzleApi.getTodayPuzzle).not.toHaveBeenCalled();

      // The archive puzzle title should be displayed
      expect(screen.getByText('Archive Puzzle - Jan 15')).toBeInTheDocument();
    });

    it('loads today puzzle when no date query parameter is provided', async () => {
      // Setup: getTodayPuzzle returns today's puzzle
      (puzzleApi.getTodayPuzzle as Mock).mockResolvedValue(todayPuzzle);
      (puzzleApi.getPuzzleByDate as Mock).mockResolvedValue(archivePuzzle);

      // Render without date query parameter
      render(<GameplayPage />, {
        wrapper: createWrapper('/play'),
      });

      // Wait for the puzzle to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // getTodayPuzzle should be called when no date is provided
      expect(puzzleApi.getTodayPuzzle).toHaveBeenCalled();

      // getPuzzleByDate should NOT be called
      expect(puzzleApi.getPuzzleByDate).not.toHaveBeenCalled();

      // Today's puzzle title should be displayed
      expect(screen.getByText("Today's Daily Puzzle")).toBeInTheDocument();
    });

    it('correctly passes different dates from archive to gameplay', async () => {
      // Test that different archive dates load different puzzles
      const jan20Puzzle = createMockPuzzle('2024-01-20', 'Archive Puzzle - Jan 20');
      (puzzleApi.getPuzzleByDate as Mock).mockResolvedValue(jan20Puzzle);

      render(<GameplayPage />, {
        wrapper: createWrapper('/play?date=2024-01-20'),
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should call with the correct date from URL
      expect(puzzleApi.getPuzzleByDate).toHaveBeenCalledWith({ date: '2024-01-20' });
      expect(screen.getByText('Archive Puzzle - Jan 20')).toBeInTheDocument();
    });
  });
});
