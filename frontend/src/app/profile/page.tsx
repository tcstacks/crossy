'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { UserStats, PuzzleHistory } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useGameStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<PuzzleHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

    const loadHistory = async () => {
      try {
        const data = await api.getMyHistory(10, 0);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadStats();
    loadHistory();
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

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="spinner w-8 h-8" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Puzzle #{entry.puzzleId.slice(0, 8)}</span>
                      {entry.completed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
                      {entry.roomId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Multiplayer
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(entry.completedAt || entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-primary-600">{formatTime(entry.solveTime)}</div>
                      <div className="text-xs text-gray-500">Time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-primary-600">{entry.accuracy.toFixed(0)}%</div>
                      <div className="text-xs text-gray-500">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-primary-600">{entry.hintsUsed}</div>
                      <div className="text-xs text-gray-500">Hints</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No puzzle history yet. Start solving puzzles!
            </p>
          )}
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
