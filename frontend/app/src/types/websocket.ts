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
export interface PlayerJoinedPayload {
  player: RoomPlayer;
  roomId: string;
}

export interface PlayerLeftPayload {
  userId: string;
  username: string;
  roomId: string;
}

export interface PlayerReadyPayload {
  userId: string;
  isReady: boolean;
}

export interface GameStartedPayload {
  roomId: string;
  puzzleId: string;
  startTime: number;
}

export interface GameFinishedPayload {
  roomId: string;
  winnerId?: string;
  winnerUsername?: string;
  finishTime: number;
}

export interface RoomClosedPayload {
  roomId: string;
  reason?: string;
}

// Game Events
export interface CellUpdatePayload {
  userId: string;
  row: number;
  col: number;
  value: number | null;
}

export interface CursorMovePayload {
  cursor: PlayerCursor;
}

export interface PlayerProgressPayload {
  userId: string;
  filledCells: number;
  correctCells: number;
  progressPercent: number;
}

export interface PlayerFinishedPayload {
  userId: string;
  username: string;
  finishTime: number;
  score: number;
}

// Race Mode Progress
export interface RaceProgress {
  userId: string;
  displayName: string;
  progress: number; // 0-100 percentage
  finishedAt?: string;
  solveTime?: number;
  rank?: number;
}

export interface RaceProgressPayload {
  leaderboard: RaceProgress[];
}

// Chat Events
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface ChatMessagePayload {
  message: ChatMessage;
}

export interface TypingIndicatorPayload {
  userId: string;
  username: string;
  isTyping: boolean;
}

// Reaction Events
export interface Reaction {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  cellRow?: number;
  cellCol?: number;
  timestamp: number;
}

export interface ReactionPayload {
  reaction: Reaction;
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
  grid: GridCell[][];
  playerCursors: PlayerCursor[];
  players: RoomPlayer[];
  elapsedTime: number;
}

// Outbound Message Types
export type OutboundMessageType =
  | 'player:ready'
  | 'game:start'
  | 'cell:update'
  | 'cursor:move'
  | 'chat:message'
  | 'chat:typing'
  | 'reaction:add'
  | 'hint:request'
  | 'sync:request';

// Inbound Message Types
export type InboundMessageType =
  | 'player:joined'
  | 'player:left'
  | 'player:ready'
  | 'game:started'
  | 'game:finished'
  | 'room:closed'
  | 'cell:updated'
  | 'cursor:moved'
  | 'player:progress'
  | 'player:finished'
  | 'chat:message'
  | 'chat:typing'
  | 'reaction:added'
  | 'clue:revealed'
  | 'hint:provided'
  | 'error'
  | 'sync:state';

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
