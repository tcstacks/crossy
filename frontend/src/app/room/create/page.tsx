'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import type { RoomMode, RoomConfig, Puzzle } from '@/types';
import { getDifficultyColor, getDifficultyLabel } from '@/lib/utils';

export default function CreateRoomPage() {
  const router = useRouter();
  const { isAuthenticated } = useGameStore();
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
    if (!puzzle) return;

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

      const response = await api.createRoom(puzzle.id, mode, config);
      router.push(`/room/${response.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="font-bold text-lg">Create Room</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Puzzle Card */}
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4">Today&apos;s Puzzle</h2>
          {puzzleLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner w-8 h-8" />
            </div>
          ) : puzzle ? (
            <div>
              <h3 className="text-xl font-bold mb-2">{puzzle.title}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>By {puzzle.author}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(
                    puzzle.difficulty
                  )}`}
                >
                  {getDifficultyLabel(puzzle.difficulty)}
                </span>
                <span>
                  {puzzle.gridWidth}×{puzzle.gridHeight}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No puzzle available</p>
          )}
        </div>

        {/* Room Settings */}
        <div className="card mb-6">
          <h2 className="font-bold text-lg mb-4">Room Settings</h2>

          {/* Game Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  value: 'collaborative',
                  label: 'Collaborative',
                  desc: 'Work together on one grid',
                },
                {
                  value: 'race',
                  label: 'Race',
                  desc: 'First to finish wins',
                },
                {
                  value: 'relay',
                  label: 'Relay',
                  desc: 'Take turns solving',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as RoomMode)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    mode === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Players */}
          <div className="mb-6">
            <label
              htmlFor="maxPlayers"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Max Players
            </label>
            <select
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="input"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
          </div>

          {/* Timer Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    timerMode === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
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
                  className="input"
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
              <span className="text-sm font-medium text-gray-700">
                Public Room
              </span>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isPublic ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isPublic ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Enable Hints
              </span>
              <button
                onClick={() => setHintsEnabled(!hintsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  hintsEnabled ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    hintsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isLoading || !puzzle}
          className="btn btn-primary w-full text-lg py-4"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner w-5 h-5" />
              Creating Room...
            </span>
          ) : (
            'Create Room'
          )}
        </button>
      </main>
    </div>
  );
}
