import { useGameStore } from '@/store/gameStore';

// Reset store between tests
beforeEach(() => {
  useGameStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    puzzle: null,
    cells: [],
    selectedCell: null,
    selectedClue: null,
    completedClues: [],
    startTime: null,
    solveTime: null,
    room: null,
    players: [],
    playerCursors: [],
    messages: [],
    isHost: false,
    showChat: false,
    showClues: true,
    hintsUsed: 0,
  });
});

describe('GameStore', () => {
  describe('Authentication', () => {
    it('should set user and token', () => {
      const store = useGameStore.getState();
      const user = { id: 'user1', email: 'test@example.com', displayName: 'Test User', isGuest: false };
      const token = 'test-token';

      store.setUser(user, token);

      const state = useGameStore.getState();
      expect(state.user).toEqual(user);
      expect(state.token).toBe(token);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should logout correctly', () => {
      const store = useGameStore.getState();
      store.setUser({ id: '1', email: 'test@example.com', displayName: 'Test', isGuest: false }, 'token');
      store.logout();

      const state = useGameStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Puzzle Management', () => {
    const mockPuzzle = {
      id: 'puzzle1',
      title: 'Test Puzzle',
      author: 'Test Author',
      difficulty: 'easy' as const,
      gridWidth: 3,
      gridHeight: 3,
      grid: [
        [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }],
        [{ letter: 'D' }, { letter: 'E' }, { letter: 'F' }],
        [{ letter: 'G' }, { letter: 'H' }, { letter: 'I' }],
      ],
      cluesAcross: [],
      cluesDown: [],
      createdAt: new Date().toISOString(),
      status: 'published',
    };

    it('should set puzzle and initialize cells', () => {
      const store = useGameStore.getState();
      store.setPuzzle(mockPuzzle);

      const state = useGameStore.getState();
      expect(state.puzzle).toEqual(mockPuzzle);
      expect(state.cells.length).toBe(3);
      expect(state.cells[0].length).toBe(3);
      expect(state.cells[0][0].value).toBeNull();
    });

    it('should update a cell', () => {
      const store = useGameStore.getState();
      store.setPuzzle(mockPuzzle);
      store.updateCell(1, 1, 'X', 'player1');

      const state = useGameStore.getState();
      expect(state.cells[1][1].value).toBe('X');
      expect(state.cells[1][1].lastEditedBy).toBe('player1');
    });

    it('should mark clue as completed', () => {
      const store = useGameStore.getState();
      store.markClueCompleted('across-1');

      const state = useGameStore.getState();
      expect(state.completedClues).toContain('across-1');
    });

    it('should not duplicate completed clues', () => {
      const store = useGameStore.getState();
      store.markClueCompleted('across-1');
      store.markClueCompleted('across-1');

      const state = useGameStore.getState();
      expect(state.completedClues.filter(c => c === 'across-1').length).toBe(1);
    });
  });

  describe('Room Management', () => {
    const mockRoom = {
      id: 'room1',
      code: 'ABC123',
      hostId: 'user1',
      puzzleId: 'puzzle1',
      mode: 'collaborative' as const,
      config: {
        maxPlayers: 4,
        isPublic: false,
        spectatorMode: true,
        timerMode: 'none',
        hintsEnabled: true,
      },
      state: 'lobby' as const,
      createdAt: new Date().toISOString(),
    };

    it('should set room and determine if user is host', () => {
      const store = useGameStore.getState();
      store.setUser({ id: 'user1', email: 'test@example.com', displayName: 'Host', isGuest: false }, 'token');
      store.setRoom(mockRoom);

      const state = useGameStore.getState();
      expect(state.room).toEqual(mockRoom);
      expect(state.isHost).toBe(true);
    });

    it('should not be host if user is different', () => {
      const store = useGameStore.getState();
      store.setUser({ id: 'user2', email: 'other@example.com', displayName: 'Other', isGuest: false }, 'token');
      store.setRoom(mockRoom);

      const state = useGameStore.getState();
      expect(state.isHost).toBe(false);
    });
  });

  describe('Player Management', () => {
    const mockPlayer = {
      userId: 'player1',
      roomId: 'room1',
      displayName: 'Player 1',
      isSpectator: false,
      isConnected: true,
      contribution: 0,
      color: '#FF6B6B',
      joinedAt: new Date().toISOString(),
    };

    it('should add a player', () => {
      const store = useGameStore.getState();
      store.addPlayer(mockPlayer);

      const state = useGameStore.getState();
      expect(state.players).toContainEqual(mockPlayer);
    });

    it('should not duplicate players', () => {
      const store = useGameStore.getState();
      store.addPlayer(mockPlayer);
      store.addPlayer(mockPlayer);

      const state = useGameStore.getState();
      expect(state.players.length).toBe(1);
    });

    it('should remove a player', () => {
      const store = useGameStore.getState();
      store.addPlayer(mockPlayer);
      store.removePlayer('player1');

      const state = useGameStore.getState();
      expect(state.players.length).toBe(0);
    });
  });

  describe('Game Flow', () => {
    it('should start game and set start time', () => {
      const store = useGameStore.getState();
      const before = Date.now();
      store.startGame();
      const after = Date.now();

      const state = useGameStore.getState();
      expect(state.startTime).toBeGreaterThanOrEqual(before);
      expect(state.startTime).toBeLessThanOrEqual(after);
    });

    it('should end game and set solve time', () => {
      const store = useGameStore.getState();
      store.endGame(120);

      const state = useGameStore.getState();
      expect(state.solveTime).toBe(120);
    });

    it('should increment hints used', () => {
      const store = useGameStore.getState();
      store.incrementHints();
      store.incrementHints();

      const state = useGameStore.getState();
      expect(state.hintsUsed).toBe(2);
    });

    it('should reset game state', () => {
      const store = useGameStore.getState();
      store.startGame();
      store.incrementHints();
      store.resetGame();

      const state = useGameStore.getState();
      expect(state.puzzle).toBeNull();
      expect(state.startTime).toBeNull();
      expect(state.hintsUsed).toBe(0);
    });
  });

  describe('Messages', () => {
    const mockMessage = {
      id: 'msg1',
      roomId: 'room1',
      userId: 'user1',
      displayName: 'Test User',
      text: 'Hello!',
      createdAt: new Date().toISOString(),
    };

    it('should add a message', () => {
      const store = useGameStore.getState();
      store.addMessage(mockMessage);

      const state = useGameStore.getState();
      expect(state.messages).toContainEqual(mockMessage);
    });

    it('should set messages', () => {
      const store = useGameStore.getState();
      store.setMessages([mockMessage]);

      const state = useGameStore.getState();
      expect(state.messages.length).toBe(1);
    });
  });

  describe('UI State', () => {
    it('should toggle chat visibility', () => {
      const store = useGameStore.getState();
      expect(useGameStore.getState().showChat).toBe(false);

      store.setShowChat(true);
      expect(useGameStore.getState().showChat).toBe(true);
    });

    it('should toggle clues visibility', () => {
      const store = useGameStore.getState();
      expect(useGameStore.getState().showClues).toBe(true);

      store.setShowClues(false);
      expect(useGameStore.getState().showClues).toBe(false);
    });
  });
});
