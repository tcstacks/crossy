'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { CluePanel, MobileClueDisplay, ClueBottomSheet } from '@/components/CluePanel';
import { ChatSidebar } from '@/components/Chat';
import { Timer } from '@/components/Timer';
import { PlayerList, PlayerPill } from '@/components/PlayerList';
import { ResultsModal } from '@/components/ResultsModal';
import { GameHeader } from '@/components/Header';
import { RaceLeaderboard } from '@/components/RaceLeaderboard';
import { RelayTurnIndicator } from '@/components/RelayTurnIndicator';
import { useGameStore } from '@/store/gameStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import type { PlayerResult } from '@/types';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClueSheet, setShowClueSheet] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<{
    solveTime: number;
    players: PlayerResult[];
  } | null>(null);

  const {
    isAuthenticated,
    user,
    puzzle,
    room,
    players,
    isHost,
    startTime,
    solveTime,
    messages,
    setRoom,
    setPlayers,
    setPuzzle,
    setCells,
    resetGame,
    hintsUsed,
    incrementHints,
    selectedCell,
  } = useGameStore();

  const {
    isConnected,
    connect,
    disconnect,
    joinRoom,
    updateCell,
    moveCursor,
    sendMessage,
    requestHint,
    startGame,
  } = useWebSocket();

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/room/${code}`);
    }
  }, [isAuthenticated, router, code]);

  // Load room and connect
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadRoom = async () => {
      try {
        // Get room info
        const response = await api.getRoomByCode(code);
        setRoom(response.room);
        setPlayers(response.players);

        // Join the room via API (pass user ID so host is recognized)
        const joinResponse = await api.joinRoom(
          response.room.id,
          user.displayName,
          false,
          user.id
        );
        if (joinResponse.puzzle) {
          setPuzzle(joinResponse.puzzle);
        }
        if (joinResponse.gridState) {
          setCells(joinResponse.gridState.cells);
        }

        // Connect WebSocket
        connect();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoom();

    return () => {
      disconnect();
    };
  }, [
    isAuthenticated,
    user,
    code,
    connect,
    disconnect,
    setRoom,
    setPlayers,
    setPuzzle,
    setCells,
  ]);

  // Join room via WebSocket once connected
  useEffect(() => {
    if (isConnected && user) {
      joinRoom(code, user.displayName);
    }
  }, [isConnected, code, user, joinRoom]);

  // Handle puzzle completion
  useEffect(() => {
    if (solveTime !== null) {
      setResults({
        solveTime,
        players: players.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          contribution: p.contribution,
          color: p.color,
        })),
      });
      setShowResults(true);
    }
  }, [solveTime, players]);

  // Track unread messages when chat is closed
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (!showChat && messages.length > prevMessageCountRef.current) {
      const newMessages = messages.length - prevMessageCountRef.current;
      setUnreadMessages((prev) => prev + newMessages);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, showChat]);

  const handleCellUpdate = useCallback(
    (x: number, y: number, value: string | null) => {
      updateCell(x, y, value);
    },
    [updateCell]
  );

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      moveCursor(x, y);
    },
    [moveCursor]
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const handleHintRequest = useCallback(() => {
    if (!selectedCell || !room?.config.hintsEnabled) return;
    requestHint('letter', selectedCell.x, selectedCell.y);
    incrementHints();
  }, [selectedCell, room, requestHint, incrementHints]);

  const handleStartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleHome = useCallback(() => {
    resetGame();
    router.push('/');
  }, [resetGame, router]);

  const handleRematch = useCallback(() => {
    setShowResults(false);
    // Would create a new room with same settings
    router.push('/room/create');
  }, [router]);

  const handleChatToggle = useCallback(() => {
    setShowChat((prev) => {
      if (!prev) {
        // Opening chat, clear unread count
        setUnreadMessages(0);
      }
      return !prev;
    });
  }, []);

  const handlePassTurn = useCallback(() => {
    // In relay mode, pass turn to next player
    if (room?.mode === 'relay' && players.length > 0) {
      const currentIndex = players.findIndex((p) => p.userId === currentTurnUserId);
      const nextIndex = (currentIndex + 1) % players.length;
      setCurrentTurnUserId(players[nextIndex].userId);
    }
  }, [room, players, currentTurnUserId]);

  // Initialize current turn for relay mode
  useEffect(() => {
    if (room?.mode === 'relay' && room?.state === 'active' && players.length > 0 && !currentTurnUserId) {
      setCurrentTurnUserId(players[0].userId);
    }
  }, [room, players, currentTurnUserId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-600">Joining room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="btn btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Lobby view
  if (room?.state === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
              <h1 className="font-bold text-lg">Room Lobby</h1>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          {/* Room Code */}
          <div className="card mb-6 text-center">
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              Room Code
            </h2>
            <div className="text-4xl font-mono font-bold tracking-widest text-primary-600">
              {room.code}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="mt-4 text-sm text-primary-600 hover:underline"
            >
              Copy to clipboard
            </button>
          </div>

          {/* Puzzle Info */}
          {puzzle && (
            <div className="card mb-6">
              <h3 className="font-bold mb-2">{puzzle.title}</h3>
              <p className="text-sm text-gray-600">
                {puzzle.gridWidth}×{puzzle.gridHeight} •{' '}
                {puzzle.difficulty.charAt(0).toUpperCase() +
                  puzzle.difficulty.slice(1)}
              </p>
            </div>
          )}

          {/* Players */}
          <div className="card mb-6">
            <h3 className="font-bold mb-4">
              Players ({players.length}/{room.config?.maxPlayers ?? 8})
            </h3>
            <PlayerList />
          </div>

          {/* Settings Summary */}
          <div className="card mb-6">
            <h3 className="font-bold mb-4">Room Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Mode:</span>{' '}
                <span className="font-medium capitalize">{room.mode}</span>
              </div>
              <div>
                <span className="text-gray-500">Timer:</span>{' '}
                <span className="font-medium capitalize">
                  {room.config?.timerMode ?? 'none'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Hints:</span>{' '}
                <span className="font-medium">
                  {room.config?.hintsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Visibility:</span>{' '}
                <span className="font-medium">
                  {room.config?.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          </div>

          {/* Start Button (Host Only) */}
          {isHost && (
            <button
              onClick={handleStartGame}
              className="btn btn-primary w-full text-lg py-4"
            >
              Start Game
            </button>
          )}

          {!isHost && (
            <p className="text-center text-gray-500">
              Waiting for host to start the game...
            </p>
          )}
        </main>
      </div>
    );
  }

  // Active game view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GameHeader
        title={puzzle?.title}
        showTimer
        timerComponent={<Timer startTime={startTime} />}
        showPlayers
        playersComponent={<PlayerPill onClick={() => setShowPlayers(true)} />}
        showChat
        onChatToggle={handleChatToggle}
        chatUnreadCount={unreadMessages}
        showHints
        onHintRequest={handleHintRequest}
        hintsEnabled={room?.config.hintsEnabled}
        roomMode={room?.mode}
        currentTurnUserId={currentTurnUserId}
      />

      {/* Relay Turn Indicator - Only show in relay mode */}
      {room?.mode === 'relay' && (
        <RelayTurnIndicator
          currentTurnUserId={currentTurnUserId}
          onPassTurn={handlePassTurn}
        />
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Clue Panel - Desktop */}
        <aside className="hidden lg:block w-80 border-r bg-white overflow-y-auto">
          <div className="h-1/2 border-b">
            <CluePanel direction="across" />
          </div>
          <div className="h-1/2">
            <CluePanel direction="down" />
          </div>
        </aside>

        {/* Grid Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Clue Display */}
          <div className="lg:hidden">
            <MobileClueDisplay onExpand={() => setShowClueSheet(true)} />
          </div>

          {/* Grid Container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <CrosswordGrid
              onCellUpdate={handleCellUpdate}
              onCursorMove={handleCursorMove}
            />
          </div>
        </div>

        {/* Race Leaderboard - Only show in race mode */}
        {room?.mode === 'race' && (
          <aside className="hidden lg:block w-80 border-l bg-gray-50 overflow-y-auto p-4">
            <RaceLeaderboard />
          </aside>
        )}
      </main>

      {/* Mobile Clue Bottom Sheet */}
      <ClueBottomSheet
        isOpen={showClueSheet}
        onClose={() => setShowClueSheet(false)}
      />

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onSendMessage={handleSendMessage}
      />

      {/* Race Leaderboard - Mobile floating version */}
      {room?.mode === 'race' && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <RaceLeaderboard />
        </div>
      )}

      {/* Players Modal (Mobile) */}
      {showPlayers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-lg">Players</h2>
              <button
                onClick={() => setShowPlayers(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <PlayerList />
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {results && (
        <ResultsModal
          isOpen={showResults}
          solveTime={results.solveTime}
          players={results.players}
          onClose={() => setShowResults(false)}
          onRematch={handleRematch}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
