export type GameState = number[];

export enum GamePhase {
  RACING = 'RACING',
  TURN_BASED = 'TURN_BASED'
}

export interface PlayerHand {
  isActive: boolean;
  hasDiedOnce: boolean;
  seeds: number;
  currentPit: number | null;
  needsDecision: boolean; // True if they need to select a starting pit or pit after hitting store
}

export interface AnimationState {
  board: GameState;
  seedsInHand: number;
  activePit: number | null;
}

export interface MoveHistoryEntry {
  player: number | 'system'; 
  pitIndex: number | null;
  scoreGained: number;
  captured: boolean;
  freeTurn: boolean;
  messages: string[];
}

export interface MoveResult {
  nextTurn: number; 
  states: AnimationState[]; 
  messages: string[]; 
}
