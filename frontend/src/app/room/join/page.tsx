'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { CrossyButton, CrossyCard, CrossyCardContent, CrossyInput } from '@/components/crossy';
import { Mascot } from '@/components/Mascot';

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

    if (code.trim().length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify room exists and check capacity
      const response = await api.getRoomByCode(code.toUpperCase());
      if (response.room) {
        // Check if room is full
        const { room, players } = response;
        const maxPlayers = room.config?.maxPlayers ?? 8;

        if (players.length >= maxPlayers) {
          setError('Room is full');
          setIsLoading(false);
          return;
        }

        // Redirect to room (which will show lobby if state is 'lobby')
        router.push(`/room/${code.toUpperCase()}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Room not found';

      // Provide user-friendly error messages
      if (errorMessage.includes('not found')) {
        setError('Invalid room code. Please check and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crossy-light-bg flex flex-col">
      <header className="bg-white border-b-2 border-crossy-dark-purple">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-crossy-purple hover:text-crossy-hover-purple">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display font-bold text-lg text-crossy-dark-purple">Join Room</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <CrossyCard>
            <CrossyCardContent className="p-8">
              <div className="flex justify-center mb-4">
                <Mascot size="lg" mood="chat" />
              </div>

              <h2 className="text-2xl font-display font-bold text-center mb-2 text-crossy-dark-purple">
                Enter Room Code
              </h2>
              <p className="text-crossy-dark-purple font-display text-center mb-6">
                Ask the room host for the 6-character code
              </p>

              {error && (
                <div className="mb-4 p-3 bg-crossy-red/10 border-2 border-crossy-red text-crossy-red rounded-xl text-center font-display font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <CrossyInput
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="text-center text-2xl font-mono tracking-widest uppercase"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <CrossyButton
                  type="submit"
                  disabled={isLoading || code.length < 6}
                  variant="primary"
                  className="w-full text-lg py-4"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="spinner w-5 h-5 border-white" />
                      Joining...
                    </span>
                  ) : (
                    'Join Room 👋'
                  )}
                </CrossyButton>
              </form>

              <div className="mt-6 pt-6 border-t-2 border-crossy-dark-purple text-center">
                <p className="text-sm text-crossy-dark-purple font-display mb-4">
                  Or create your own room
                </p>
                <Link href="/room/create">
                  <CrossyButton variant="secondary" className="w-full">
                    Create Room
                  </CrossyButton>
                </Link>
              </div>
            </CrossyCardContent>
          </CrossyCard>
        </div>
      </main>
    </div>
  );
}
