import type { GridCell, PlayerCursor, RoomPlayer } from './index';

// Base WebSocket Message
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

// Connection States
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Message Handler Type
export type MessageHandler<T = unknown> = (payload: T) => void;

// Room Events
export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  isSpectator: boolean;
}

export interface PlayerJoinedPayload {
  player: RoomPlayer;
}

export interface PlayerLeftPayload {
  userId: string;
  displayName: string;
}

export interface PlayerReadyPayload {
  userId: string;
  isReady: boolean;
}

export interface GameStartedPayload {
  [key: string]: unknown;
}

export interface PuzzleCompletedPlayer {
  userId: string;
  displayName: string;
  contribution: number;
  color?: string;
}

export interface GameFinishedPayload {
  solveTime: number;
  players: PuzzleCompletedPlayer[];
  completedAt: string;
}

export interface RoomClosedPayload {
  reason?: string;
}

// Game Events
export interface CellUpdatePayload {
  x: number;
  y: number;
  value: string;
  playerId?: string;
  color?: string;
  isRevealed?: boolean;
  isCorrect?: boolean;
}

export interface CursorMovePayload {
  playerId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
}

export interface PlayerProgressPayload {
  userId: string;
  filledCells: number;
  correctCells: number;
  progressPercent: number;
}

export interface PlayerFinishedPayload {
  userId: string;
  displayName: string;
  finishTime: number;
  rank: number;
}

// Chat Events
export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export type ChatMessagePayload = ChatMessage;

export interface TypingIndicatorPayload {
  userId: string;
  username: string;
  isTyping: boolean;
}

// Reaction Events
export interface Reaction {
  id: string;
  userId: string;
  username?: string;
  emoji: string;
  clueId: string;
  timestamp: number;
}

export interface ReactionPayload {
  userId: string;
  clueId: string;
  emoji: string;
  action: 'added' | 'removed';
}

// Clue Events
export interface Clue {
  id: string;
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  length: number;
}

export interface ClueRevealedPayload {
  clue: Clue;
  revealedBy: string;
}

export interface HintRequestedPayload {
  userId: string;
  row: number;
  col: number;
}

export interface HintProvidedPayload {
  row: number;
  col: number;
  value: number;
}

// Error Events
export interface ErrorPayload {
  message: string;
  code?: string;
  timestamp: number;
}

// Sync Events
export interface SyncStatePayload {
  room: unknown;
  players: RoomPlayer[];
  playerCursors: PlayerCursor[];
  grid: GridCell[][];
  elapsedTime: number;
}

// Outbound Message Types
export type OutboundMessageType =
  | 'join_room'
  | 'leave_room'
  | 'cell_update'
  | 'cursor_move'
  | 'send_message'
  | 'request_hint'
  | 'start_game'
  | 'reaction'
  | 'pass_turn';

// Inbound Message Types
export type InboundMessageType =
  | 'room_state'
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'cell_updated'
  | 'cursor_moved'
  | 'game_started'
  | 'puzzle_completed'
  | 'room_deleted'
  | 'error'
  | 'new_message'
  | 'reaction_added'
  | 'race_progress'
  | 'player_finished'
  | 'turn_changed';

// Union type for all message types
export type MessageType = OutboundMessageType | InboundMessageType;

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
