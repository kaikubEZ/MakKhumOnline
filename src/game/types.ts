export type Phase = 'racing' | 'turnbased' | 'gameover'
export type PlayerKey = 'player' | 'ai'
export type PlayerStatus = 'waiting' | 'selecting' | 'moving' | 'paused' | 'dead' | 'won' | 'lost'
export type GameResult = 'player' | 'ai' | 'draw'

export interface MoveRecord {
  actor: PlayerKey
  pit: number
  boardBefore: number[]
  validPits: number[]
  storeGain: number
}

export interface GameEvent {
  type: GameEventType
  pit?: number
  actor?: PlayerKey
  tick?: number
}

export type GameEventType =
  | 'PIT_SELECTED'
  | 'SEED_DROPPED'
  | 'CHAIN_TRIGGERED'
  | 'COLLISION_TRIGGERED'
  | 'PLAYER_PAUSED'
  | 'PLAYER_DIED'
  | 'FREE_TURN_TRIGGERED'
  | 'CAPTURE_TRIGGERED'
  | 'TURN_CHANGED'
  | 'PHASE_CHANGED'
  | 'GAME_OVER'

export type GameMode = 'local' | 'online'
export type MyRole = 'player1' | 'player2'
