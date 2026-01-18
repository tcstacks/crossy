'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, generateShareText } from '@/lib/utils';
import type { PlayerResult } from '@/types';

interface ResultsModalProps {
  isOpen: boolean;
  solveTime: number;
  players?: PlayerResult[];
  onClose: () => void;
  onRematch?: () => void;
  onHome?: () => void;
}

export function ResultsModal({
  isOpen,
  solveTime,
  players = [],
  onClose,
  onRematch,
  onHome,
}: ResultsModalProps) {
  const { puzzle, hintsUsed, user, room } = useGameStore();
  const isRaceMode = room?.mode === 'race';

  const handleShare = useCallback(async () => {
    if (!puzzle) return;

    const shareText = generateShareText(puzzle.title, solveTime, hintsUsed);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CrossPlay Results',
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    }
  }, [puzzle, solveTime, hintsUsed]);

  if (!isOpen) return null;

  // In race mode, contribution is actually the rank (inverted for sorting)
  // Higher contribution = higher rank (i.e., better placement)
  const sortedPlayers = isRaceMode
    ? [...players].sort((a, b) => b.contribution - a.contribution)
    : [...players].sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="results-card">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Puzzle Complete!</h2>
            <p className="opacity-90">{puzzle?.title}</p>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{formatTime(solveTime)}</div>
              <div className="text-sm opacity-90">Solve Time</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{hintsUsed}</div>
              <div className="text-sm opacity-90">Hints Used</div>
            </div>
          </div>
        </div>

        {/* Player rankings/contributions */}
        {sortedPlayers.length > 1 && (
          <div className="p-6 border-b">
            <h3 className="font-bold mb-3">
              {isRaceMode ? 'Final Rankings' : 'Team Contributions'}
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const isCurrentUser = player.userId === user?.id;
                const rank = index + 1;

                return (
                  <div key={player.userId} className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-gray-400">
                      {rank === 1 && '🥇'}
                      {rank === 2 && '🥈'}
                      {rank === 3 && '🥉'}
                      {rank > 3 && rank}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {player.displayName}
                        {isCurrentUser && ' (You)'}
                      </div>
                      {!isRaceMode && (
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${player.contribution}%`,
                              backgroundColor: player.color,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {isRaceMode ? `#${rank}` : `${Math.round(player.contribution)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 space-y-3">
          <button
            onClick={handleShare}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Results
          </button>

          <div className="flex gap-3">
            {onRematch && (
              <button
                onClick={onRematch}
                className="btn btn-secondary flex-1"
              >
                Play Again
              </button>
            )}
            <button
              onClick={onHome || onClose}
              className="btn btn-ghost flex-1"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
