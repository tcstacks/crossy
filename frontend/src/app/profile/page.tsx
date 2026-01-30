'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, TrendingUp, Clock, Flame, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { Mascot } from '@/components/Mascot';
import { CrossyButton, CrossyCard, CrossyCardContent } from '@/components/crossy';
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
    <div className="min-h-screen bg-crossy-light-bg">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <CrossyCard className="mb-6">
          <CrossyCardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-crossy-light-purple text-crossy-purple rounded-full flex items-center justify-center text-3xl font-display font-bold border-2 border-crossy-dark-purple">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-crossy-dark-purple">{user?.displayName}</h1>
                <p className="text-crossy-dark-purple font-display">{user?.email}</p>
                {user?.isGuest && (
                  <span className="inline-block mt-1 text-xs bg-crossy-orange/20 text-crossy-orange px-2 py-0.5 rounded-full font-display font-semibold border border-crossy-orange">
                    Guest Account
                  </span>
                )}
              </div>
            </div>
          </CrossyCardContent>
        </CrossyCard>

        {/* Stats */}
        <CrossyCard className="mb-6">
          <CrossyCardContent className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 text-crossy-dark-purple flex items-center gap-2">
              <Trophy className="w-6 h-6 text-crossy-purple" />
              Statistics
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="spinner w-8 h-8 border-crossy-purple" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <div className="text-3xl font-display font-bold text-crossy-purple">
                    {stats.puzzlesSolved}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">Puzzles Solved</div>
                </div>

                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <Clock className="w-5 h-5 text-crossy-purple mx-auto mb-1" />
                  <div className="text-3xl font-display font-bold text-crossy-purple">
                    {formatTime(Math.round(stats.avgSolveTime))}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">Avg. Solve Time</div>
                </div>

                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <Flame className="w-5 h-5 text-crossy-orange mx-auto mb-1" />
                  <div className="text-3xl font-display font-bold text-crossy-orange">
                    {stats.streakCurrent}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">Current Streak</div>
                </div>

                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <TrendingUp className="w-5 h-5 text-crossy-green mx-auto mb-1" />
                  <div className="text-3xl font-display font-bold text-crossy-green">
                    {stats.streakBest}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">Best Streak</div>
                </div>

                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <Users className="w-5 h-5 text-crossy-purple mx-auto mb-1" />
                  <div className="text-3xl font-display font-bold text-crossy-purple">
                    {stats.multiplayerWins}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">MP Wins</div>
                </div>

                <div className="text-center p-4 bg-crossy-light-purple rounded-xl border-2 border-crossy-purple">
                  <Clock className="w-5 h-5 text-crossy-purple mx-auto mb-1" />
                  <div className="text-3xl font-display font-bold text-crossy-purple">
                    {formatTime(stats.totalPlayTime)}
                  </div>
                  <div className="text-sm font-display text-crossy-dark-purple">Total Play Time</div>
                </div>
              </div>
            ) : (
              <p className="text-center font-display text-crossy-dark-purple py-8">
                No statistics available yet. Start solving puzzles!
              </p>
            )}
          </CrossyCardContent>
        </CrossyCard>

        {/* Recent Activity */}
        <CrossyCard className="mb-6">
          <CrossyCardContent className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 text-crossy-dark-purple">Recent Activity</h2>

            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="spinner w-8 h-8 border-crossy-purple" />
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-crossy-light-purple rounded-xl hover:bg-crossy-purple/10 transition-colors border border-crossy-purple"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-crossy-dark-purple">Puzzle #{entry.puzzleId.slice(0, 8)}</span>
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
                      <div className="text-sm font-display text-crossy-dark-purple mt-1">
                        {new Date(entry.completedAt || entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-display font-bold text-crossy-purple">{formatTime(entry.solveTime)}</div>
                        <div className="text-xs font-display text-crossy-dark-purple">Time</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display font-bold text-crossy-purple">{entry.accuracy.toFixed(0)}%</div>
                        <div className="text-xs font-display text-crossy-dark-purple">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display font-bold text-crossy-purple">{entry.hintsUsed}</div>
                        <div className="text-xs font-display text-crossy-dark-purple">Hints</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center font-display text-crossy-dark-purple py-8">
                No puzzle history yet. Start solving puzzles!
              </p>
            )}
          </CrossyCardContent>
        </CrossyCard>

        {/* Account Actions */}
        <div className="space-y-3">
          {user?.isGuest && (
            <CrossyButton
              onClick={() => router.push('/auth?tab=register')}
              variant="primary"
              className="w-full"
            >
              Create Full Account 🎉
            </CrossyButton>
          )}

          <CrossyButton
            onClick={handleLogout}
            variant="secondary"
            className="w-full text-crossy-red hover:bg-crossy-red/10"
          >
            Sign Out
          </CrossyButton>
        </div>
      </main>
    </div>
  );
}
