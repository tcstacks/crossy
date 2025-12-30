'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface ChatProps {
  onSendMessage: (text: string) => void;
}

export function Chat({ onSendMessage }: ChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, user, players } = useGameStore();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (message.trim()) {
        onSendMessage(message.trim());
        setMessage('');
      }
    },
    [message, onSendMessage]
  );

  const getPlayerColor = useCallback(
    (userId: string) => {
      const player = players.find((p) => p.userId === userId);
      return player?.color || '#888888';
    },
    [players]
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === user?.id;
            const playerColor = getPlayerColor(msg.userId);

            return (
              <div
                key={msg.id}
                className={cn(
                  'chat-message',
                  isOwnMessage && 'items-end'
                )}
              >
                <div className="message-header">
                  <span
                    className="font-medium"
                    style={{ color: playerColor }}
                  >
                    {isOwnMessage ? 'You' : msg.displayName}
                  </span>
                  <span>{formatTime(msg.createdAt)}</span>
                </div>
                <div
                  className={cn(
                    'message-text px-3 py-2 rounded-lg max-w-[80%]',
                    isOwnMessage
                      ? 'bg-primary-100 text-primary-900'
                      : 'bg-gray-100'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="input flex-1"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="btn btn-primary disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

export function ChatSidebar({ isOpen, onClose, onSendMessage }: ChatSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 transform transition-transform',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Chat</h2>
          <button
            onClick={onClose}
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
        <div className="h-[calc(100%-64px)]">
          <Chat onSendMessage={onSendMessage} />
        </div>
      </div>
    </>
  );
}
