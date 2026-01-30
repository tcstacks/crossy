'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { CrossyButton, CrossyCard, CrossyCardContent } from '@/components/crossy';
import { Mascot } from '@/components/Mascot';
import type { RoomMode, RoomConfig, Puzzle } from '@/types';
import { getDifficultyColor, getDifficultyLabel } from '@/lib/utils';

export default function CreateRoomPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Room settings
  const [mode, setMode] = useState<RoomMode>('collaborative');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [timerMode, setTimerMode] = useState<'none' | 'countdown' | 'stopwatch'>('stopwatch');
  const [timerSeconds, setTimerSeconds] = useState(1800); // 30 minutes

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/room/create');
      return;
    }

    // Load today's puzzle
    const loadPuzzle = async () => {
      try {
        const data = await api.getTodayPuzzle();
        setPuzzle(data);
      } catch (err) {
        setError('Failed to load puzzle');
      } finally {
        setPuzzleLoading(false);
      }
    };

    loadPuzzle();
  }, [isAuthenticated, router]);

  const handleCreateRoom = async () => {
    if (!puzzle || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const config: Partial<RoomConfig> = {
        maxPlayers,
        isPublic,
        hintsEnabled,
        timerMode,
        timerSeconds: timerMode === 'countdown' ? timerSeconds : undefined,
        spectatorMode: true,
      };

      const response = await api.createRoom(puzzle.id, mode, config, {
        id: user.id,
        displayName: user.displayName,
      });
      router.push(`/room/${response.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crossy-light-bg">
      <header className="bg-white border-b-2 border-crossy-dark-purple">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-crossy-purple hover:text-crossy-hover-purple">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display font-bold text-lg text-crossy-dark-purple">Create Room</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <CrossyCard className="mb-6 border-crossy-red">
            <CrossyCardContent className="p-4 text-crossy-red font-display font-semibold">
              {error}
            </CrossyCardContent>
          </CrossyCard>
        )}

        {/* Puzzle Card */}
        <CrossyCard className="mb-6">
          <CrossyCardContent className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 text-crossy-dark-purple">Today&apos;s Puzzle</h2>
            {puzzleLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner w-8 h-8 border-crossy-purple" />
              </div>
            ) : puzzle ? (
              <div>
                <h3 className="text-xl font-display font-bold mb-2 text-crossy-dark-purple">{puzzle.title}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-crossy-dark-purple font-display">By {puzzle.author}</span>
                  <span className={`tag-${puzzle.difficulty}`}>
                    {getDifficultyLabel(puzzle.difficulty)}
                  </span>
                  <span className="text-crossy-dark-purple font-display font-semibold bg-crossy-light-purple px-2 py-1 rounded-full border border-crossy-purple">
                    {puzzle.gridWidth}×{puzzle.gridHeight}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-crossy-dark-purple font-display">No puzzle available</p>
            )}
          </CrossyCardContent>
        </CrossyCard>

        {/* Room Settings */}
        <CrossyCard className="mb-6">
          <CrossyCardContent className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 text-crossy-dark-purple">Room Settings</h2>

            {/* Game Mode */}
            <div className="mb-6">
              <label className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
                Game Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'collaborative',
                    label: 'Collaborative',
                    desc: 'Work together on one grid',
                    emoji: '🤝',
                  },
                  {
                    value: 'race',
                    label: 'Race',
                    desc: 'First to finish wins',
                    emoji: '🏁',
                  },
                  {
                    value: 'relay',
                    label: 'Relay',
                    desc: 'Take turns solving',
                    emoji: '🔄',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setMode(option.value as RoomMode)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === option.value
                        ? 'border-crossy-purple bg-crossy-light-purple'
                        : 'border-crossy-dark-purple hover:border-crossy-purple hover:bg-crossy-light-bg'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.emoji}</div>
                    <div className="font-display font-semibold text-crossy-dark-purple">{option.label}</div>
                    <div className="text-xs text-crossy-dark-purple font-display">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Players */}
            <div className="mb-6">
              <label
                htmlFor="maxPlayers"
                className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2"
              >
                Max Players
              </label>
              <select
                id="maxPlayers"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-crossy-dark-purple rounded-xl focus:outline-none focus:ring-2 focus:ring-crossy-purple bg-white text-crossy-dark-purple font-display"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} players
                  </option>
                ))}
              </select>
            </div>

            {/* Timer Mode */}
            <div className="mb-6">
              <label className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
                Timer
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'stopwatch', label: 'Stopwatch' },
                  { value: 'countdown', label: 'Countdown' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimerMode(option.value as typeof timerMode)}
                    className={`p-3 rounded-xl border-2 font-display font-semibold transition-all ${
                      timerMode === option.value
                        ? 'border-crossy-purple bg-crossy-light-purple text-crossy-dark-purple'
                        : 'border-crossy-dark-purple hover:border-crossy-purple text-crossy-dark-purple'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {timerMode === 'countdown' && (
                <div className="mt-3">
                  <select
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-crossy-dark-purple rounded-xl focus:outline-none focus:ring-2 focus:ring-crossy-purple bg-white text-crossy-dark-purple font-display"
                  >
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={2700}>45 minutes</option>
                    <option value={3600}>60 minutes</option>
                  </select>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-display font-semibold text-crossy-dark-purple">
                  Public Room
                </span>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-12 h-6 rounded-full transition-colors border-2 border-crossy-dark-purple ${
                    isPublic ? 'bg-crossy-purple' : 'bg-crossy-light-bg'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform border border-crossy-dark-purple ${
                      isPublic ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm font-display font-semibold text-crossy-dark-purple">
                  Enable Hints
                </span>
                <button
                  onClick={() => setHintsEnabled(!hintsEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors border-2 border-crossy-dark-purple ${
                    hintsEnabled ? 'bg-crossy-purple' : 'bg-crossy-light-bg'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform border border-crossy-dark-purple ${
                      hintsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            </div>
          </CrossyCardContent>
        </CrossyCard>

        {/* Create Button */}
        <CrossyButton
          onClick={handleCreateRoom}
          disabled={isLoading || !puzzle}
          variant="primary"
          className="w-full text-lg py-4"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner w-5 h-5 border-white" />
              Creating Room...
            </span>
          ) : (
            'Create Room 🚀'
          )}
        </CrossyButton>
      </main>
    </div>
  );
}
