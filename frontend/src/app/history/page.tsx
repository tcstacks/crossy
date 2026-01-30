'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { History as HistoryIcon, Clock, CheckCircle2, Lightbulb } from 'lucide-react';
import { Header } from '@/components/Header';
import { CrossyButton, CrossyCard, CrossyCardContent } from '@/components/crossy';
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
    <div className="min-h-screen bg-crossy-light-bg">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-6 text-crossy-dark-purple flex items-center gap-2">
          <HistoryIcon className="w-8 h-8 text-crossy-purple" />
          Puzzle History
        </h1>

        {/* Filters and Sorting */}
        <div className="mb-6 space-y-4">
          {/* Filter */}
          <div>
            <label className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
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
                  className={`px-4 py-2 rounded-xl text-sm font-display font-semibold transition-all border-2 ${
                    filterBy === option.value
                      ? 'bg-crossy-purple text-white border-crossy-dark-purple'
                      : 'bg-white border-crossy-dark-purple hover:border-crossy-purple text-crossy-dark-purple'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
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
                  className={`px-4 py-2 rounded-xl text-sm font-display font-semibold transition-all border-2 ${
                    sortBy === option.value
                      ? 'bg-crossy-purple text-white border-crossy-dark-purple'
                      : 'bg-white border-crossy-dark-purple hover:border-crossy-purple text-crossy-dark-purple'
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
            <div className="spinner w-8 h-8 border-crossy-purple" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-crossy-dark-purple font-display">
            <p className="text-lg font-semibold mb-2">No puzzles found</p>
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
                  >
                    <CrossyCard className="hover:scale-[1.01] transition-transform">
                      <CrossyCardContent className="p-6">
                        <div className="flex flex-col gap-3">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="font-display font-bold text-lg text-crossy-dark-purple">
                                  {puzzle ? puzzle.title : `Puzzle #${entry.puzzleId.slice(0, 8)}`}
                                </h2>
                                {entry.completed && (
                                  <span className="text-xs bg-crossy-green text-white px-2 py-0.5 rounded-full font-display font-semibold">
                                    ✓ Completed
                                  </span>
                                )}
                                {entry.roomId && (
                                  <span className="text-xs bg-crossy-purple text-white px-2 py-0.5 rounded-full font-display font-semibold">
                                    👥 Multiplayer
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm font-display text-crossy-dark-purple">
                                <span>{formatDate(date)}</span>
                                {puzzle && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-crossy-light-purple px-2 py-0.5 rounded-full border border-crossy-purple font-semibold">
                                      {puzzle.gridWidth}×{puzzle.gridHeight}
                                    </span>
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
                              <Clock className="w-4 h-4 text-crossy-purple" />
                              <div className="font-display">
                                <span className="font-bold text-crossy-purple">{formatTime(entry.solveTime)}</span>
                                <span className="text-crossy-dark-purple ml-1">solve time</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-crossy-green" />
                              <div className="font-display">
                                <span className="font-bold text-crossy-green">{entry.accuracy.toFixed(0)}%</span>
                                <span className="text-crossy-dark-purple ml-1">accuracy</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-crossy-orange" />
                              <div className="font-display">
                                <span className="font-bold text-crossy-orange">{entry.hintsUsed}</span>
                                <span className="text-crossy-dark-purple ml-1">{entry.hintsUsed === 1 ? 'hint' : 'hints'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CrossyCardContent>
                    </CrossyCard>
                  </Link>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && filterBy === 'all' && (
              <div className="mt-8 text-center">
                <CrossyButton
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                  variant="secondary"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner w-4 h-4 border-crossy-dark-purple" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </CrossyButton>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
