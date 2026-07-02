import type { RacingState } from '../game/racing'

export type ClientMessage =
  | { type: 'move'; pit: number }
  | { type: 'racing_select'; pit: number }       // a player chose a racing start / re-pick pit
  | { type: 'racing_state'; state: RacingState }  // host broadcasts the authoritative racing snapshot

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'game_start'; yourRole: 'player1' | 'player2' }
  | { type: 'opponent_move'; pit: number }
  | { type: 'opponent_racing_select'; pit: number }
  | { type: 'racing_state'; state: RacingState }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }
