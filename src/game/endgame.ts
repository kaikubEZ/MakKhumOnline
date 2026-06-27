import { GameResult } from './types'
import { PLAYER_PITS, PLAYER_STORE, AI_PITS, AI_STORE } from './board'

/**
 * Sweep remaining seeds from playfield to stores at end of game.
 * - Player pits (0-6) → pit 7 (player store)
 * - AI pits (8-14) → pit 15 (AI store)
 * - All playfield pits → 0
 * - Total seeds conserved
 *
 * Returns a new board (immutable).
 */
export function sweepSeeds(board: number[]): number[] {
  const newBoard = [...board]

  // Sweep player pits
  let playerSeeds = 0
  PLAYER_PITS.forEach(pit => {
    playerSeeds += newBoard[pit]
    newBoard[pit] = 0
  })
  newBoard[PLAYER_STORE] += playerSeeds

  // Sweep AI pits
  let aiSeeds = 0
  AI_PITS.forEach(pit => {
    aiSeeds += newBoard[pit]
    newBoard[pit] = 0
  })
  newBoard[AI_STORE] += aiSeeds

  return newBoard
}

/**
 * Determine the winner by comparing store counts.
 * Returns 'player' if player store > AI store
 * Returns 'ai' if AI store > player store
 * Returns 'draw' if equal
 */
export function determineWinner(board: number[]): GameResult {
  const playerStore = board[PLAYER_STORE]
  const aiStore = board[AI_STORE]

  if (playerStore > aiStore) {
    return 'player'
  } else if (aiStore > playerStore) {
    return 'ai'
  } else {
    return 'draw'
  }
}
