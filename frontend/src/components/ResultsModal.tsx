'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, generateShareText } from '@/lib/utils';
import { CrossyButton } from '@/components/crossy';
import { Mascot } from '@/components/Mascot';
import { Share2 } from 'lucide-react';
import type { PlayerResult } from '@/types';

interface ResultsModalProps {
  isOpen: boolean;
  solveTime: number;
  accuracy?: number;
  players?: PlayerResult[];
  onClose: () => void;
  onRematch?: () => void;
  onHome?: () => void;
}

export function ResultsModal({
  isOpen,
  solveTime,
  accuracy,
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
      <div className="crossy-card max-w-md w-full overflow-hidden celebration-pop">
        {/* Header */}
        <div className="bg-crossy-purple p-6 text-center">
          <Mascot size="lg" mood="cheer" className="mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2 text-white">Puzzle Complete!</h2>
          <p className="text-white/90 font-display">{puzzle?.title}</p>
        </div>

        {/* Stats */}
        <div className="p-6">
          <div className={`grid gap-4 ${accuracy !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-crossy-light-purple rounded-xl p-4 text-center border-2 border-crossy-purple">
              <div className="text-3xl font-display font-bold text-crossy-dark-purple">{formatTime(solveTime)}</div>
              <div className="text-sm font-display text-crossy-dark-purple">Solve Time</div>
            </div>
            {accuracy !== undefined && (
              <div className="bg-crossy-light-purple rounded-xl p-4 text-center border-2 border-crossy-purple">
                <div className="text-3xl font-display font-bold text-crossy-dark-purple">{Math.round(accuracy)}%</div>
                <div className="text-sm font-display text-crossy-dark-purple">Accuracy</div>
              </div>
            )}
            <div className="bg-crossy-light-purple rounded-xl p-4 text-center border-2 border-crossy-purple">
              <div className="text-3xl font-display font-bold text-crossy-dark-purple">{hintsUsed}</div>
              <div className="text-sm font-display text-crossy-dark-purple">Hints Used</div>
            </div>
          </div>
        </div>

        {/* Player rankings/contributions */}
        {sortedPlayers.length > 1 && (
          <div className="px-6 pb-6 border-t-2 border-crossy-dark-purple pt-6">
            <h3 className="font-display font-bold mb-3 text-crossy-dark-purple">
              {isRaceMode ? 'Final Rankings' : 'Team Contributions'}
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const isCurrentUser = player.userId === user?.id;
                const rank = index + 1;

                return (
                  <div key={player.userId} className="flex items-center gap-3">
                    <div className="w-6 text-center font-display font-bold text-crossy-purple">
                      {rank === 1 && '🥇'}
                      {rank === 2 && '🥈'}
                      {rank === 3 && '🥉'}
                      {rank > 3 && rank}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-display font-bold border-2 border-crossy-dark-purple"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-semibold text-crossy-dark-purple">
                        {player.displayName}
                        {isCurrentUser && ' (You)'}
                      </div>
                      {!isRaceMode && (
                        <div className="h-2 bg-crossy-light-purple rounded-full overflow-hidden border border-crossy-purple">
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
                    <div className="text-sm font-display font-bold text-crossy-dark-purple">
                      {isRaceMode ? `#${rank}` : `${Math.round(player.contribution)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 space-y-3 border-t-2 border-crossy-dark-purple">
          <CrossyButton
            onClick={handleShare}
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share Results
          </CrossyButton>

          <div className="flex gap-3">
            {onRematch && (
              <CrossyButton
                onClick={onRematch}
                variant="secondary"
                className="flex-1"
              >
                Play Again
              </CrossyButton>
            )}
            <CrossyButton
              onClick={onHome || onClose}
              variant="secondary"
              className="flex-1"
            >
              Back to Home
            </CrossyButton>
          </div>
        </div>
      </div>
    </div>
  );
}
