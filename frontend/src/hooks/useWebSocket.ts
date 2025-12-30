'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { WSMessage, WSMessageType, Player, Message } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    token,
    user,
    setRoom,
    setPlayers,
    addPlayer,
    removePlayer,
    updatePlayerCursor,
    removePlayerCursor,
    setCells,
    updateCell,
    addMessage,
    setMessages,
    startGame,
    endGame,
    setPuzzle,
  } = useGameStore();

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    wsRef.current = ws;
  }, [token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((type: WSMessageType, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'room_state': {
        const data = payload as {
          room: Parameters<typeof setRoom>[0];
          players: Player[];
          gridState?: { cells: Parameters<typeof setCells>[0] };
          puzzle?: Parameters<typeof setPuzzle>[0];
          messages?: Message[];
        };
        setRoom(data.room);
        setPlayers(data.players);
        if (data.gridState) {
          setCells(data.gridState.cells);
        }
        if (data.puzzle) {
          setPuzzle(data.puzzle);
        }
        if (data.messages) {
          setMessages(data.messages);
        }
        break;
      }

      case 'player_joined': {
        const data = payload as { player: Player };
        addPlayer(data.player);
        break;
      }

      case 'player_left': {
        const data = payload as { userId: string };
        removePlayer(data.userId);
        removePlayerCursor(data.userId);
        break;
      }

      case 'cell_updated': {
        const data = payload as {
          x: number;
          y: number;
          value: string;
          playerId: string;
          color: string;
        };
        if (data.playerId !== user?.id) {
          updateCell(data.x, data.y, data.value || null, data.playerId);
        }
        break;
      }

      case 'cursor_moved': {
        const data = payload as {
          playerId: string;
          displayName: string;
          x: number;
          y: number;
          color: string;
        };
        updatePlayerCursor({
          playerId: data.playerId,
          displayName: data.displayName,
          x: data.x,
          y: data.y,
          color: data.color,
        });
        break;
      }

      case 'new_message': {
        const data = payload as Message;
        addMessage(data);
        break;
      }

      case 'game_started': {
        startGame();
        break;
      }

      case 'puzzle_completed': {
        const data = payload as { solveTime: number };
        endGame(data.solveTime);
        break;
      }

      case 'error': {
        const data = payload as { message: string };
        console.error('WebSocket error:', data.message);
        break;
      }

      default:
        console.log('Unhandled message type:', type);
    }
  }, [
    user,
    setRoom,
    setPlayers,
    addPlayer,
    removePlayer,
    updatePlayerCursor,
    removePlayerCursor,
    setCells,
    updateCell,
    addMessage,
    setMessages,
    startGame,
    endGame,
    setPuzzle,
  ]);

  // WebSocket actions
  const joinRoom = useCallback((roomCode: string, displayName: string, isSpectator = false) => {
    send('join_room', { roomCode, displayName, isSpectator });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send('leave_room', {});
  }, [send]);

  const updateCellValue = useCallback((x: number, y: number, value: string | null) => {
    send('cell_update', { x, y, value });
    // Optimistic update
    updateCell(x, y, value, user?.id);
  }, [send, updateCell, user]);

  const moveCursor = useCallback((x: number, y: number) => {
    send('cursor_move', { x, y });
  }, [send]);

  const sendMessage = useCallback((text: string) => {
    send('send_message', { text });
  }, [send]);

  const requestHint = useCallback((type: 'letter' | 'word' | 'check', x: number, y: number) => {
    send('request_hint', { type, x, y });
  }, [send]);

  const startGameAction = useCallback(() => {
    send('start_game', {});
  }, [send]);

  const sendReaction = useCallback((clueId: string, emoji: string) => {
    send('reaction', { clueId, emoji });
  }, [send]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    updateCell: updateCellValue,
    moveCursor,
    sendMessage,
    requestHint,
    startGame: startGameAction,
    sendReaction,
  };
}
