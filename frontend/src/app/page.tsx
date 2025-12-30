'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { getDifficultyColor, getDifficultyLabel, formatDate } from '@/lib/utils';
import type { Puzzle } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useGameStore();
  const [todayPuzzle, setTodayPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayPuzzle = async () => {
      try {
        const puzzle = await api.getTodayPuzzle();
        setTodayPuzzle(puzzle);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayPuzzle();
  }, []);

  const handlePlaySolo = () => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/puzzle');
    } else {
      router.push('/puzzle');
    }
  };

  const handleCreateRoom = () => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/room/create');
    } else {
      router.push('/room/create');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Crosswords, Together
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Solve puzzles with friends in real-time. Daily challenges,
            multiplayer rooms, and endless fun.
          </p>
        </section>

        {/* Today's Puzzle Card */}
        <section className="max-w-2xl mx-auto mb-12">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Today&apos;s Puzzle</h2>
              {todayPuzzle?.date && (
                <span className="text-sm text-gray-500">
                  {formatDate(todayPuzzle.date)}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-gray-500">
                <p>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-primary-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : todayPuzzle ? (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">
                    {todayPuzzle.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      By {todayPuzzle.author}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(
                        todayPuzzle.difficulty
                      )}`}
                    >
                      {getDifficultyLabel(todayPuzzle.difficulty)}
                    </span>
                    <span className="text-gray-500">
                      {todayPuzzle.gridWidth}×{todayPuzzle.gridHeight}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handlePlaySolo}
                    className="btn btn-primary flex-1"
                  >
                    Play Solo
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="btn btn-secondary flex-1"
                  >
                    Create Room
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No puzzle available for today
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-4xl mx-auto mb-12">
          <h2 className="font-bold text-lg mb-4 text-center">Quick Start</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/room/join" className="card hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Join a Room</h3>
                <p className="text-sm text-gray-500">
                  Enter a code to join friends
                </p>
              </div>
            </Link>

            <Link href="/puzzle/random" className="card hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Random Puzzle</h3>
                <p className="text-sm text-gray-500">
                  Play a surprise puzzle
                </p>
              </div>
            </Link>

            <Link href="/archive" className="card hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Archive</h3>
                <p className="text-sm text-gray-500">
                  Browse past puzzles
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-4xl mx-auto">
          <h2 className="font-bold text-2xl mb-8 text-center">
            Why CrossPlay?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold mb-1">Real-Time Collaboration</h3>
                <p className="text-sm text-gray-600">
                  See your friends&apos; cursors and solve together in perfect sync.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold mb-1">Daily Puzzles</h3>
                <p className="text-sm text-gray-600">
                  Fresh puzzles every day, from easy Monday to challenging Saturday.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold mb-1">Mobile-First Design</h3>
                <p className="text-sm text-gray-600">
                  Optimized for touch, play anywhere on any device.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold mb-1">Stats & Streaks</h3>
                <p className="text-sm text-gray-600">
                  Track your progress and compete for the best times.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center text-white text-xs font-bold">
                C
              </div>
              <span className="font-medium">CrossPlay</span>
            </div>
            <p className="text-sm text-gray-500">
              Made with love for puzzle enthusiasts
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
