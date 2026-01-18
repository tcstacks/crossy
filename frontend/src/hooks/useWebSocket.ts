'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { WSMessage, WSMessageType, Player, Message, RaceProgressPayload, PlayerFinishedPayload, TurnChangedPayload, ReactionAddedPayload, Reaction } from '@/types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function useWebSocket(roomCode?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10; // Increased for better reliability
  const currentRoomCodeRef = useRef<string | undefined>(roomCode);
  const handleMessageRef = useRef<(message: WSMessage) => void>(() => {});

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
    setReactions,
    addReaction,
    removeReaction,
    startGame,
    endGame,
    setPuzzle,
    setRaceLeaderboard,
    setCurrentTurn,
    setRelayState,
  } = useGameStore();

  // Update current room code ref when it changes
  useEffect(() => {
    currentRoomCodeRef.current = roomCode;
  }, [roomCode]);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Use room-specific endpoint if roomCode is available
    const wsUrl = currentRoomCodeRef.current
      ? `${WS_BASE_URL}/api/rooms/${currentRoomCodeRef.current}/ws?token=${token}`
      : `${WS_BASE_URL}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessageRef.current(message);
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
          reactions?: Reaction[];
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
        if (data.reactions) {
          setReactions(data.reactions);
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
          isRevealed?: boolean;
          isCorrect?: boolean;
        };
        if (data.playerId !== user?.id) {
          updateCell(data.x, data.y, data.value || null, data.playerId);
        }
        // Always update revealed and correct states, even for current user
        if (data.isRevealed !== undefined || data.isCorrect !== undefined) {
          const cells = useGameStore.getState().cells;
          if (cells[data.y]?.[data.x]) {
            const updatedCell = { ...cells[data.y][data.x] };
            if (data.isRevealed !== undefined) {
              updatedCell.isRevealed = data.isRevealed;
            }
            if (data.isCorrect !== undefined) {
              updatedCell.isCorrect = data.isCorrect;
            }
            cells[data.y][data.x] = updatedCell;
            useGameStore.getState().setCells([...cells]);
          }
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
        const data = payload as {
          solveTime: number;
          players: Array<{
            userId: string;
            displayName: string;
            contribution: number;
            color: string;
          }>;
          completedAt: string;
        };

        // Update player contributions in the store
        if (data.players) {
          const currentPlayers = useGameStore.getState().players;
          const updatedPlayers = currentPlayers.map(player => {
            const result = data.players.find(p => p.userId === player.userId);
            return result ? { ...player, contribution: result.contribution } : player;
          });
          useGameStore.getState().setPlayers(updatedPlayers);
        }

        endGame(data.solveTime);
        break;
      }

      case 'error': {
        const data = payload as { message: string };
        console.error('WebSocket error:', data.message);
        break;
      }

      case 'race_progress': {
        const data = payload as RaceProgressPayload;
        setRaceLeaderboard(data.leaderboard);
        break;
      }

      case 'player_finished': {
        const data = payload as PlayerFinishedPayload;
        console.log(`${data.displayName} finished! Rank: ${data.rank}, Time: ${data.solveTime}s`);
        // The leaderboard will be updated via race_progress message
        break;
      }

      case 'turn_changed': {
        const data = payload as TurnChangedPayload;
        setCurrentTurn(data.currentPlayerId, data.turnNumber);

        // Update relay state with timing information
        if (data.turnStartedAt && data.turnTimeLimit !== undefined) {
          setRelayState({
            currentTurnUserId: data.currentPlayerId,
            turnNumber: data.turnNumber,
            turnStartedAt: new Date(data.turnStartedAt).getTime(),
            turnTimeLimit: data.turnTimeLimit,
          });
        }

        console.log(`Turn changed: ${data.currentPlayerName}'s turn (turn ${data.turnNumber})`);
        break;
      }

      case 'reaction_added': {
        const data = payload as ReactionAddedPayload;
        if (data.action === 'removed' || data.emoji === '') {
          removeReaction(data.userId, data.clueId);
        } else {
          addReaction(data.userId, data.clueId, data.emoji);
        }
        break;
      }

      case 'room_deleted': {
        const data = payload as { reason: string };
        console.log('Room deleted:', data.reason);
        // Room was deleted (e.g., host left) - redirect to home
        if (typeof window !== 'undefined') {
          window.location.href = '/?message=room_closed';
        }
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
    setReactions,
    addReaction,
    removeReaction,
    startGame,
    endGame,
    setPuzzle,
    setRaceLeaderboard,
    setCurrentTurn,
    setRelayState,
  ]);

  // Keep ref updated with latest handleMessage to avoid stale closures
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

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

  const passTurn = useCallback(() => {
    send('pass_turn', {});
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
    passTurn,
  };
}
