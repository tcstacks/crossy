import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Volume2,
  Clock,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  PlayCircle,
  Filter,
} from 'lucide-react';
import { userApi, getToken } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import type { PuzzleHistory, Puzzle } from '../types/api';

// Extended history type with puzzle details
interface ExtendedPuzzleHistory extends PuzzleHistory {
  puzzle?: Puzzle;
}

// Filter and sort types
type FilterType = 'all' | 'week' | 'month' | 'year';
type SortType = 'recent' | 'fastest' | 'accuracy';

function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ExtendedPuzzleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('recent');

  useEffect(() => {
    const fetchHistory = async () => {
      // Check if user is authenticated
      const token = getToken();
      if (!token) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      try {
        setLoading(true);
        const historyData = await userApi.getMyHistory();

        // Fetch puzzle details for each history entry
        const historyWithPuzzles = await Promise.all(
          historyData.map(async (entry) => {
            try {
              // For now, we'll try to fetch the puzzle by ID
              // Note: We may need to add a getPuzzleById endpoint or include puzzle data in history
              return {
                ...entry,
                puzzle: undefined, // Will be populated if we have access to puzzle details
              };
            } catch (err) {
              console.error('Failed to fetch puzzle details:', err);
              return entry;
            }
          })
        );

        setHistory(historyWithPuzzles);
      } catch (error) {
        console.error('Failed to fetch history:', error);
        // If authentication fails, redirect to home with auth modal
        navigate('/', { state: { showAuth: true } });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate accuracy (for now, 100% if solved, 0% if not)
  const calculateAccuracy = (entry: PuzzleHistory) => {
    return entry.solved ? 100 : 0;
  };

  // Filter history based on selected filter
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return history.filter((entry) => {
      const completedDate = new Date(entry.completedAt);
      switch (filter) {
        case 'week':
          return completedDate >= oneWeekAgo;
        case 'month':
          return completedDate >= oneMonthAgo;
        case 'year':
          return completedDate >= oneYearAgo;
        default:
          return true;
      }
    });
  }, [history, filter]);

  // Sort history based on selected sort
  const sortedHistory = useMemo(() => {
    const sorted = [...filteredHistory];
    switch (sort) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        break;
      case 'fastest':
        sorted.sort((a, b) => a.timeTaken - b.timeTaken);
        break;
      case 'accuracy':
        sorted.sort((a, b) => calculateAccuracy(b) - calculateAccuracy(a));
        break;
    }
    return sorted;
  }, [filteredHistory, sort]);

  // Handle play again - navigate to gameplay with specific puzzle
  const handlePlayAgain = (puzzleId: string) => {
    // For now, navigate to gameplay page
    // In the future, we can pass the puzzleId to load a specific puzzle
    navigate('/play', { state: { puzzleId } });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        {/* Header */}
        <header className="bg-white border-b border-[#ECE9FF]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <Link to="/" className="flex items-center gap-2">
                <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8" />
                <span className="font-display font-semibold text-[#2A1E5C]">Crossy</span>
              </Link>
              <div className="flex items-center gap-3">
                <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                  <Home className="w-5 h-5" />
                </Link>
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Loading skeleton */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  // Empty state
  if (sortedHistory.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        {/* Header */}
        <header className="bg-white border-b border-[#ECE9FF]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <Link to="/" className="flex items-center gap-2">
                <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8" />
                <span className="font-display font-semibold text-[#2A1E5C]">Crossy</span>
              </Link>
              <div className="flex items-center gap-3">
                <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                  <Home className="w-5 h-5" />
                </Link>
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl text-[#2A1E5C] mb-8">Puzzle History</h1>

          {/* Empty State */}
          <div className="crossy-card p-12 text-center">
            <img
              src="/crossy-main.png"
              alt="Crossy"
              className="w-32 h-32 mx-auto mb-6 animate-bounce-slow"
            />
            <h2 className="font-display font-bold text-xl text-[#2A1E5C] mb-2">
              No Puzzles Yet!
            </h2>
            <p className="font-display text-[#6B5CA8] mb-6">
              Start solving puzzles to build your history.
            </p>
            <Link
              to="/play"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
            >
              <PlayCircle className="w-5 h-5" />
              Start Solving
            </Link>
          </div>

          {/* Motivational Section */}
          <div className="flex justify-center mt-8">
            <div className="flex items-end gap-3">
              <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
                <p className="font-display text-sm text-[#2A1E5C]">
                  Let's solve your first puzzle!
                </p>
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
              </div>
              <img
                src="/crossy-thumbsup.png"
                alt="Crossy"
                className="w-16 h-16"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8" />
              <span className="font-display font-semibold text-[#2A1E5C]">Crossy</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Home className="w-5 h-5" />
              </Link>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="font-display font-bold text-3xl text-[#2A1E5C] mb-8">Puzzle History</h1>

        {/* Filters and Sort */}
        <div className="crossy-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filters */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-[#7B61FF]" />
                <span className="font-display text-sm font-semibold text-[#2A1E5C]">Filter</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    filter === 'all'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('week')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    filter === 'week'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilter('month')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    filter === 'month'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setFilter('year')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    filter === 'year'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  This Year
                </button>
              </div>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#7B61FF]" />
                <span className="font-display text-sm font-semibold text-[#2A1E5C]">Sort By</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSort('recent')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    sort === 'recent'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSort('fastest')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    sort === 'fastest'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  Fastest
                </button>
                <button
                  onClick={() => setSort('accuracy')}
                  className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                    sort === 'accuracy'
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                  }`}
                >
                  Best Accuracy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4 mb-8">
          {sortedHistory.map((entry) => (
            <div
              key={entry.id}
              className="crossy-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform"
            >
              {/* Purple gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF] to-[#A78BFF] opacity-5 group-hover:opacity-10 transition-opacity" />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left side - Puzzle info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#7B61FF] rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-[#2A1E5C]">
                        Puzzle Completed
                      </h3>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-[#6B5CA8]" />
                        <span className="font-display text-sm text-[#6B5CA8]">
                          {formatDate(entry.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#7B61FF]" />
                      <div>
                        <p className="font-display text-xs text-[#6B5CA8]">Time</p>
                        <p className="font-display font-semibold text-sm text-[#2A1E5C]">
                          {formatTime(entry.timeTaken)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#2ECC71]" />
                      <div>
                        <p className="font-display text-xs text-[#6B5CA8]">Accuracy</p>
                        <p className="font-display font-semibold text-sm text-[#2A1E5C]">
                          {calculateAccuracy(entry)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#FF4D6A]" />
                      <div>
                        <p className="font-display text-xs text-[#6B5CA8]">Status</p>
                        <p className="font-display font-semibold text-sm text-[#2A1E5C]">
                          {entry.solved ? 'Solved' : 'Incomplete'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Play Again button */}
                <button
                  onClick={() => handlePlayAgain(entry.puzzleId)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all whitespace-nowrap"
                >
                  <PlayCircle className="w-5 h-5" />
                  Play Again
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="crossy-card p-6 mb-8">
          <h2 className="font-display font-bold text-lg text-[#2A1E5C] mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-[#7B61FF] mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-[#2A1E5C]">
                {sortedHistory.length}
              </p>
              <p className="font-display text-sm text-[#6B5CA8]">Puzzles Solved</p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-[#FF4D6A] mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-[#2A1E5C]">
                {formatTime(
                  Math.floor(
                    sortedHistory.reduce((acc, h) => acc + h.timeTaken, 0) / sortedHistory.length
                  )
                )}
              </p>
              <p className="font-display text-sm text-[#6B5CA8]">Avg Time</p>
            </div>
            <div className="text-center">
              <Target className="w-8 h-8 text-[#2ECC71] mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-[#2A1E5C]">
                {formatTime(Math.min(...sortedHistory.map((h) => h.timeTaken)))}
              </p>
              <p className="font-display text-sm text-[#6B5CA8]">Best Time</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-[#FFC107] mx-auto mb-2" />
              <p className="font-display font-bold text-2xl text-[#2A1E5C]">
                {Math.round(
                  sortedHistory.reduce((acc, h) => acc + calculateAccuracy(h), 0) /
                    sortedHistory.length
                )}%
              </p>
              <p className="font-display text-sm text-[#6B5CA8]">Avg Accuracy</p>
            </div>
          </div>
        </div>

        {/* Motivational Section */}
        <div className="flex justify-center">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                {sortedHistory.length >= 10
                  ? "You're on fire! Keep it up!"
                  : sortedHistory.length >= 5
                  ? "You're doing great!"
                  : "Keep solving puzzles!"}
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src={
                sortedHistory.length >= 10
                  ? '/crossy-cheer.png'
                  : sortedHistory.length >= 5
                  ? '/crossy-cool.png'
                  : '/crossy-thumbsup.png'
              }
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default HistoryPage;
