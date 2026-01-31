import { useEffect, useState } from 'react';
import type { Reaction } from '../types/websocket';

interface ReactionAnimationProps {
  reactions: Reaction[];
}

interface AnimatingReaction extends Reaction {
  isAnimating: boolean;
}

export function ReactionAnimation({ reactions }: ReactionAnimationProps) {
  const [animatingReactions, setAnimatingReactions] = useState<AnimatingReaction[]>([]);

  useEffect(() => {
    // Add new reactions to the animation queue
    reactions.forEach((reaction) => {
      // Check if this reaction is already being animated
      const exists = animatingReactions.some((r) => r.id === reaction.id);
      if (!exists) {
        setAnimatingReactions((prev) => [
          ...prev,
          { ...reaction, isAnimating: true }
        ]);

        // Remove reaction after animation completes (1.5s)
        setTimeout(() => {
          setAnimatingReactions((prev) =>
            prev.filter((r) => r.id !== reaction.id)
          );
        }, 1500);
      }
    });
  }, [reactions, animatingReactions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {animatingReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute animate-reaction-float"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'reactionFloat 1.5s ease-out forwards',
          }}
        >
          {/* Emoji */}
          <div className="text-5xl mb-2 text-center">
            {reaction.emoji}
          </div>

          {/* Username */}
          <div className="bg-[#2A1E5C] text-white px-3 py-1 rounded-full font-display text-xs font-semibold whitespace-nowrap">
            {reaction.username}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes reactionFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          40% {
            transform: translate(-50%, -60%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
