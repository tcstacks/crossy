import { useState } from 'react';
import { Smile, X } from 'lucide-react';

interface ReactionPickerProps {
  onReactionSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_EMOJIS = ['👍', '🎉', '🔥', '❤️', '😂', '🤔', '💪', '⭐'];

export function ReactionPicker({ onReactionSelect, isOpen, onClose }: ReactionPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReactionSelect(emoji);

    // Brief animation feedback before closing
    setTimeout(() => {
      setSelectedEmoji(null);
      onClose();
    }, 200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Picker Panel */}
      <div className="absolute bottom-14 right-0 z-50 bg-white rounded-2xl border-2 border-[#2A1E5C] shadow-[0_4px_0_#2A1E5C] p-4 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-[#7B61FF]" />
            <h3 className="font-display font-semibold text-[#2A1E5C] text-sm">
              React
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-4 gap-2">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className={`
                w-12 h-12 flex items-center justify-center text-2xl
                rounded-xl border-2 transition-all
                ${selectedEmoji === emoji
                  ? 'bg-[#7B61FF] border-[#7B61FF] scale-110'
                  : 'bg-[#F6F5FF] border-[#ECE9FF] hover:bg-[#F3F1FF] hover:border-[#7B61FF] hover:scale-105'
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
