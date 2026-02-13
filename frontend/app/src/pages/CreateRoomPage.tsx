import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  Zap,
  RefreshCw,
  Calendar,
  Shuffle,
  Archive,
  Loader2,
} from 'lucide-react';
import { roomApi, getToken } from '../lib/api';
import { puzzleApi } from '../lib/api';
import { Header } from '@/components/Header';
import type { Puzzle } from '../types/api';

type GameMode = 'collaborative' | 'race' | 'relay';
type PuzzleSelection = 'today' | 'random' | 'archive';

interface GameModeOption {
  id: GameMode;
  name: string;
  description: string;
  icon: typeof Users;
}

const gameModes: GameModeOption[] = [
  {
    id: 'collaborative',
    name: 'Collaborative',
    description: 'Work together to solve the puzzle',
    icon: Users,
  },
  {
    id: 'race',
    name: 'Race',
    description: 'First to finish wins',
    icon: Zap,
  },
  {
    id: 'relay',
    name: 'Relay',
    description: 'Take turns solving',
    icon: RefreshCw,
  },
];

function CreateRoomPage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('collaborative');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [puzzleSelection, setPuzzleSelection] = useState<PuzzleSelection>('today');
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayPuzzle, setTodayPuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = getToken();
    if (!token) {
      navigate('/', { state: { showAuth: true } });
      return;
    }

    // Fetch today's puzzle to have it ready
    const fetchTodayPuzzle = async () => {
      try {
        const puzzle = await puzzleApi.getTodayPuzzle();
        setTodayPuzzle(puzzle);
        setSelectedPuzzleId(puzzle.id);
      } catch (err) {
        console.error('Failed to fetch today\'s puzzle:', err);
      }
    };

    fetchTodayPuzzle();
  }, [navigate]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Determine puzzle ID based on selection
      let puzzleId = selectedPuzzleId;

      if (puzzleSelection === 'random') {
        const randomPuzzle = await puzzleApi.getRandomPuzzle();
        puzzleId = randomPuzzle.id;
      } else if (puzzleSelection === 'archive') {
        // For now, we'll use a random puzzle if archive is selected
        // In a full implementation, this would open a modal to select from archive
        const randomPuzzle = await puzzleApi.getRandomPuzzle();
        puzzleId = randomPuzzle.id;
      }

      if (!puzzleId) {
        throw new Error('No puzzle available to start a room');
      }

      // Create the room
      const response = await roomApi.createRoom({
        puzzleId,
        mode: gameMode,
        config: {
          maxPlayers,
          isPublic: false,
          spectatorMode: false,
          timerMode: 'none',
          hintsEnabled: false,
        },
      });

      // Navigate to room lobby
      navigate(`/room/${response.room.code}`);
    } catch (err: unknown) {
      console.error('Failed to create room:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to create room. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      <Header />
      <div className="h-16" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-[#2A1E5C] mb-2">
            Create a Room
          </h1>
          <p className="font-display text-[#6B5CA8]">
            Set up a multiplayer game and invite your friends!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateRoom} className="space-y-6">
          {/* Room Name */}
          <div className="crossy-card p-6">
            <label className="block font-display font-semibold text-[#2A1E5C] mb-3">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter a room name (optional)"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#7B61FF] font-display text-[#2A1E5C] placeholder-[#A89DCF] focus:outline-none focus:ring-2 focus:ring-[#7B61FF] focus:border-transparent"
            />
          </div>

          {/* Game Mode */}
          <div className="crossy-card p-6">
            <label className="block font-display font-semibold text-[#2A1E5C] mb-3">
              Game Mode
            </label>
            <div className="grid gap-3">
              {gameModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGameMode(mode.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all text-left
                      ${gameMode === mode.id
                        ? 'bg-[#7B61FF] border-[#7B61FF] shadow-[0_4px_0_#2A1E5C]'
                        : 'bg-white border-[#ECE9FF] hover:border-[#7B61FF]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${gameMode === mode.id ? 'bg-white/20' : 'bg-[#F3F1FF]'}
                      `}>
                        <Icon className={`w-5 h-5 ${gameMode === mode.id ? 'text-white' : 'text-[#7B61FF]'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-display font-semibold mb-1 ${gameMode === mode.id ? 'text-white' : 'text-[#2A1E5C]'}`}>
                          {mode.name}
                        </h3>
                        <p className={`font-display text-sm ${gameMode === mode.id ? 'text-white/90' : 'text-[#6B5CA8]'}`}>
                          {mode.description}
                        </p>
                      </div>
                      {gameMode === mode.id && (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-4 h-4 text-[#7B61FF]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Players */}
          <div className="crossy-card p-6">
            <label className="block font-display font-semibold text-[#2A1E5C] mb-3">
              Max Players
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="2"
                max="8"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="flex-1 accent-[#7B61FF]"
              />
              <div className="w-16 h-12 flex items-center justify-center bg-[#F3F1FF] rounded-xl border-2 border-[#7B61FF]">
                <span className="font-display font-bold text-xl text-[#2A1E5C]">
                  {maxPlayers}
                </span>
              </div>
            </div>
          </div>

          {/* Puzzle Selection */}
          <div className="crossy-card p-6">
            <label className="block font-display font-semibold text-[#2A1E5C] mb-3">
              Choose Puzzle
            </label>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setPuzzleSelection('today');
                  setSelectedPuzzleId(todayPuzzle?.id);
                }}
                className={`
                  relative p-4 rounded-xl border-2 transition-all text-left
                  ${puzzleSelection === 'today'
                    ? 'bg-[#7B61FF] border-[#7B61FF] shadow-[0_4px_0_#2A1E5C]'
                    : 'bg-white border-[#ECE9FF] hover:border-[#7B61FF]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${puzzleSelection === 'today' ? 'bg-white/20' : 'bg-[#F3F1FF]'}
                  `}>
                    <Calendar className={`w-5 h-5 ${puzzleSelection === 'today' ? 'text-white' : 'text-[#7B61FF]'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-display font-semibold ${puzzleSelection === 'today' ? 'text-white' : 'text-[#2A1E5C]'}`}>
                      Today's Puzzle
                    </h3>
                    {todayPuzzle && (
                      <p className={`font-display text-sm ${puzzleSelection === 'today' ? 'text-white/90' : 'text-[#6B5CA8]'}`}>
                        {todayPuzzle.difficulty.charAt(0).toUpperCase() + todayPuzzle.difficulty.slice(1)} • {todayPuzzle.gridWidth}×{todayPuzzle.gridHeight}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPuzzleSelection('random')}
                className={`
                  relative p-4 rounded-xl border-2 transition-all text-left
                  ${puzzleSelection === 'random'
                    ? 'bg-[#7B61FF] border-[#7B61FF] shadow-[0_4px_0_#2A1E5C]'
                    : 'bg-white border-[#ECE9FF] hover:border-[#7B61FF]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${puzzleSelection === 'random' ? 'bg-white/20' : 'bg-[#F3F1FF]'}
                  `}>
                    <Shuffle className={`w-5 h-5 ${puzzleSelection === 'random' ? 'text-white' : 'text-[#7B61FF]'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-display font-semibold ${puzzleSelection === 'random' ? 'text-white' : 'text-[#2A1E5C]'}`}>
                      Random Puzzle
                    </h3>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPuzzleSelection('archive')}
                className={`
                  relative p-4 rounded-xl border-2 transition-all text-left
                  ${puzzleSelection === 'archive'
                    ? 'bg-[#7B61FF] border-[#7B61FF] shadow-[0_4px_0_#2A1E5C]'
                    : 'bg-white border-[#ECE9FF] hover:border-[#7B61FF]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${puzzleSelection === 'archive' ? 'bg-white/20' : 'bg-[#F3F1FF]'}
                  `}>
                    <Archive className={`w-5 h-5 ${puzzleSelection === 'archive' ? 'text-white' : 'text-[#7B61FF]'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-display font-semibold ${puzzleSelection === 'archive' ? 'text-white' : 'text-[#2A1E5C]'}`}>
                      Choose from Archive
                    </h3>
                    <p className={`font-display text-sm ${puzzleSelection === 'archive' ? 'text-white/90' : 'text-[#6B5CA8]'}`}>
                      Pick any past puzzle
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="crossy-card p-4 bg-[#FF4D6A]/10 border-2 border-[#FF4D6A]">
              <p className="font-display text-sm text-[#FF4D6A] text-center">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#7B61FF] text-white font-display font-bold text-lg rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_0_#2A1E5C] disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Room...
              </span>
            ) : (
              'Create Room'
            )}
          </button>
        </form>

        {/* Crossy Mascot */}
        <div className="flex justify-center mt-8">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                Ready to play with friends?
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src="/crossy-chat.png"
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default CreateRoomPage;
