'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface RelayTurnIndicatorProps {
  currentTurnUserId?: string;
  onPassTurn?: () => void;
}

export function RelayTurnIndicator({ currentTurnUserId, onPassTurn }: RelayTurnIndicatorProps) {
  const { players, user } = useGameStore();
  const [turnTimeElapsed, setTurnTimeElapsed] = useState(0);

  const isMyTurn = currentTurnUserId === user?.id;
  const currentPlayer = players.find((p) => p.userId === currentTurnUserId);
  const currentPlayerIndex = players.findIndex((p) => p.userId === currentTurnUserId);
  const turnTimeLimit = 60; // 60 seconds per turn

  useEffect(() => {
    setTurnTimeElapsed(0);
    const interval = setInterval(() => {
      setTurnTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurnUserId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeRemaining = Math.max(0, turnTimeLimit - turnTimeElapsed);
  const timeProgress = (turnTimeElapsed / turnTimeLimit) * 100;
  const isTimeRunningOut = timeRemaining < 30;

  if (!currentPlayer) {
    return null;
  }

  return (
    <div className="bg-white border-b border-purple-100 shadow-sm">
      {/* Turn Banner */}
      <div
        className={cn(
          'px-4 py-3 transition-all',
          isMyTurn
            ? 'bg-gradient-to-r from-purple-100 to-pink-100'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50'
        )}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-900">
                  {isMyTurn ? "It's your turn!" : `${currentPlayer.displayName}'s turn`}
                </span>
                {isMyTurn && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-semibold">
                    YOU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <svg
                  className={cn(
                    'w-4 h-4',
                    isTimeRunningOut ? 'text-red-500' : 'text-gray-400'
                  )}
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
                <span
                  className={cn(
                    'text-sm font-medium',
                    isTimeRunningOut ? 'text-red-600 animate-pulse' : 'text-gray-600'
                  )}
                >
                  {formatTime(timeRemaining)} remaining
                </span>
              </div>
            </div>
          </div>

          {isMyTurn && onPassTurn && (
            <button
              onClick={onPassTurn}
              className="btn btn-primary flex items-center gap-2"
            >
              <span>Pass Turn</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Time progress bar */}
        <div className="container mx-auto mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-linear',
                isTimeRunningOut ? 'bg-red-500' : 'bg-purple-500'
              )}
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Turn Order */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <h4 className="text-xs font-semibold text-gray-600 uppercase">Turn Order</h4>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {players.map((player, index) => (
              <div
                key={player.userId}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all',
                  player.userId === currentTurnUserId
                    ? 'bg-purple-100 border-2 border-purple-400 scale-105'
                    : 'bg-white border border-gray-200'
                )}
              >
                <span className="text-xs font-bold text-gray-500">
                  {index + 1}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    player.userId === currentTurnUserId ? 'text-purple-900' : 'text-gray-700'
                  )}
                >
                  {player.displayName}
                </span>
                {player.userId === currentTurnUserId && (
                  <svg
                    className="w-4 h-4 text-purple-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
