'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Flame, Calendar } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Header } from '@/components/Header';
import { Mascot, MascotWithSpeech } from '@/components/Mascot';
import { CrossyButton, CrossyCard, CrossyCardContent, CrossyCardHeader } from '@/components/crossy';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Puzzle, UserStats } from '@/types';

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return { class: 'tag-easy', label: 'Easy' };
    case 'medium':
      return { class: 'tag-medium', label: 'Medium' };
    case 'hard':
      return { class: 'tag-hard', label: 'Hard' };
    default:
      return { class: 'tag-medium', label: 'Medium' };
  }
};

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useGameStore();
  const [todayPuzzle, setTodayPuzzle] = useState<Puzzle | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GSAP animation refs
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const puzzleCardRef = useRef(null);
  const quickActionsRef = useRef(null);

  // GSAP entrance animations
  useGSAP(() => {
    const tl = gsap.timeline();

    // Animate hero section
    tl.from(heroRef.current, {
      opacity: 0,
      y: -30,
      duration: 0.8,
      ease: 'power3.out',
    })
    // Animate stats cards
    .from(statsRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.4')
    // Animate puzzle card
    .from(puzzleCardRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: 'back.out(1.2)',
    }, '-=0.3')
    // Animate quick actions
    .from(quickActionsRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.3');
  }, []);

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

    const fetchUserStats = async () => {
      if (isAuthenticated) {
        try {
          const stats = await api.getMyStats();
          setUserStats(stats);
        } catch (err) {
          console.error('Failed to load user stats:', err);
        }
      }
    };

    fetchTodayPuzzle();
    fetchUserStats();
  }, [isAuthenticated]);

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
    <div className="min-h-screen bg-crossy-light-bg">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section ref={heroRef} className="text-center mb-12 relative">
          <div className="grid-bg" />

          <div className="flex justify-center mb-6">
            <MascotWithSpeech
              size="xl"
              mood="cheer"
              message="Let's solve some puzzles together!"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-pixel mb-4 text-crossy-purple">
            Crossy!
          </h1>
          <p className="text-xl md:text-2xl text-crossy-dark-purple max-w-2xl mx-auto font-display font-semibold">
            Solve puzzles with friends in real-time. Daily challenges,
            multiplayer rooms, and endless fun!
          </p>
        </section>

        {/* Today's Puzzle Card */}
        <section ref={puzzleCardRef} className="max-w-2xl mx-auto mb-12">
          <CrossyCard>
            <CrossyCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-crossy-dark-purple flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-crossy-purple" />
                  Today&apos;s Puzzle
                </h2>
                {todayPuzzle?.date && (
                  <span className="text-sm text-crossy-dark-purple font-display font-semibold bg-crossy-light-purple px-3 py-1 rounded-full border border-crossy-purple">
                    {formatDate(todayPuzzle.date)}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="spinner w-10 h-10" />
                  <p className="text-crossy-purple font-display font-semibold">Loading puzzle...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <Mascot size="md" mood="hint" className="mx-auto mb-4" animate={false} />
                  <p className="text-crossy-dark-purple font-display mb-4">{error}</p>
                  <CrossyButton onClick={() => window.location.reload()}>
                    Try again
                  </CrossyButton>
                </div>
              ) : todayPuzzle ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-2xl font-display font-bold mb-2 text-crossy-dark-purple">
                      {todayPuzzle.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-crossy-dark-purple font-display font-medium">
                        By {todayPuzzle.author}
                      </span>
                      <span className={getDifficultyBadge(todayPuzzle.difficulty).class}>
                        {getDifficultyBadge(todayPuzzle.difficulty).label}
                      </span>
                      <span className="text-crossy-dark-purple bg-crossy-light-purple px-3 py-1 rounded-full font-display font-semibold border border-crossy-purple">
                        {todayPuzzle.gridWidth}×{todayPuzzle.gridHeight}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <CrossyButton
                      onClick={handlePlaySolo}
                      variant="primary"
                      className="flex-1"
                    >
                      Play Solo 🎯
                    </CrossyButton>
                    <CrossyButton
                      onClick={handleCreateRoom}
                      variant="secondary"
                      className="flex-1"
                    >
                      Create Room 👥
                    </CrossyButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Mascot size="md" mood="hint" className="mx-auto mb-4" animate={false} />
                  <p className="text-crossy-dark-purple font-display font-semibold">No puzzle available for today</p>
                </div>
              )}
            </CrossyCardContent>
          </CrossyCard>
        </section>

        {/* Streak Display */}
        {isAuthenticated && userStats && (
          <section ref={statsRef} className="max-w-2xl mx-auto mb-12">
            <CrossyCard>
              <CrossyCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-7 h-7 text-crossy-orange" />
                      <h2 className="font-display font-bold text-xl text-crossy-dark-purple">Your Streak</h2>
                    </div>
                    <p className="text-sm text-crossy-dark-purple font-display">
                      Keep playing daily to maintain your streak!
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-display font-bold text-crossy-orange">
                      {userStats.streakCurrent}
                    </div>
                    <div className="text-xs text-crossy-dark-purple font-display font-semibold mt-1">
                      {userStats.streakCurrent === 1 ? 'day' : 'days'}
                    </div>
                    {userStats.streakBest > 0 && (
                      <div className="text-xs text-crossy-purple font-display mt-2">
                        Best: {userStats.streakBest} {userStats.streakBest === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>
                </div>
              </CrossyCardContent>
            </CrossyCard>
          </section>
        )}

        {/* Quick Actions */}
        <section ref={quickActionsRef} className="max-w-4xl mx-auto mb-12">
          <h2 className="font-display font-bold text-xl mb-6 text-center text-crossy-dark-purple flex items-center justify-center gap-2">
            <span className="text-2xl">🚀</span>
            Quick Start
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/room/join">
              <CrossyCard className="group hover:scale-105 transition-transform cursor-pointer">
                <CrossyCardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-crossy-purple rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-crossy-dark-purple group-hover:animate-pulse">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Join a Room</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Enter a code to join friends
                  </p>
                </CrossyCardContent>
              </CrossyCard>
            </Link>

            <Link href="/puzzle/random">
              <CrossyCard className="group hover:scale-105 transition-transform cursor-pointer">
                <CrossyCardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-crossy-green rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-crossy-dark-purple group-hover:animate-pulse">
                    <span className="text-3xl">🎲</span>
                  </div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Random Puzzle</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Play a surprise puzzle
                  </p>
                </CrossyCardContent>
              </CrossyCard>
            </Link>

            <Link href="/archive">
              <CrossyCard className="group hover:scale-105 transition-transform cursor-pointer">
                <CrossyCardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-crossy-orange rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-crossy-dark-purple group-hover:animate-pulse">
                    <span className="text-3xl">📚</span>
                  </div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Archive</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Browse past puzzles
                  </p>
                </CrossyCardContent>
              </CrossyCard>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-4xl mx-auto">
          <h2 className="font-display font-bold text-2xl mb-8 text-center text-crossy-dark-purple flex items-center justify-center gap-2">
            <span className="text-2xl">💜</span>
            Why Crossy?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CrossyCard>
              <CrossyCardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 bg-crossy-purple rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-crossy-dark-purple">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Real-Time Collaboration</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    See your friends&apos; cursors and solve together in perfect sync.
                  </p>
                </div>
              </CrossyCardContent>
            </CrossyCard>

            <CrossyCard>
              <CrossyCardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 bg-crossy-green rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-crossy-dark-purple">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Daily Puzzles</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Fresh puzzles every day, from easy Monday to challenging Saturday.
                  </p>
                </div>
              </CrossyCardContent>
            </CrossyCard>

            <CrossyCard>
              <CrossyCardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 bg-crossy-orange rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-crossy-dark-purple">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Mobile-First Design</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Optimized for touch, play anywhere on any device.
                  </p>
                </div>
              </CrossyCardContent>
            </CrossyCard>

            <CrossyCard>
              <CrossyCardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 bg-crossy-red rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-crossy-dark-purple">
                  <span className="text-xl">🏆</span>
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1 text-crossy-dark-purple">Stats & Streaks</h3>
                  <p className="text-sm text-crossy-dark-purple font-display">
                    Track your progress and compete for the best times.
                  </p>
                </div>
              </CrossyCardContent>
            </CrossyCard>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8">
        <div className="container mx-auto px-4">
          <CrossyCard>
            <CrossyCardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Mascot size="sm" mood="small" animate={false} />
                  <span className="font-pixel text-crossy-purple">Crossy</span>
                </div>
                <p className="text-sm text-crossy-dark-purple font-display font-semibold flex items-center gap-2">
                  Made with <span className="text-crossy-purple">💜</span> for puzzle enthusiasts
                </p>
              </div>
            </CrossyCardContent>
          </CrossyCard>
        </div>
      </footer>
    </div>
  );
}
