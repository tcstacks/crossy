'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🤔', '💡'];

interface EmojiPickerProps {
  clueId: string;
  currentUserEmoji?: string;
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ clueId, currentUserEmoji, onEmojiSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    if (currentUserEmoji === emoji) {
      // Remove reaction if clicking the same emoji
      onEmojiSelect('');
    } else {
      onEmojiSelect(emoji);
    }
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
        title="Add reaction"
        aria-label="Add reaction"
      >
        {currentUserEmoji || '😊'}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-50">
          {ALLOWED_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className={cn(
                'text-xl p-2 rounded hover:bg-gray-100 transition-colors',
                currentUserEmoji === emoji && 'bg-blue-100 ring-2 ring-blue-500'
              )}
              title={`React with ${emoji}`}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
