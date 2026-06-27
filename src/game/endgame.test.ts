import { describe, it, expect } from 'vitest'
import { sweepSeeds, determineWinner } from './endgame'
import { createInitialBoard, PLAYER_STORE, AI_STORE } from './board'

describe('endgame', () => {
  describe('sweepSeeds', () => {
    it('zeroes all playfield pits', () => {
      const board = createInitialBoard()
      const swept = sweepSeeds(board)
      for (let i = 0; i <= 6; i++) expect(swept[i]).toBe(0)
      for (let i = 8; i <= 14; i++) expect(swept[i]).toBe(0)
    })

    it('stores accumulate playfield seeds correctly', () => {
      const board = createInitialBoard()
      const swept = sweepSeeds(board)
      expect(swept[PLAYER_STORE]).toBe(49) // 7 pits × 7 seeds
      expect(swept[AI_STORE]).toBe(49)
    })

    it('total seeds are conserved', () => {
      const board = createInitialBoard()
      const total = (b: number[]) => b.reduce((s, n) => s + n, 0)
      expect(total(sweepSeeds(board))).toBe(total(board))
    })

    it('sweep of already-empty playfield is a no-op on stores', () => {
      const board = new Array(16).fill(0)
      board[PLAYER_STORE] = 30
      board[AI_STORE] = 20
      const swept = sweepSeeds(board)
      expect(swept[PLAYER_STORE]).toBe(30)
      expect(swept[AI_STORE]).toBe(20)
    })
  })

  describe('determineWinner', () => {
    it('returns "player" when player store > ai store', () => {
      const board = new Array(16).fill(0)
      board[PLAYER_STORE] = 50
      board[AI_STORE] = 48
      expect(determineWinner(board)).toBe('player')
    })

    it('returns "ai" when ai store > player store', () => {
      const board = new Array(16).fill(0)
      board[PLAYER_STORE] = 40
      board[AI_STORE] = 58
      expect(determineWinner(board)).toBe('ai')
    })

    it('returns "draw" when stores are equal', () => {
      const board = new Array(16).fill(0)
      board[PLAYER_STORE] = 49
      board[AI_STORE] = 49
      expect(determineWinner(board)).toBe('draw')
    })
  })
})
