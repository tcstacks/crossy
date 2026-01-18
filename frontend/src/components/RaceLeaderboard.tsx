'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function RaceLeaderboard() {
  const { players, puzzle, cells } = useGameStore();

  const leaderboardData = useMemo(() => {
    if (!puzzle) return [];

    const totalCells = puzzle.grid.flat().filter((cell) => cell.letter !== null).length;

    return players
      .map((player) => {
        const cellsCompleted = player.contribution;
        const progress = totalCells > 0 ? (cellsCompleted / totalCells) * 100 : 0;
        return {
          ...player,
          cellsCompleted,
          progress,
        };
      })
      .sort((a, b) => b.cellsCompleted - a.cellsCompleted);
  }, [players, puzzle, cells]);

  if (!puzzle || leaderboardData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-72">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <h3 className="font-bold text-purple-900">Race Leaderboard</h3>
      </div>

      <div className="space-y-2">
        {leaderboardData.map((player, index) => (
          <div
            key={player.userId}
            className={cn(
              'relative rounded-lg p-3 transition-all',
              index === 0 && 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400',
              index === 1 && 'bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300',
              index === 2 && 'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300',
              index > 2 && 'bg-gray-50 border border-gray-200'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-gray-500 w-6">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </span>
              <span
                className="font-semibold text-sm truncate flex-1"
                style={{ color: player.color }}
              >
                {player.displayName}
              </span>
              <span className="text-xs font-bold text-purple-600">
                {player.cellsCompleted} cells
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${player.progress}%`,
                  backgroundColor: player.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
        First to complete wins
      </div>
    </div>
  );
}
