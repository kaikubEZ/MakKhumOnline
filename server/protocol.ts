// Racing snapshot is relayed opaquely by the server — kept as `unknown` so the
// server has no compile dependency on the client's game model.
export type ClientMessage =
  | { type: 'move'; pit: number }
  | { type: 'racing_select'; pit: number }
  | { type: 'racing_state'; state: unknown }

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'game_start'; yourRole: 'player1' | 'player2' }
  | { type: 'opponent_move'; pit: number }
  | { type: 'opponent_racing_select'; pit: number }
  | { type: 'racing_state'; state: unknown }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }
