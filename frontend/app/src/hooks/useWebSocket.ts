import { useEffect, useRef, useCallback, useState } from 'react';

// WebSocket Message Types
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

// Connection States
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Message Handler Type
export type MessageHandler<T = unknown> = (payload: T) => void;

// WebSocket Hook Options
export interface UseWebSocketOptions {
  roomCode: string;
  token: string;
  autoConnect?: boolean;
}

// WebSocket Hook Return Type
export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  sendMessage: <T = unknown>(type: string, payload: T) => void;
  on: <T = unknown>(messageType: string, handler: MessageHandler<T>) => () => void;
  connect: () => void;
  disconnect: () => void;
}

// Reconnection configuration
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff: 1s, 2s, 4s, 8s max
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket({ roomCode, token, autoConnect = true }: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageHandlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const isIntentionalDisconnectRef = useRef(false);
  const isMountedRef = useRef(true);
  const connectFnRef = useRef<(() => void) | null>(null);

  // Get WebSocket URL from environment
  const getWebSocketUrl = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
    return `${wsUrl}/api/rooms/${roomCode}/ws?token=${token}`;
  }, [roomCode, token]);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isIntentionalDisconnectRef.current = false;
    setConnectionState('connecting');

    // Schedule reconnection with exponential backoff
    const scheduleReconnect = () => {
      if (!isMountedRef.current || isIntentionalDisconnectRef.current) {
        return;
      }

      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        setConnectionState('error');
        return;
      }

      clearReconnectTimeout();

      const delayIndex = Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1);
      const delay = RECONNECT_DELAYS[delayIndex];

      console.log(`Scheduling reconnection attempt ${reconnectAttemptRef.current + 1} in ${delay}ms`);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptRef.current++;
        if (connectFnRef.current) {
          connectFnRef.current();
        }
      }, delay) as unknown as number;
    };

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }

        console.log('WebSocket connected');
        setConnectionState('connected');
        reconnectAttemptRef.current = 0;
        clearReconnectTimeout();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const handlers = messageHandlersRef.current.get(message.type);

          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.payload);
              } catch (error) {
                console.error(`Error in message handler for type "${message.type}":`, error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) {
          return;
        }

        console.log('WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        if (!isIntentionalDisconnectRef.current) {
          setConnectionState('disconnected');
          scheduleReconnect();
        } else {
          setConnectionState('disconnected');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionState('error');
      scheduleReconnect();
    }
  }, [getWebSocketUrl, clearReconnectTimeout]);

  // Update connect ref when connect changes
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, [clearReconnectTimeout]);

  // Send message through WebSocket
  const sendMessage = useCallback(<T = unknown>(type: string, payload: T) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot send message.');
      return;
    }

    const message: WebSocketMessage<T> = { type, payload };

    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }, []);

  // Register message handler
  const on = useCallback(<T = unknown>(messageType: string, handler: MessageHandler<T>): (() => void) => {
    if (!messageHandlersRef.current.has(messageType)) {
      messageHandlersRef.current.set(messageType, new Set());
    }

    const handlers = messageHandlersRef.current.get(messageType)!;
    handlers.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as MessageHandler);
      if (handlers.size === 0) {
        messageHandlersRef.current.delete(messageType);
      }
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect) {
      // WebSocket connection is a legitimate use case for effects to synchronize with external systems
      // eslint-disable-next-line react-hooks/set-state-in-effect
      connect();
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      isIntentionalDisconnectRef.current = true;
      clearReconnectTimeout();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Intentionally accessing ref in cleanup - this is the correct pattern for cleanup
      messageHandlersRef.current.clear();
    };
  }, [autoConnect, connect, clearReconnectTimeout]);

  return {
    connectionState,
    sendMessage,
    on,
    connect,
    disconnect,
  };
}
