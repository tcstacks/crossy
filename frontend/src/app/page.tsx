'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Mascot, MascotWithSpeech } from '@/components/Mascot';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Puzzle } from '@/types';

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return { class: 'badge-easy', label: 'Easy' };
    case 'medium':
      return { class: 'badge-medium', label: 'Medium' };
    case 'hard':
      return { class: 'badge-hard', label: 'Hard' };
    default:
      return { class: 'badge-medium', label: 'Medium' };
  }
};

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
    <div className="min-h-screen fun-bg">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12 relative">
          {/* Floating decorative elements */}
          <div className="absolute top-0 left-10 w-16 h-16 bg-candy-yellow rounded-full opacity-20 animate-float blur-xl" />
          <div className="absolute top-20 right-20 w-20 h-20 bg-candy-pink rounded-full opacity-20 animate-float blur-xl" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/4 w-12 h-12 bg-candy-blue rounded-full opacity-20 animate-float blur-xl" style={{ animationDelay: '0.5s' }} />

          <div className="flex justify-center mb-6">
            <MascotWithSpeech
              size="xl"
              mood="celebrating"
              message="Let's solve some puzzles together!"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">Crossy!</span>
          </h1>
          <p className="text-xl text-purple-700 max-w-2xl mx-auto font-medium">
            Solve puzzles with friends in real-time. Daily challenges,
            multiplayer rooms, and endless fun!
          </p>
        </section>

        {/* Today's Puzzle Card */}
        <section className="max-w-2xl mx-auto mb-12">
          <div className="card relative overflow-hidden">
            {/* Decorative corner */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-candy rounded-full opacity-10 blur-2xl" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-purple-900 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Today&apos;s Puzzle
              </h2>
              {todayPuzzle?.date && (
                <span className="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
                  {formatDate(todayPuzzle.date)}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="spinner w-10 h-10" />
                <p className="text-purple-600 font-medium">Loading puzzle...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Mascot size="md" mood="thinking" className="mx-auto mb-4" animate={false} />
                <p className="text-purple-700 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-primary-600 hover:text-primary-700 font-bold"
                >
                  Try again
                </button>
              </div>
            ) : todayPuzzle ? (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-purple-900">
                    {todayPuzzle.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-purple-600 font-medium">
                      By {todayPuzzle.author}
                    </span>
                    <span className={`badge ${getDifficultyBadge(todayPuzzle.difficulty).class}`}>
                      {getDifficultyBadge(todayPuzzle.difficulty).label}
                    </span>
                    <span className="text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                      {todayPuzzle.gridWidth}×{todayPuzzle.gridHeight}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handlePlaySolo}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <span>Play Solo</span>
                    <span className="text-lg">🎯</span>
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <span>Create Room</span>
                    <span className="text-lg">👥</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Mascot size="md" mood="thinking" className="mx-auto mb-4" animate={false} />
                <p className="text-purple-600 font-medium">No puzzle available for today</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-4xl mx-auto mb-12">
          <h2 className="font-bold text-xl mb-6 text-center text-purple-900 flex items-center justify-center gap-2">
            <span className="text-2xl">🚀</span>
            Quick Start
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/room/join" className="card group">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-candy-pink to-candy-purple rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">👋</span>
                </div>
                <h3 className="font-bold mb-1 text-purple-900">Join a Room</h3>
                <p className="text-sm text-purple-600">
                  Enter a code to join friends
                </p>
              </div>
            </Link>

            <Link href="/puzzle/random" className="card group">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-candy-mint to-candy-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🎲</span>
                </div>
                <h3 className="font-bold mb-1 text-purple-900">Random Puzzle</h3>
                <p className="text-sm text-purple-600">
                  Play a surprise puzzle
                </p>
              </div>
            </Link>

            <Link href="/archive" className="card group">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-candy-yellow to-candy-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">📚</span>
                </div>
                <h3 className="font-bold mb-1 text-purple-900">Archive</h3>
                <p className="text-sm text-purple-600">
                  Browse past puzzles
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-4xl mx-auto">
          <h2 className="font-bold text-2xl mb-8 text-center text-purple-900 flex items-center justify-center gap-2">
            <span className="text-2xl">💜</span>
            Why Crossy?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-candy-pink to-candy-purple rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h3 className="font-bold mb-1 text-purple-900">Real-Time Collaboration</h3>
                <p className="text-sm text-purple-600">
                  See your friends&apos; cursors and solve together in perfect sync.
                </p>
              </div>
            </div>

            <div className="card flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-candy-mint to-candy-blue rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <h3 className="font-bold mb-1 text-purple-900">Daily Puzzles</h3>
                <p className="text-sm text-purple-600">
                  Fresh puzzles every day, from easy Monday to challenging Saturday.
                </p>
              </div>
            </div>

            <div className="card flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-candy-yellow to-candy-orange rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <h3 className="font-bold mb-1 text-purple-900">Mobile-First Design</h3>
                <p className="text-sm text-purple-600">
                  Optimized for touch, play anywhere on any device.
                </p>
              </div>
            </div>

            <div className="card flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-candy-purple to-candy-pink rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <h3 className="font-bold mb-1 text-purple-900">Stats & Streaks</h3>
                <p className="text-sm text-purple-600">
                  Track your progress and compete for the best times.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8">
        <div className="container mx-auto px-4">
          <div className="card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mascot size="sm" mood="happy" animate={false} />
                <span className="font-bold text-purple-900">Crossy</span>
              </div>
              <p className="text-sm text-purple-600 font-medium flex items-center gap-2">
                Made with <span className="text-candy-pink">💜</span> for puzzle enthusiasts
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
