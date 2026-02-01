import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { MockWebSocket } from '../test/setup';

describe('useWebSocket', () => {
  let mockWsInstances: MockWebSocket[] = [];
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWsInstances = [];

    // Track all WebSocket instances created
    (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = class extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        mockWsInstances.push(this);
      }
    } as unknown as typeof MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = originalWebSocket as unknown as typeof MockWebSocket;
    mockWsInstances = [];
  });

  const defaultOptions = {
    roomCode: 'TEST123',
    token: 'test-token',
  };

  describe('Connection Lifecycle', () => {
    it('should connect on mount when autoConnect is true (default)', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      expect(result.current.connectionState).toBe('connecting');
      expect(mockWsInstances.length).toBe(1);
      expect(mockWsInstances[0].url).toContain('TEST123');
      expect(mockWsInstances[0].url).toContain('test-token');

      // Simulate connection opening
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('should not connect on mount when autoConnect is false', () => {
      const { result } = renderHook(() =>
        useWebSocket({ ...defaultOptions, autoConnect: false })
      );

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWsInstances.length).toBe(0);
    });

    it('should disconnect on unmount', async () => {
      const { result, unmount } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const wsInstance = mockWsInstances[0];

      unmount();

      expect(wsInstance.close).toHaveBeenCalled();
    });

    it('should allow manual connect when autoConnect is false', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ ...defaultOptions, autoConnect: false })
      );

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWsInstances.length).toBe(0);

      // Manually connect
      act(() => {
        result.current.connect();
      });

      expect(mockWsInstances.length).toBe(1);
      expect(result.current.connectionState).toBe('connecting');

      // Simulate connection opening
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('should allow manual disconnect', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const wsInstance = mockWsInstances[0];

      act(() => {
        result.current.disconnect();
      });

      expect(wsInstance.close).toHaveBeenCalled();
      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  describe('Message Sending', () => {
    it('should send messages when connected', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const wsInstance = mockWsInstances[0];

      act(() => {
        result.current.sendMessage('test-type', { data: 'test-payload' });
      });

      expect(wsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test-type', payload: { data: 'test-payload' } })
      );
    });

    it('should not send messages when disconnected', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWebSocket({ ...defaultOptions, autoConnect: false })
      );

      act(() => {
        result.current.sendMessage('test-type', { data: 'test-payload' });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WebSocket is not connected. Cannot send message.'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not send messages when WebSocket is not in OPEN state', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // WebSocket is in CONNECTING state (before open event fires)
      expect(result.current.connectionState).toBe('connecting');

      act(() => {
        result.current.sendMessage('test-type', { data: 'test-payload' });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WebSocket is not connected. Cannot send message.'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Handler Registration', () => {
    it('should register and invoke message handlers with on()', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const handler = vi.fn();

      act(() => {
        result.current.on('test-message', handler);
      });

      const wsInstance = mockWsInstances[0];

      // Simulate receiving a message
      act(() => {
        wsInstance.simulateMessage({ type: 'test-message', payload: { value: 42 } });
      });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should allow multiple handlers for the same message type', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      act(() => {
        result.current.on('test-message', handler1);
        result.current.on('test-message', handler2);
      });

      const wsInstance = mockWsInstances[0];

      // Simulate receiving a message
      act(() => {
        wsInstance.simulateMessage({ type: 'test-message', payload: { value: 42 } });
      });

      expect(handler1).toHaveBeenCalledWith({ value: 42 });
      expect(handler2).toHaveBeenCalledWith({ value: 42 });
    });

    it('should unsubscribe handler when calling returned function', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const handler = vi.fn();
      let unsubscribe: () => void;

      act(() => {
        unsubscribe = result.current.on('test-message', handler);
      });

      const wsInstance = mockWsInstances[0];

      // First message should be received
      act(() => {
        wsInstance.simulateMessage({ type: 'test-message', payload: { value: 1 } });
      });

      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      act(() => {
        unsubscribe();
      });

      // Second message should not be received
      act(() => {
        wsInstance.simulateMessage({ type: 'test-message', payload: { value: 2 } });
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for different message types', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const handler = vi.fn();

      act(() => {
        result.current.on('type-a', handler);
      });

      const wsInstance = mockWsInstances[0];

      // Simulate receiving a message of different type
      act(() => {
        wsInstance.simulateMessage({ type: 'type-b', payload: { value: 42 } });
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle errors in message handlers gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      act(() => {
        result.current.on('test-message', errorHandler);
        result.current.on('test-message', normalHandler);
      });

      const wsInstance = mockWsInstances[0];

      // Simulate receiving a message
      act(() => {
        wsInstance.simulateMessage({ type: 'test-message', payload: { value: 42 } });
      });

      // Both handlers should be called, error should be caught
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Connection State Management', () => {
    it('should start with disconnected state when autoConnect is false', () => {
      const { result } = renderHook(() =>
        useWebSocket({ ...defaultOptions, autoConnect: false })
      );

      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should transition to connecting state when connect is called', () => {
      const { result } = renderHook(() =>
        useWebSocket({ ...defaultOptions, autoConnect: false })
      );

      act(() => {
        result.current.connect();
      });

      expect(result.current.connectionState).toBe('connecting');
    });

    it('should transition to connected state on successful connection', async () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions));

      expect(result.current.connectionState).toBe('connecting');

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('should transition to error state on WebSocket error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const wsInstance = mockWsInstances[0];

      act(() => {
        wsInstance.simulateError();
      });

      expect(result.current.connectionState).toBe('error');

      consoleErrorSpy.mockRestore();
    });

    it('should transition to disconnected state on WebSocket close', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const wsInstance = mockWsInstances[0];

      act(() => {
        wsInstance.simulateClose(1000, 'Normal closure');
      });

      expect(result.current.connectionState).toBe('disconnected');

      consoleLogSpy.mockRestore();
    });
  });

  describe('Reconnection Behavior', () => {
    it('should attempt to reconnect after unintentional disconnect', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      const firstWsInstance = mockWsInstances[0];
      expect(mockWsInstances.length).toBe(1);

      // Simulate unintentional close
      act(() => {
        firstWsInstance.simulateClose(1006, 'Abnormal closure');
      });

      expect(result.current.connectionState).toBe('disconnected');

      // Advance timer to trigger first reconnection attempt (1000ms delay)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // A new WebSocket should be created
      expect(mockWsInstances.length).toBe(2);

      consoleLogSpy.mockRestore();
    });

    it.skip('should use exponential backoff for reconnection attempts', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // First disconnect
      act(() => {
        mockWsInstances[0].simulateClose(1006, 'Abnormal closure');
      });

      // First reconnection attempt: 1000ms
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(mockWsInstances.length).toBe(2);

      // Wait for second connection to open
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Second disconnect
      act(() => {
        mockWsInstances[1].simulateClose(1006, 'Abnormal closure');
      });

      // Second reconnection attempt: 2000ms
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(mockWsInstances.length).toBe(3);

      // Wait for third connection to open
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Third disconnect
      act(() => {
        mockWsInstances[2].simulateClose(1006, 'Abnormal closure');
      });

      // Third reconnection attempt: 4000ms
      await act(async () => {
        vi.advanceTimersByTime(4100);
      });
      expect(mockWsInstances.length).toBe(4);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should not reconnect after intentional disconnect', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      expect(mockWsInstances.length).toBe(1);

      // Intentional disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connectionState).toBe('disconnected');

      // Advance timer past reconnection delay
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // No new WebSocket should be created
      expect(mockWsInstances.length).toBe(1);

      consoleLogSpy.mockRestore();
    });

    it('should reset reconnection attempts on successful connection', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Disconnect and reconnect
      act(() => {
        mockWsInstances[0].simulateClose(1006, 'Abnormal closure');
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockWsInstances.length).toBe(2);

      // Simulate successful reconnection
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Disconnect again
      act(() => {
        mockWsInstances[1].simulateClose(1006, 'Abnormal closure');
      });

      // Should use first delay again (1000ms), not second (2000ms)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockWsInstances.length).toBe(3);

      consoleLogSpy.mockRestore();
    });

    it.skip('should stop reconnecting after max attempts', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Simulate failed connection attempts (MAX_RECONNECT_ATTEMPTS = 10)
      // We need to close the connection before it successfully opens to increment the counter
      for (let i = 0; i < 11; i++) {
        act(() => {
          mockWsInstances[mockWsInstances.length - 1].simulateClose(1006, 'Abnormal closure');
        });

        // Advance timer past the delay (max is 8000ms) plus time for reconnect
        await act(async () => {
          vi.advanceTimersByTime(8100);
        });
      }

      // After max attempts, should be in error state
      await waitFor(() => {
        expect(result.current.connectionState).toBe('error');
      });

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('WebSocket URL Construction', () => {
    it('should construct WebSocket URL with roomCode and token', async () => {
      renderHook(() =>
        useWebSocket({ roomCode: 'ROOM456', token: 'my-token-123' })
      );

      expect(mockWsInstances.length).toBe(1);
      expect(mockWsInstances[0].url).toContain('/api/rooms/ROOM456/ws');
      expect(mockWsInstances[0].url).toContain('token=my-token-123');
    });
  });
});
