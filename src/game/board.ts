import type { PlayerKey } from './types'

export const PLAYER_PITS = [0, 1, 2, 3, 4, 5, 6]
export const PLAYER_STORE = 7
export const AI_PITS = [8, 9, 10, 11, 12, 13, 14]
export const AI_STORE = 15
export const INITIAL_SEEDS = 7

export function createInitialBoard(): number[] {
  const board = new Array(16).fill(0)
  PLAYER_PITS.forEach(i => { board[i] = INITIAL_SEEDS })
  AI_PITS.forEach(i => { board[i] = INITIAL_SEEDS })
  return board
}

export function getValidPits(board: number[], actor: PlayerKey): number[] {
  const pits = actor === 'player' ? PLAYER_PITS : AI_PITS
  return pits.filter(i => board[i] > 0)
}

export function oppositePit(pit: number): number {
  return 14 - pit
}

export function isStore(pit: number): boolean {
  return pit === PLAYER_STORE || pit === AI_STORE
}

export function ownerOf(pit: number): PlayerKey {
  return pit <= 7 ? 'player' : 'ai'
}
