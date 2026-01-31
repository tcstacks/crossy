import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ChevronRight } from 'lucide-react';
import type { ChatMessage, ChatMessagePayload, TypingIndicatorPayload } from '../types/websocket';

interface ChatPanelProps {
  roomCode: string;
  currentUserId: string | null;
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  on: <T = unknown>(messageType: string, handler: (payload: T) => void) => () => void;
}

export function ChatPanel({
  roomCode,
  currentUserId,
  onSendMessage,
  onTyping,
  on,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto-scroll to newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [messages, isCollapsed]);

  // Listen for new chat messages
  useEffect(() => {
    const unsubscribe = on<ChatMessagePayload>('chat:message', (payload) => {
      setMessages((prev) => [...prev, payload.message]);

      // Increment unread count if collapsed and not own message
      if (isCollapsed && payload.message.userId !== currentUserId) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [on, isCollapsed, currentUserId]);

  // Listen for typing indicators
  useEffect(() => {
    const unsubscribe = on<TypingIndicatorPayload>('chat:typing', (payload) => {
      // Ignore own typing indicator
      if (payload.userId === currentUserId) return;

      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (payload.isTyping) {
          newSet.add(payload.username);
        } else {
          newSet.delete(payload.username);
        }
        return newSet;
      });
    });

    return unsubscribe;
  }, [on, currentUserId]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    onTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    onSendMessage(inputValue.trim());
    setInputValue('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping(false);

    // Focus input after sending
    inputRef.current?.focus();
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle panel and reset unread count
  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      setUnreadCount(0);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get typing indicator text
  const getTypingText = () => {
    const users = Array.from(typingUsers);
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users.length} people are typing...`;
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-6 bottom-6 z-40">
        <button
          onClick={togglePanel}
          className="relative bg-[#7B61FF] text-white p-4 rounded-full shadow-lg hover:bg-[#6B51EF] transition-colors border-2 border-[#2A1E5C]"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-[#FF4D6A] text-white text-xs font-display font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="crossy-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[#ECE9FF]">
        <img src="/crossy-chat.png" alt="Chat" className="w-8 h-8" />
        <div className="flex-1">
          <h2 className="font-display font-semibold text-[#2A1E5C]">Chat</h2>
          <p className="font-display text-xs text-[#6B5CA8]">Room: {roomCode}</p>
        </div>
        <button
          onClick={togglePanel}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5CA8] hover:bg-[#ECE9FF] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <img src="/crossy-chat.png" alt="Chat" className="w-16 h-16 mb-3 opacity-50" />
            <p className="font-display text-sm text-[#6B5CA8]">
              No messages yet.
              <br />
              Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.userId === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-display text-xs font-semibold text-[#6B5CA8]">
                        {isOwn ? 'You' : msg.username}
                      </span>
                      <span className="font-display text-xs text-[#6B5CA8]/60">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl font-display text-sm ${
                        isOwn
                          ? 'bg-[#7B61FF] text-white'
                          : 'bg-[#F3F1FF] text-[#2A1E5C] border border-[#ECE9FF]'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {getTypingText() && (
        <div className="px-4 py-2 border-t border-[#ECE9FF]">
          <p className="font-display text-xs text-[#6B5CA8] italic">
            {getTypingText()}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#ECE9FF]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl border-2 border-[#ECE9FF] bg-[#F6F5FF] text-[#2A1E5C] font-display text-sm placeholder:text-[#6B5CA8]/50 focus:outline-none focus:border-[#7B61FF] transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#7B61FF] text-white hover:bg-[#6B51EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#2A1E5C] shadow-[0_2px_0_#2A1E5C] hover:shadow-[0_1px_0_#2A1E5C] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
