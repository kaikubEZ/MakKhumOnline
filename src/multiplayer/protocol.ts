export type ClientMessage = { type: 'move'; pit: number }

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'game_start'; yourRole: 'player1' | 'player2' }
  | { type: 'opponent_move'; pit: number }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }
