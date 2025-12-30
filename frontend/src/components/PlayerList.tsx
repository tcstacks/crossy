'use client';

import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface PlayerListProps {
  compact?: boolean;
}

export function PlayerList({ compact = false }: PlayerListProps) {
  const { players, user, isHost } = useGameStore();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {players.slice(0, 4).map((player) => (
          <div
            key={player.userId}
            className="player-avatar"
            style={{ backgroundColor: player.color }}
            title={player.displayName}
          >
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        ))}
        {players.length > 4 && (
          <div className="player-avatar bg-gray-400">
            +{players.length - 4}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player) => {
        const isCurrentUser = player.userId === user?.id;
        const isPlayerHost = isHost && player.userId === user?.id;

        return (
          <div
            key={player.userId}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              isCurrentUser && 'bg-primary-50'
            )}
          >
            <div
              className="player-avatar"
              style={{ backgroundColor: player.color }}
            >
              {player.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {player.displayName}
                  {isCurrentUser && ' (You)'}
                </span>
                {isPlayerHost && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Host
                  </span>
                )}
                {player.isSpectator && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Spectator
                  </span>
                )}
              </div>
              {player.contribution > 0 && (
                <div className="text-xs text-gray-500">
                  {Math.round(player.contribution)}% contribution
                </div>
              )}
            </div>
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                player.isConnected ? 'bg-green-500' : 'bg-gray-300'
              )}
              title={player.isConnected ? 'Online' : 'Offline'}
            />
          </div>
        );
      })}
    </div>
  );
}

interface PlayerPillProps {
  onClick?: () => void;
}

export function PlayerPill({ onClick }: PlayerPillProps) {
  const { players } = useGameStore();
  const connectedCount = players.filter((p) => p.isConnected).length;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border hover:bg-gray-50"
    >
      <div className="flex -space-x-2">
        {players.slice(0, 3).map((player) => (
          <div
            key={player.userId}
            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white"
            style={{ backgroundColor: player.color }}
          >
            {player.displayName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-sm font-medium">
        {connectedCount} online
      </span>
    </button>
  );
}
