'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useGameStore();

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      const redirectUrl = code
        ? `/auth?redirect=/room/join?code=${code}`
        : '/auth?redirect=/room/join';
      router.push(redirectUrl);
    }
  }, [isAuthenticated, router, code]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify room exists
      const response = await api.getRoomByCode(code.toUpperCase());
      if (response.room) {
        router.push(`/room/${code.toUpperCase()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
          <h1 className="font-bold text-lg">Join Room</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card">
            <h2 className="text-2xl font-bold text-center mb-2">
              Enter Room Code
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Ask the room host for the 6-character code
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="input text-center text-2xl font-mono tracking-widest uppercase"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="btn btn-primary w-full text-lg py-4"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-5 h-5" />
                    Joining...
                  </span>
                ) : (
                  'Join Room'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500 mb-4">
                Or create your own room
              </p>
              <Link href="/room/create" className="btn btn-secondary">
                Create Room
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
