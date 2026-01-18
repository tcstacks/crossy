'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn, getClueId } from '@/lib/utils';
import type { Clue } from '@/types';

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
    setSelectedCell,
    setSelectedClue,
  } = useGameStore();

  const clues = direction === 'across' ? puzzle?.cluesAcross : puzzle?.cluesDown;

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
      <div ref={listRef} className="flex-1 overflow-y-auto clue-list p-2">
        {clues
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((clue) => {
            const clueId = getClueId(direction, clue.number);
            const isSelected =
              selectedClue?.number === clue.number &&
              selectedClue?.direction === direction;
            const isCompleted = completedClues.includes(clueId);

            return (
              <div
                key={clue.number}
                data-clue-number={clue.number}
                className={cn(
                  'clue-item',
                  isSelected && 'selected',
                  isCompleted && 'completed'
                )}
                onClick={() => handleClueClick(clue)}
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold">{clue.number}.</span>
                  <span className="clue-text flex-1">{clue.text}</span>
                  {isCompleted && (
                    <span className="text-green-600 flex-shrink-0">✓</span>
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
        className="bg-gray-100 px-4 py-3 text-gray-500 text-center cursor-pointer"
        onClick={onExpand}
      >
        Tap a cell to start solving
      </div>
    );
  }

  return (
    <div
      className="bg-gray-100 px-4 py-3 cursor-pointer"
      onClick={onExpand}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary-600">
          {selectedClue.number}
          {selectedClue.direction === 'across' ? 'A' : 'D'}
        </span>
        <span className="flex-1 truncate">{selectedClue.text}</span>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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

  return (
    <div
      className={cn(
        'bottom-sheet max-h-[60vh]',
        isOpen ? 'open' : 'closed'
      )}
    >
      <div className="bottom-sheet-handle" onClick={onClose} />

      <div className="flex border-b">
        <button
          className={cn(
            'flex-1 py-3 font-medium',
            activeTab === 'across'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500'
          )}
          onClick={() => setActiveTab('across')}
        >
          Across
        </button>
        <button
          className={cn(
            'flex-1 py-3 font-medium',
            activeTab === 'down'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500'
          )}
          onClick={() => setActiveTab('down')}
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
