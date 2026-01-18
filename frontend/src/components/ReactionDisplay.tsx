'use client';

import { cn } from '@/lib/utils';
import type { Reaction } from '@/types';

interface ReactionDisplayProps {
  clueId: string;
  reactions: Reaction[];
  className?: string;
}

export function ReactionDisplay({ clueId, reactions, className }: ReactionDisplayProps) {
  // Filter reactions for this specific clue
  const clueReactions = reactions.filter((r) => r.clueId === clueId);

  if (clueReactions.length === 0) {
    return null;
  }

  // Group reactions by emoji and count them
  const reactionCounts = clueReactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn('flex gap-1 flex-wrap', className)}>
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-sm"
          title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-xs text-gray-600">{count}</span>}
        </span>
      ))}
    </div>
  );
}
