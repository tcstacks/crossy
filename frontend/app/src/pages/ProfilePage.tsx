import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Trophy,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Edit,
} from 'lucide-react';
import { userApi, getToken } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { Header } from '@/components/Header';
import type { User, UserStats } from '../types/api';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // Check if user is authenticated
      const token = getToken();
      if (!token) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      try {
        setLoading(true);
        const [userData, statsData] = await Promise.all([
          userApi.getMe(),
          userApi.getMyStats(),
        ]);
        setUser(userData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // If authentication fails, redirect to home with auth modal
        navigate('/', { state: { showAuth: true } });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Choose mascot based on achievement level
  const getMascotImage = () => {
    if (!stats) return '/crossy-main.png';

    // High streak (10+)
    if (stats.currentStreak >= 10) return '/crossy-cheer.png';

    // Good performance (5+ puzzles)
    if (stats.totalPuzzlesSolved >= 5) return '/crossy-cool.png';

    // Starting out
    if (stats.totalPuzzlesSolved > 0) return '/crossy-thumbsup.png';

    return '/crossy-main.png';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF]">
        <Header />
        <div className="h-16" />

        {/* Loading skeleton */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <Header />
      <div className="h-16" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="crossy-card p-6 mb-8 relative overflow-hidden">
          {/* Purple gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF] to-[#A78BFF] opacity-10" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Mascot */}
              <div className="relative">
                <img
                  src={getMascotImage()}
                  alt="Crossy mascot"
                  className="w-20 h-20 sm:w-24 sm:h-24 animate-bounce-slow"
                />
              </div>

              {/* User Info */}
              <div>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2A1E5C] mb-1">
                  {user?.displayName || 'Guest User'}
                </h1>
                {!user?.isGuest && user?.email && (
                  <p className="font-display text-[#6B5CA8] mb-1">{user.email}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#7B61FF]" />
                  <span className="font-display text-[#6B5CA8]">
                    Joined {formatDate(user?.createdAt || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Button (future functionality) */}
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-[#2A1E5C] font-display font-semibold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all opacity-50 cursor-not-allowed">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <h2 className="font-display font-bold text-xl text-[#2A1E5C] mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Puzzles Solved */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF] to-[#A78BFF] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-[#7B61FF]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Puzzles Solved</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C] animate-count-up">
                  {stats?.totalPuzzlesSolved || 0}
                </p>
              </div>
            </div>

            {/* Average Solve Time */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D6A] to-[#FF6B85] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[#FF4D6A]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Avg Solve Time</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C]">
                  {formatTime(stats?.averageTime || 0)}
                </p>
              </div>
            </div>

            {/* Current Streak */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFC107] to-[#FFD54F] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-[#FFC107]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Current Streak</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C] animate-pulse">
                  {stats?.currentStreak || 0}
                </p>
              </div>
            </div>

            {/* Best Streak */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2ECC71] to-[#5EE08A] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-[#2ECC71]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Best Streak</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C]">
                  {stats?.longestStreak || 0}
                </p>
              </div>
            </div>

            {/* Best Time */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3498DB] to-[#5DADE2] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-[#3498DB]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Best Time</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C]">
                  {formatTime(stats?.bestTime || 0)}
                </p>
              </div>
            </div>

            {/* Multiplayer Wins (placeholder for now) */}
            <div className="crossy-card p-5 relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-[#9B59B6] to-[#BB8FCE] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-[#9B59B6]" />
                  <span className="font-display text-sm text-[#6B5CA8]">Multiplayer Wins</span>
                </div>
                <p className="font-display font-bold text-3xl text-[#2A1E5C]">
                  {stats?.multiplayerWins || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Section */}
        <div className="flex justify-center">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                {stats?.totalPuzzlesSolved === 0
                  ? "Let's solve your first puzzle!"
                  : stats && stats.currentStreak >= 10
                  ? "You're on fire! Keep it up!"
                  : stats && stats.totalPuzzlesSolved >= 5
                  ? "You're doing great! Keep solving!"
                  : "Keep up the good work!"}
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src={getMascotImage()}
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
