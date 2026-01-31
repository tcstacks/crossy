import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Copy,
  Crown,
  LogOut,
  Loader2,
  Check,
} from 'lucide-react';
import { roomApi, getToken } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Header } from '@/components/Header';
import type { Room, RoomPlayer, PlayerJoinedPayload, PlayerLeftPayload, GameStartedPayload, RoomClosedPayload } from '../types';

// Player colors for visual distinction
const PLAYER_COLORS = [
  '#7B61FF', // Primary purple
  '#FF4D6A', // Pink/red
  '#4DFFDF', // Cyan
  '#FFD93D', // Yellow
  '#FF6B9D', // Hot pink
  '#6BCF7F', // Green
  '#9D6BFF', // Light purple
  '#FF9D6B', // Orange
];

function RoomLobbyPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);

  const token = getToken();

  // Initialize WebSocket connection
  const { connectionState, on } = useWebSocket({
    roomCode: roomCode || '',
    token: token || '',
    autoConnect: !!roomCode && !!token,
  });

  // Fetch initial room data
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomCode || !token) {
        navigate('/', { state: { showAuth: true } });
        return;
      }

      try {
        setLoading(true);
        const roomData = await roomApi.getRoomByCode({ code: roomCode });
        setRoom(roomData);
        setPlayers(roomData.players);

        // Get current user ID from room data
        // The current user is the one who just joined/created the room
        // We'll identify them by checking who has the current token
        // For now, we'll use a simple approach - the last player or host
        const hostPlayer = roomData.players.find(p => p.isHost);
        if (hostPlayer) {
          setCurrentUserId(hostPlayer.userId);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch room:', err);
        const errorMessage = err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to load room. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomCode, token, navigate]);

  // WebSocket event handlers
  useEffect(() => {
    if (!roomCode || connectionState !== 'connected') {
      return;
    }

    // Player joined
    const unsubscribePlayerJoined = on<PlayerJoinedPayload>('player:joined', (payload) => {
      setPlayers(prev => {
        // Avoid duplicates
        if (prev.some(p => p.userId === payload.player.userId)) {
          return prev;
        }
        return [...prev, payload.player];
      });
    });

    // Player left
    const unsubscribePlayerLeft = on<PlayerLeftPayload>('player:left', (payload) => {
      setPlayers(prev => prev.filter(p => p.userId !== payload.userId));
    });

    // Game started
    const unsubscribeGameStarted = on<GameStartedPayload>('game:started', () => {
      // Navigate to gameplay page
      navigate(`/room/${roomCode}/play`);
    });

    // Room closed
    const unsubscribeRoomClosed = on<RoomClosedPayload>('room:closed', (payload) => {
      // Navigate back to home with message
      navigate('/', {
        state: {
          message: payload.reason || 'The room has been closed by the host.'
        }
      });
    });

    return () => {
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribeGameStarted();
      unsubscribeRoomClosed();
    };
  }, [roomCode, connectionState, on, navigate]);

  const handleCopyCode = async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleStartGame = async () => {
    if (!room || !currentUserId) return;

    // Check if current user is host
    const isHost = players.find(p => p.userId === currentUserId)?.isHost;
    if (!isHost) return;

    try {
      await roomApi.startRoom({ roomId: room.id });
      // The navigation will happen via WebSocket event
    } catch (err: unknown) {
      console.error('Failed to start game:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to start game. Please try again.';
      setError(errorMessage);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !currentUserId) return;

    setLeavingRoom(true);

    try {
      const isHost = players.find(p => p.userId === currentUserId)?.isHost;

      if (isHost) {
        // Close the room if host
        await roomApi.closeRoom({ roomId: room.id });
      }

      // Navigate back to home
      navigate('/');
    } catch (err: unknown) {
      console.error('Failed to leave room:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to leave room. Please try again.';
      setError(errorMessage);
      setLeavingRoom(false);
    }
  };

  const getPlayerColor = (index: number): string => {
    return PLAYER_COLORS[index % PLAYER_COLORS.length];
  };

  const isHost = currentUserId && players.find(p => p.userId === currentUserId)?.isHost;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5FF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#7B61FF] animate-spin" />
          <p className="font-display text-[#6B5CA8]">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#F6F5FF] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="crossy-card p-6 text-center">
            <p className="font-display text-[#FF4D6A] mb-4">{error}</p>
            <Link
              to="/"
              className="inline-block py-3 px-6 bg-[#7B61FF] text-white font-display font-bold rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <Header />
      <div className="h-16" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-3xl text-[#2A1E5C] mb-2">
            Room Lobby
          </h1>
          <p className="font-display text-[#6B5CA8]">
            Waiting for players to join...
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Room Code Card */}
          <div className="crossy-card p-6">
            <h2 className="font-display font-semibold text-[#2A1E5C] mb-4">
              Room Code
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#F3F1FF] rounded-xl border-2 border-[#7B61FF] px-4 py-3">
                <p className="font-display font-bold text-2xl text-[#2A1E5C] text-center tracking-wider">
                  {roomCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="w-12 h-12 flex items-center justify-center bg-[#7B61FF] text-white rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all"
              >
                {copySuccess ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            {copySuccess && (
              <p className="font-display text-sm text-[#6B5CA8] text-center mt-2">
                Code copied!
              </p>
            )}
          </div>

          {/* Connection Status */}
          <div className="crossy-card p-6">
            <h2 className="font-display font-semibold text-[#2A1E5C] mb-4">
              Connection Status
            </h2>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-[#6BCF7F]'
                    : connectionState === 'connecting'
                    ? 'bg-[#FFD93D]'
                    : 'bg-[#FF4D6A]'
                }`}
              />
              <p className="font-display text-[#2A1E5C]">
                {connectionState === 'connected'
                  ? 'Connected'
                  : connectionState === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="crossy-card p-6 mb-6">
          <h2 className="font-display font-semibold text-[#2A1E5C] mb-4">
            Players ({players.length}/{room?.maxPlayers || 8})
          </h2>
          <div className="grid gap-3">
            {players.map((player, index) => (
              <div
                key={player.userId}
                className="flex items-center gap-3 p-3 bg-[#F3F1FF] rounded-xl border-2 border-[#ECE9FF]"
              >
                {/* Player Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-white text-lg"
                  style={{ backgroundColor: getPlayerColor(index) }}
                >
                  {player.username.charAt(0).toUpperCase()}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-[#2A1E5C]">
                      {player.username}
                    </p>
                    {player.isHost && (
                      <Crown className="w-4 h-4 text-[#FFD93D]" />
                    )}
                  </div>
                  <p className="font-display text-sm text-[#6B5CA8]">
                    {player.userId === currentUserId ? 'You' : 'Player'}
                  </p>
                </div>

                {/* Status Indicator */}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getPlayerColor(index) }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Game Info */}
        {room && (
          <div className="crossy-card p-6 mb-6">
            <h2 className="font-display font-semibold text-[#2A1E5C] mb-4">
              Game Settings
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-display text-[#6B5CA8]">Status:</span>
                <span className="font-display font-semibold text-[#2A1E5C] capitalize">
                  {room.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-display text-[#6B5CA8]">Puzzle ID:</span>
                <span className="font-display font-semibold text-[#2A1E5C]">
                  {room.puzzleId.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="crossy-card p-4 bg-[#FF4D6A]/10 border-2 border-[#FF4D6A] mb-6">
            <p className="font-display text-sm text-[#FF4D6A] text-center">
              {error}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="w-full py-4 bg-[#7B61FF] text-white font-display font-bold text-lg rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_0_#2A1E5C] disabled:hover:translate-y-0"
            >
              Start Game
            </button>
          ) : (
            <div className="w-full py-4 bg-[#F3F1FF] text-[#6B5CA8] font-display font-bold text-lg rounded-xl border-2 border-[#ECE9FF] text-center">
              Waiting for host to start...
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            disabled={leavingRoom}
            className="w-full py-4 bg-white text-[#FF4D6A] font-display font-bold text-lg rounded-xl border-2 border-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {leavingRoom ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                Leave Room
              </>
            )}
          </button>
        </div>

        {/* Crossy Mascot */}
        <div className="flex justify-center mt-8">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                {isHost
                  ? 'Start when everyone is ready!'
                  : 'Get ready for some crossword fun!'}
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src="/crossy-popcorn.png"
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default RoomLobbyPage;
