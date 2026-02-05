import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { puzzleApi, userApi, getToken } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Header } from '@/components/Header';
import type { PuzzleArchiveItem, PuzzleHistory } from '../types/api';

// Extended archive item with user completion data
interface ExtendedPuzzleArchiveItem extends PuzzleArchiveItem {
  title?: string;
  gridSize?: string;
}

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

function ArchivePage() {
  const navigate = useNavigate();
  const [archivePuzzles, setArchivePuzzles] = useState<ExtendedPuzzleArchiveItem[]>([]);
  const [userHistory, setUserHistory] = useState<PuzzleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchArchiveData = async () => {
      try {
        setLoading(true);

        // Fetch archive puzzles with difficulty filter
        const archiveResponse = await puzzleApi.getPuzzleArchive({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        });

        // Enhance archive items with additional info
        const puzzles = archiveResponse?.puzzles ?? [];
        const enhancedPuzzles = puzzles.map((puzzle) => ({
          ...puzzle,
          title: `Daily Puzzle - ${new Date(puzzle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          gridSize: '15x15', // Default crossword size
        }));

        setArchivePuzzles(enhancedPuzzles);
        setTotalPuzzles(archiveResponse?.total ?? 0);
        setTotalPages(Math.ceil((archiveResponse?.total ?? 0) / ITEMS_PER_PAGE));

        // Fetch user history if authenticated
        const token = getToken();
        if (token) {
          try {
            const history = await userApi.getMyHistory();
            setUserHistory(history ?? []);
          } catch (err) {
            console.error('Failed to fetch user history:', err);
            // Continue without history if not authenticated
          }
        }
      } catch (error) {
        console.error('Failed to fetch archive:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArchiveData();
  }, [currentPage, difficultyFilter]);

  // Check if puzzle is completed by user
  const isPuzzleCompleted = (puzzleId: string) => {
    return userHistory?.some((h) => h.puzzleId === puzzleId && h.solved) ?? false;
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

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return 'bg-[#2ECC71] text-white';
      case 'medium':
        return 'bg-[#FFC107] text-white';
      case 'hard':
        return 'bg-[#FF4D6A] text-white';
      default:
        return 'bg-[#6B5CA8] text-white';
    }
  };

  // Filter puzzles (client-side for search and date range only, difficulty is server-side)
  const filteredPuzzles = useMemo(() => {
    return archivePuzzles.filter((puzzle) => {
      // Search filter (searches in date)
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const dateStr = formatDate(puzzle.date).toLowerCase();
        if (!dateStr.includes(searchLower)) {
          return false;
        }
      }

      // Date range filter
      if (dateRangeStart) {
        const puzzleDate = new Date(puzzle.date);
        const startDate = new Date(dateRangeStart);
        if (puzzleDate < startDate) {
          return false;
        }
      }

      if (dateRangeEnd) {
        const puzzleDate = new Date(puzzle.date);
        const endDate = new Date(dateRangeEnd);
        if (puzzleDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [archivePuzzles, searchQuery, dateRangeStart, dateRangeEnd]);

  // Handle puzzle click
  const handlePuzzleClick = (date: string) => {
    navigate(`/play?date=${date}`);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        <Header />
        <div className="h-16" />

        {/* Loading skeleton */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-24 w-full mb-6 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <Header />
      <div className="h-16" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/crossy-calendar.png" alt="Archive" className="w-12 h-12" />
          <h1 className="font-display font-bold text-3xl text-[#2A1E5C]">Puzzle Archive</h1>
        </div>

        {/* Filters Section */}
        <div className="crossy-card p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-[#7B61FF]" />
              <input
                type="text"
                placeholder="Search by date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-[#ECE9FF] bg-white font-display text-[#2A1E5C] placeholder:text-[#6B5CA8] focus:outline-none focus:border-[#7B61FF] transition-colors"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Difficulty Filter */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-[#7B61FF]" />
                  <span className="font-display text-sm font-semibold text-[#2A1E5C]">Difficulty</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDifficultyFilter('all')}
                    className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                      difficultyFilter === 'all'
                        ? 'bg-[#7B61FF] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDifficultyFilter('easy')}
                    className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                      difficultyFilter === 'easy'
                        ? 'bg-[#2ECC71] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    Easy
                  </button>
                  <button
                    onClick={() => setDifficultyFilter('medium')}
                    className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                      difficultyFilter === 'medium'
                        ? 'bg-[#FFC107] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setDifficultyFilter('hard')}
                    className={`px-3 py-1.5 rounded-full font-display text-sm font-semibold transition-colors ${
                      difficultyFilter === 'hard'
                        ? 'bg-[#FF4D6A] text-white'
                        : 'bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF]'
                    }`}
                  >
                    Hard
                  </button>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[#7B61FF]" />
                  <span className="font-display text-sm font-semibold text-[#2A1E5C]">Date Range</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-full border-2 border-[#ECE9FF] bg-white font-display text-sm text-[#2A1E5C] focus:outline-none focus:border-[#7B61FF] transition-colors"
                  />
                  <span className="font-display text-[#6B5CA8] self-center">to</span>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-full border-2 border-[#ECE9FF] bg-white font-display text-sm text-[#2A1E5C] focus:outline-none focus:border-[#7B61FF] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(difficultyFilter !== 'all' || searchQuery || dateRangeStart || dateRangeEnd) && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#ECE9FF]">
                <span className="font-display text-sm text-[#6B5CA8]">
                  Showing {filteredPuzzles.length} of {totalPuzzles} puzzles
                </span>
                <button
                  onClick={() => {
                    setDifficultyFilter('all');
                    setSearchQuery('');
                    setDateRangeStart('');
                    setDateRangeEnd('');
                  }}
                  className="ml-auto px-3 py-1 rounded-full bg-[#F3F1FF] text-[#6B5CA8] font-display text-xs font-semibold hover:bg-[#ECE9FF] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Puzzle Grid */}
        {filteredPuzzles.length === 0 ? (
          <div className="crossy-card p-12 text-center">
            <img
              src="/crossy-calendar.png"
              alt="No puzzles"
              className="w-24 h-24 mx-auto mb-6"
            />
            <h2 className="font-display font-bold text-xl text-[#2A1E5C] mb-2">
              No Puzzles Found
            </h2>
            <p className="font-display text-[#6B5CA8] mb-6">
              Try adjusting your filters to see more puzzles.
            </p>
            <button
              onClick={() => {
                setDifficultyFilter('all');
                setSearchQuery('');
                setDateRangeStart('');
                setDateRangeEnd('');
              }}
              className="px-6 py-3 bg-[#7B61FF] text-white font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {filteredPuzzles.map((puzzle) => {
                const isCompleted = isPuzzleCompleted(puzzle.id);

                return (
                  <button
                    key={puzzle.id}
                    onClick={() => handlePuzzleClick(puzzle.date)}
                    className="crossy-card p-5 text-left relative overflow-hidden group hover:scale-105 transition-all duration-200"
                  >
                    {/* Purple gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF] to-[#A78BFF] opacity-5 group-hover:opacity-15 transition-opacity" />

                    {/* Completed checkmark */}
                    {isCompleted && (
                      <div className="absolute top-3 right-3 z-10">
                        <div className="w-8 h-8 bg-[#2ECC71] rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative">
                      {/* Date */}
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-[#7B61FF]" />
                        <span className="font-display font-bold text-lg text-[#2A1E5C]">
                          {formatDate(puzzle.date)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-display font-semibold text-sm text-[#6B5CA8] mb-4">
                        {puzzle.title}
                      </h3>

                      {/* Info Pills */}
                      <div className="flex flex-wrap gap-2">
                        {/* Difficulty Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full font-display text-xs font-bold ${getDifficultyColor(
                            puzzle.difficulty
                          )}`}
                        >
                          {puzzle.difficulty ? puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1) : 'Unknown'}
                        </span>

                        {/* Grid Size */}
                        <span className="px-2.5 py-1 rounded-full bg-[#F3F1FF] text-[#7B61FF] font-display text-xs font-bold">
                          {puzzle.gridSize}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-display font-semibold transition-all ${
                    currentPage === 1
                      ? 'bg-[#F3F1FF] text-[#6B5CA8] cursor-not-allowed opacity-50'
                      : 'bg-white text-[#2A1E5C] border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-xl font-display font-semibold transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#7B61FF] text-white border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]'
                            : 'bg-white text-[#2A1E5C] border-2 border-[#ECE9FF] hover:bg-[#F3F1FF]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-display font-semibold transition-all ${
                    currentPage === totalPages
                      ? 'bg-[#F3F1FF] text-[#6B5CA8] cursor-not-allowed opacity-50'
                      : 'bg-white text-[#2A1E5C] border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px]'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Motivational Section */}
        <div className="flex justify-center mt-8">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                {filteredPuzzles.length > 0
                  ? 'Pick a puzzle and start solving!'
                  : 'Check back later for more puzzles!'}
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src="/crossy-calendar.png"
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default ArchivePage;
