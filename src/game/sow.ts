import { PlayerKey } from './types'
import { AI_STORE, PLAYER_STORE } from './board'

/**
 * Sow seeds from a pit for one actor.
 * Returns new board and the pit where the last seed landed.
 *
 * Rules:
 * - Pick up all seeds from startPit (set to 0)
 * - Distribute one seed per pit in ascending index order (0→1→…→15→0 wrapping)
 * - Skip the opponent's store (player skips pit 15; AI skips pit 7)
 */
export function sow(
  board: number[],
  startPit: number,
  actor: PlayerKey
): { board: number[]; lastPit: number } {
  const newBoard = [...board]
  let seeds = newBoard[startPit]
  newBoard[startPit] = 0

  let currentPit = startPit
  const skipPit = actor === 'player' ? AI_STORE : PLAYER_STORE

  while (seeds > 0) {
    currentPit = (currentPit + 1) % 16
    if (currentPit !== skipPit) {
      newBoard[currentPit]++
      seeds--
    }
  }

  return { board: newBoard, lastPit: currentPit }
}
