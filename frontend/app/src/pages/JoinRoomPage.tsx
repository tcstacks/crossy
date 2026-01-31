import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Volume2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { roomApi, getToken } from '../lib/api';

function JoinRoomPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check if user is authenticated
    const token = getToken();
    if (!token) {
      navigate('/', { state: { showAuth: true } });
      return;
    }

    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, [navigate]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitized.length === 0) {
      // Handle backspace/delete
      const newCode = [...roomCode];
      newCode[index] = '';
      setRoomCode(newCode);
      setError(null);

      // Move to previous input if deleting
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Handle paste or multiple character input
    if (sanitized.length > 1) {
      const chars = sanitized.split('').slice(0, 6);
      const newCode = [...roomCode];

      chars.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });

      setRoomCode(newCode);
      setError(null);

      // Focus next empty input or last input
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Handle single character input
    const newCode = [...roomCode];
    newCode[index] = sanitized;
    setRoomCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (index < 5 && sanitized.length === 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && roomCode[index] === '' && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && roomCode.every(char => char !== '')) {
      handleJoinRoom(e);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = roomCode.join('');
    if (code.length !== 6) {
      setError('Please enter a complete 6-character room code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // First, verify the room exists and get its details
      await roomApi.getRoomByCode({ code });

      // Then join the room
      await roomApi.joinRoom({ code });

      // Navigate to room lobby
      navigate(`/room/${code}`);
    } catch (err: unknown) {
      console.error('Failed to join room:', err);

      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to join room. Please try again.';

      // Provide more specific error messages
      if (errorMessage.includes('not found')) {
        setError('Room not found. Please check the code and try again.');
      } else if (errorMessage.includes('full')) {
        setError('This room is full. Please try a different room.');
      } else if (errorMessage.includes('closed')) {
        setError('This room is no longer available.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FF]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECE9FF]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <img src="/crossy-small.png" alt="Crossy" className="w-8 h-8" />
              <span className="font-display font-semibold text-[#2A1E5C]">Crossy</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Home className="w-5 h-5" />
              </Link>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-[#2A1E5C] mb-2">
            Join a Room
          </h1>
          <p className="font-display text-[#6B5CA8]">
            Enter the room code to join your friends!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinRoom} className="space-y-6">
          {/* Room Code Input */}
          <div className="crossy-card p-8">
            <label className="block font-display font-semibold text-[#2A1E5C] mb-4 text-center">
              Room Code
            </label>

            {/* 6-Character Code Input */}
            <div className="flex justify-center gap-2 mb-6">
              {roomCode.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={6}
                  value={char}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 text-center text-2xl font-display font-bold text-[#2A1E5C] border-2 border-[#7B61FF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B61FF] focus:border-transparent bg-white"
                  disabled={loading}
                />
              ))}
            </div>

            {/* Helper Text */}
            <p className="font-display text-sm text-[#6B5CA8] text-center">
              Enter the 6-character code shared by your host
            </p>
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
            disabled={loading || roomCode.some(char => char === '')}
            className="w-full py-4 bg-[#7B61FF] text-white font-display font-bold text-lg rounded-xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] hover:shadow-[0_2px_0_#2A1E5C] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_0_#2A1E5C] disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining Room...
              </>
            ) : (
              <>
                Join Room
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ECE9FF]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#F6F5FF] font-display text-[#6B5CA8]">
                or
              </span>
            </div>
          </div>

          {/* Create Room Link */}
          <Link
            to="/create-room"
            className="block w-full py-4 bg-white text-[#7B61FF] font-display font-bold text-lg rounded-xl border-2 border-[#7B61FF] hover:bg-[#F3F1FF] transition-colors text-center"
          >
            Create Room Instead
          </Link>
        </form>

        {/* Crossy Mascot */}
        <div className="flex justify-center mt-8">
          <div className="flex items-end gap-3">
            <div className="relative bg-white px-5 py-3 rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C]">
              <p className="font-display text-sm text-[#2A1E5C]">
                Ready to join the fun?
              </p>
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-[#2A1E5C] transform rotate-45" />
            </div>
            <img
              src="/crossy-cheer.png"
              alt="Crossy"
              className="w-16 h-16"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default JoinRoomPage;
