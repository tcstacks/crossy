'use client';

import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, isAuthenticated, logout } = useGameStore();

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            C
          </div>
          <span className="font-bold text-xl">CrossPlay</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/puzzle"
            className="text-gray-600 hover:text-gray-900 font-medium hidden sm:block"
          >
            Today&apos;s Puzzle
          </Link>
          <Link
            href="/archive"
            className="text-gray-600 hover:text-gray-900 font-medium hidden sm:block"
          >
            Archive
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block font-medium">
                  {user?.displayName}
                </span>
              </Link>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn btn-primary">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

interface GameHeaderProps {
  title?: string;
  showTimer?: boolean;
  timerComponent?: React.ReactNode;
  showPlayers?: boolean;
  playersComponent?: React.ReactNode;
  showChat?: boolean;
  onChatToggle?: () => void;
  showHints?: boolean;
  onHintRequest?: () => void;
  hintsEnabled?: boolean;
}

export function GameHeader({
  title,
  showTimer,
  timerComponent,
  showPlayers,
  playersComponent,
  showChat,
  onChatToggle,
  showHints,
  onHintRequest,
  hintsEnabled = true,
}: GameHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          {title && (
            <h1 className="font-bold text-lg truncate max-w-[200px] sm:max-w-none">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showTimer && timerComponent}

          {showPlayers && playersComponent}

          {showHints && hintsEnabled && (
            <button
              onClick={onHintRequest}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Get a hint"
            >
              <svg
                className="w-5 h-5 text-gray-600"
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
          )}

          {showChat && (
            <button
              onClick={onChatToggle}
              className="p-2 hover:bg-gray-100 rounded-lg relative"
              title="Open chat"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
