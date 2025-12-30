'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { UserStats } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useGameStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/profile');
      return;
    }

    const loadStats = async () => {
      try {
        const data = await api.getMyStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-3xl font-bold">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.displayName}</h1>
              <p className="text-gray-500">{user?.email}</p>
              {user?.isGuest && (
                <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Guest Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4">Statistics</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner w-8 h-8" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {stats.puzzlesSolved}
                </div>
                <div className="text-sm text-gray-500">Puzzles Solved</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {formatTime(Math.round(stats.avgSolveTime))}
                </div>
                <div className="text-sm text-gray-500">Avg. Solve Time</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {stats.streakCurrent}
                </div>
                <div className="text-sm text-gray-500">Current Streak</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {stats.streakBest}
                </div>
                <div className="text-sm text-gray-500">Best Streak</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {stats.multiplayerWins}
                </div>
                <div className="text-sm text-gray-500">MP Wins</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {formatTime(stats.totalPlayTime)}
                </div>
                <div className="text-sm text-gray-500">Total Play Time</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No statistics available yet. Start solving puzzles!
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
          <p className="text-center text-gray-500 py-8">
            Your puzzle history will appear here
          </p>
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          {user?.isGuest && (
            <button
              onClick={() => router.push('/auth?tab=register')}
              className="btn btn-primary w-full"
            >
              Create Full Account
            </button>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary w-full text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
