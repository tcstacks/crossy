'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import type { PuzzleHistory, Puzzle } from '@/types';

type SortBy = 'date' | 'time' | 'accuracy';
type FilterBy = 'all' | 'completed' | 'incomplete';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useGameStore();
  const [history, setHistory] = useState<PuzzleHistory[]>([]);
  const [puzzles, setPuzzles] = useState<Map<string, Puzzle>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const limit = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/history');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const data = await api.getMyHistory(limit, page * limit);
        setHistory((prev) => (page === 0 ? data : [...prev, ...data]));
        setHasMore(data.length === limit);

        // Load puzzle details for each history entry
        const puzzleIdsSet = new Set(data.map(h => h.puzzleId));
        const puzzleIds = Array.from(puzzleIdsSet);

        // Fetch puzzles that we don't have yet
        setPuzzles((prevPuzzles) => {
          const newPuzzles = new Map(prevPuzzles);

          // Start loading puzzles in parallel
          puzzleIds.forEach(async (puzzleId) => {
            if (!newPuzzles.has(puzzleId)) {
              try {
                const puzzle = await api.getPuzzleByDate(puzzleId);
                setPuzzles((prev) => new Map(prev).set(puzzleId, puzzle));
              } catch {
                // If puzzle can't be loaded, we'll just show the ID
                console.warn(`Could not load puzzle ${puzzleId}`);
              }
            }
          });

          return newPuzzles;
        });
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated, page]);

  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
    // Reset pagination when changing sort
    setPage(0);
    setHistory([]);
  };

  const handleFilterChange = (newFilter: FilterBy) => {
    setFilterBy(newFilter);
    // Reset pagination when changing filter
    setPage(0);
    setHistory([]);
  };

  // Apply client-side filtering and sorting
  const getFilteredAndSortedHistory = () => {
    let filtered = [...history];

    // Apply filter
    if (filterBy === 'completed') {
      filtered = filtered.filter(h => h.completed);
    } else if (filterBy === 'incomplete') {
      filtered = filtered.filter(h => !h.completed);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.completedAt || b.createdAt).getTime() -
                 new Date(a.completedAt || a.createdAt).getTime();
        case 'time':
          return a.solveTime - b.solveTime;
        case 'accuracy':
          return b.accuracy - a.accuracy;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredHistory = getFilteredAndSortedHistory();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Puzzle History</h1>

        {/* Filters and Sorting */}
        <div className="mb-6 space-y-4">
          {/* Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Puzzles' },
                { value: 'completed', label: 'Completed' },
                { value: 'incomplete', label: 'Incomplete' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange(option.value as FilterBy)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filterBy === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'date', label: 'Date' },
                { value: 'time', label: 'Solve Time' },
                { value: 'accuracy', label: 'Accuracy' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value as SortBy)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History List */}
        {isLoading && history.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="spinner w-8 h-8" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No puzzles found</p>
            <p className="text-sm">
              {filterBy !== 'all'
                ? 'Try changing your filter'
                : 'Start solving puzzles to build your history!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {filteredHistory.map((entry) => {
                const puzzle = puzzles.get(entry.puzzleId);
                const date = entry.completedAt || entry.createdAt;

                return (
                  <Link
                    key={entry.id}
                    href={`/puzzle/${entry.puzzleId}`}
                    className="card hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-bold text-lg">
                              {puzzle ? puzzle.title : `Puzzle #${entry.puzzleId.slice(0, 8)}`}
                            </h2>
                            {entry.completed && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                ✓ Completed
                              </span>
                            )}
                            {entry.roomId && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                                Multiplayer
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span>{formatDate(date)}</span>
                            {puzzle && (
                              <>
                                <span>•</span>
                                <span>{puzzle.gridWidth}×{puzzle.gridHeight}</span>
                                {puzzle.author && (
                                  <>
                                    <span>•</span>
                                    <span>By {puzzle.author}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="font-bold text-primary-600">{formatTime(entry.solveTime)}</span>
                            <span className="text-gray-500 ml-1">solve time</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="font-bold text-primary-600">{entry.accuracy.toFixed(0)}%</span>
                            <span className="text-gray-500 ml-1">accuracy</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <div>
                            <span className="font-bold text-primary-600">{entry.hintsUsed}</span>
                            <span className="text-gray-500 ml-1">{entry.hintsUsed === 1 ? 'hint' : 'hints'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && filterBy === 'all' && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner w-4 h-4" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
