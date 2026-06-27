import { describe, it, expect } from 'vitest'
import { sow } from './sow'
import { createInitialBoard, AI_STORE, PLAYER_STORE } from './board'

describe('sow', () => {
  describe('basic sowing', () => {
    it('sows from pit 0 with 3 seeds to land at pit 3', () => {
      const board = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 0, 'player')
      expect(result.lastPit).toBe(3)
      expect(result.board[0]).toBe(0) // source pit emptied
      expect(result.board[1]).toBe(1)
      expect(result.board[2]).toBe(1)
      expect(result.board[3]).toBe(1)
    })

    it('sows from pit 5 with 3 seeds for player', () => {
      const board = [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 5, 'player')
      expect(result.lastPit).toBe(8)
      expect(result.board[5]).toBe(0) // source pit emptied
      expect(result.board[6]).toBe(1)
      expect(result.board[7]).toBe(1)
      expect(result.board[8]).toBe(1)
    })

    it('wraps correctly: from pit 13 with 5 seeds for AI, skips pit 7, lands at pit 2', () => {
      const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0]
      const result = sow(board, 13, 'ai')
      expect(result.lastPit).toBe(2)
      expect(result.board[13]).toBe(0) // source pit emptied
      expect(result.board[14]).toBe(1)
      expect(result.board[15]).toBe(1)
      expect(result.board[0]).toBe(1)
      expect(result.board[1]).toBe(1)
      expect(result.board[2]).toBe(1)
      // pit 7 should not be in the path for this case, but verify it wasn't touched
      expect(result.board[7]).toBe(0)
    })
  })

  describe('store skipping', () => {
    it('player skips pit 15 (AI_STORE) when sowing', () => {
      // From pit 14 with 3 seeds for player: 15 is skipped, so goes to 0, 1, 2
      const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0]
      const result = sow(board, 14, 'player')
      expect(result.board[15]).toBe(0) // AI_STORE not incremented
      expect(result.board[0]).toBe(1)
      expect(result.board[1]).toBe(1)
      expect(result.board[2]).toBe(1)
      expect(result.lastPit).toBe(2)
    })

    it('AI skips pit 7 (PLAYER_STORE) when sowing', () => {
      // From pit 6 with 3 seeds for AI: 7 is skipped, so goes to 8, 9, 10
      const board = [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 6, 'ai')
      expect(result.board[7]).toBe(0) // PLAYER_STORE not incremented
      expect(result.board[8]).toBe(1)
      expect(result.board[9]).toBe(1)
      expect(result.board[10]).toBe(1)
      expect(result.lastPit).toBe(10)
    })

    it('player can land in their own store (pit 7)', () => {
      // From pit 5 with 2 seeds for player: goes to 6, 7
      const board = [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 5, 'player')
      expect(result.board[6]).toBe(1)
      expect(result.board[7]).toBe(1) // player can land in own store
      expect(result.lastPit).toBe(7)
    })

    it('AI can land in their own store (pit 15)', () => {
      // From pit 12 with 2 seeds for AI: goes to 13, 14, 15... wait that's 3 pits
      // From pit 13 with 2 seeds for AI: goes to 14, 15
      const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0]
      const result = sow(board, 13, 'ai')
      expect(result.board[14]).toBe(1)
      expect(result.board[15]).toBe(1) // AI can land in own store
      expect(result.lastPit).toBe(15)
    })
  })

  describe('conservation and immutability', () => {
    it('conserves total seed count', () => {
      const board = createInitialBoard()
      const initialTotal = board.reduce((sum, seeds) => sum + seeds, 0)
      const result = sow(board, 0, 'player')
      const finalTotal = result.board.reduce((sum, seeds) => sum + seeds, 0)
      expect(finalTotal).toBe(initialTotal)
    })

    it('empties the source pit', () => {
      const board = [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 0, 'player')
      expect(result.board[0]).toBe(0)
    })

    it('does not mutate original board', () => {
      const board = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const boardCopy = [...board]
      sow(board, 0, 'player')
      expect(board).toEqual(boardCopy)
    })

    it('returns different board instance', () => {
      const board = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 0, 'player')
      expect(result.board).not.toBe(board)
    })
  })

  describe('wrapping behavior', () => {
    it('wraps from pit 15 to pit 0', () => {
      const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]
      const result = sow(board, 15, 'player')
      expect(result.lastPit).toBe(1)
      expect(result.board[15]).toBe(0)
      expect(result.board[0]).toBe(1)
      expect(result.board[1]).toBe(1)
    })

    it('multiple wraps for large seed counts', () => {
      const board = [20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 0, 'player')
      // 20 seeds distributed in order
      // After 1 wrap: pits 1-15 get 1 seed each (15 pits, 5 seeds left)
      // Skipping pit 15 for player means only 14 pits are incremented in first cycle
      // Wait, let me think again. We start at pit 0, skip pit 15.
      // Distribute to: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, (skip 15), 0
      // That's 15 seeds to get to 0 on second pass
      // Then continue: 1, 2, 3, 4, 5
      // So pits 1-5 should have 2 seeds, pit 0 should have 1 seed
      expect(result.board[0]).toBe(1)
      expect(result.board[1]).toBe(2)
      expect(result.board[5]).toBe(2)
      expect(result.board[15]).toBe(0) // AI_STORE for player is 15, should be skipped
      expect(result.lastPit).toBe(5)
    })
  })

  describe('edge cases', () => {
    it('sowing 0 seeds returns same pit', () => {
      const board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 3, 'player')
      expect(result.lastPit).toBe(3)
    })

    it('sowing 1 seed lands on next pit', () => {
      const board = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const result = sow(board, 1, 'player')
      expect(result.lastPit).toBe(2)
      expect(result.board[2]).toBe(1)
      expect(result.board[1]).toBe(0)
    })

    it('sowing from initial board state (pit 0)', () => {
      const board = createInitialBoard()
      const result = sow(board, 0, 'player')
      expect(result.board[0]).toBe(0)
      expect(result.lastPit).toBeGreaterThan(0)
      // Total seeds should be conserved
      const totalSeeds = result.board.reduce((sum, seeds) => sum + seeds, 0)
      expect(totalSeeds).toBe(98)
    })
  })
})
