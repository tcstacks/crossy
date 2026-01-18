'use client';

import { useState, useRef, useEffect } from 'react';

interface HintMenuProps {
  onRevealLetter: () => void;
  onRevealWord: () => void;
  onCheckGrid: () => void;
  disabled?: boolean;
}

export default function HintMenu({
  onRevealLetter,
  onRevealWord,
  onCheckGrid,
  disabled = false,
}: HintMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 hover:bg-purple-50 rounded-full transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        title="Hint options"
      >
        <svg
          className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleAction(onRevealLetter)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-medium">Reveal Letter</div>
                <div className="text-xs text-gray-500">Show selected cell</div>
              </div>
            </button>

            <button
              onClick={() => handleAction(onRevealWord)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div className="font-medium">Reveal Word</div>
                <div className="text-xs text-gray-500">Fill entire answer</div>
              </div>
            </button>

            <div className="border-t border-gray-200 my-1" />

            <button
              onClick={() => handleAction(onCheckGrid)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <div>
                <div className="font-medium">Check Grid</div>
                <div className="text-xs text-gray-500">Highlight errors</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
