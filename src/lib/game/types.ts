export type GameState = number[];

export interface AnimationState {
  board: GameState;
  seedsInHand: number;
  activePit: number | null;
}

export interface MoveHistoryEntry {
  player: number; // 0 for human, 1 for AI
  pitIndex: number;
  scoreGained: number;
  captured: boolean;
  freeTurn: boolean;
  messages: string[];
}

export interface MoveResult {
  nextTurn: number; // 0 for human, 1 for AI
  states: AnimationState[]; // Array of intermediate board states for animation
  messages: string[]; // Track what happened during the turn
}
