'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn, getClueId } from '@/lib/utils';
import type { Clue } from '@/types';
import { EmojiPicker } from './EmojiPicker';
import { ReactionDisplay } from './ReactionDisplay';
import { useWebSocket } from '@/hooks/useWebSocket';

interface CluePanelProps {
  direction: 'across' | 'down';
  onClueClick?: (clue: Clue) => void;
}

export function CluePanel({ direction, onClueClick }: CluePanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const {
    puzzle,
    selectedClue,
    completedClues,
    reactions,
    user,
    room,
    setSelectedCell,
    setSelectedClue,
  } = useGameStore();

  const { sendReaction } = useWebSocket(room?.code);
  const clues = direction === 'across' ? puzzle?.cluesAcross : puzzle?.cluesDown;

  const handleReaction = useCallback(
    (clueId: string, emoji: string) => {
      sendReaction(clueId, emoji);
    },
    [sendReaction]
  );

  const handleClueClick = useCallback(
    (clue: Clue) => {
      setSelectedCell({
        x: clue.positionX,
        y: clue.positionY,
        direction,
      });
      setSelectedClue(clue);
      onClueClick?.(clue);
    },
    [direction, setSelectedCell, setSelectedClue, onClueClick]
  );

  // Scroll to selected clue
  useEffect(() => {
    if (selectedClue && selectedClue.direction === direction && listRef.current) {
      const clueElement = listRef.current.querySelector(
        `[data-clue-number="${selectedClue.number}"]`
      );
      if (clueElement) {
        clueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedClue, direction]);

  if (!clues) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-bold text-lg px-4 py-2 bg-gray-100 capitalize sticky top-0 z-10">
        {direction}
      </h3>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto clue-list p-2"
        role="list"
        aria-label={`${direction} clues`}
      >
        {clues
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((clue) => {
            const clueId = getClueId(direction, clue.number);
            const isSelected =
              selectedClue?.number === clue.number &&
              selectedClue?.direction === direction;
            const isCompleted = completedClues.includes(clueId);

            const currentUserReaction = reactions.find(
              (r) => r.clueId === clueId && r.userId === user?.id
            );

            return (
              <div
                key={clue.number}
                data-clue-number={clue.number}
                className={cn(
                  'clue-item',
                  isSelected && 'selected',
                  isCompleted && 'completed'
                )}
                role="listitem"
              >
                <div
                  className="flex items-start gap-2"
                  onClick={() => handleClueClick(clue)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Clue ${clue.number}: ${clue.text}${isCompleted ? ', completed' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClueClick(clue);
                    }
                  }}
                >
                  <span className="font-bold" aria-hidden="true">{clue.number}.</span>
                  <span className="clue-text flex-1" aria-hidden="true">{clue.text}</span>
                  {isCompleted && (
                    <span className="text-green-600 flex-shrink-0" aria-hidden="true">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <ReactionDisplay clueId={clueId} reactions={reactions} />
                  {room && (
                    <EmojiPicker
                      clueId={clueId}
                      currentUserEmoji={currentUserReaction?.emoji}
                      onEmojiSelect={(emoji) => handleReaction(clueId, emoji)}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

interface MobileClueDisplayProps {
  onExpand?: () => void;
}

export function MobileClueDisplay({ onExpand }: MobileClueDisplayProps) {
  const { selectedClue } = useGameStore();

  if (!selectedClue) {
    return (
      <div
        className="bg-gray-100 px-4 py-3 text-gray-600 text-center cursor-pointer min-h-[44px] flex items-center justify-center"
        onClick={onExpand}
        role="button"
        tabIndex={0}
        aria-label="Show clue list"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExpand?.();
          }
        }}
      >
        Tap a cell to start solving
      </div>
    );
  }

  return (
    <div
      className="bg-gray-100 px-4 py-3 cursor-pointer min-h-[44px]"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      aria-label={`Current clue: ${selectedClue.number} ${selectedClue.direction === 'across' ? 'Across' : 'Down'}, ${selectedClue.text}. Tap to expand clue list`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand?.();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary-600">
          {selectedClue.number}
          {selectedClue.direction === 'across' ? 'A' : 'D'}
        </span>
        <span className="flex-1 truncate" aria-hidden="true">{selectedClue.text}</span>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

interface ClueBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClueBottomSheet({ isOpen, onClose }: ClueBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<'across' | 'down'>('across');
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const newY = e.touches[0].clientY;
    if (newY > startY) {
      setCurrentY(newY);
    }
  }, [isDragging, startY]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    const deltaY = currentY - startY;
    if (deltaY > 100) {
      onClose();
    }
    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  }, [isDragging, currentY, startY, onClose]);

  const translateY = isDragging && currentY > startY ? currentY - startY : 0;

  return (
    <div
      className={cn(
        'bottom-sheet max-h-[60vh]',
        isOpen ? 'open' : 'closed'
      )}
      role="dialog"
      aria-label="Crossword clues"
      aria-modal="false"
      style={{
        transform: `translateY(${isOpen ? translateY : '100%'}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div
        className="bottom-sheet-handle"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close clue panel"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
      />

      <div className="flex border-b" role="tablist" aria-label="Clue direction">
        <button
          className={cn(
            'flex-1 py-3 font-medium',
            activeTab === 'across'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600'
          )}
          onClick={() => setActiveTab('across')}
          role="tab"
          aria-selected={activeTab === 'across'}
          aria-controls="across-clues"
        >
          Across
        </button>
        <button
          className={cn(
            'flex-1 py-3 font-medium',
            activeTab === 'down'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600'
          )}
          onClick={() => setActiveTab('down')}
          role="tab"
          aria-selected={activeTab === 'down'}
          aria-controls="down-clues"
        >
          Down
        </button>
      </div>

      <div className="h-[40vh] overflow-hidden">
        <CluePanel direction={activeTab} onClueClick={onClose} />
      </div>
    </div>
  );
}
