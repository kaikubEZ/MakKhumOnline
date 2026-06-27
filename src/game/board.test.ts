import { describe, it, expect } from 'vitest'
import {
  createInitialBoard,
  getValidPits,
  oppositePit,
  isStore,
  ownerOf,
} from './board'

describe('board', () => {
  describe('createInitialBoard', () => {
    it('returns 16 entries', () => {
      const board = createInitialBoard()
      expect(board).toHaveLength(16)
    })

    it('has total seeds = 98', () => {
      const board = createInitialBoard()
      const totalSeeds = board.reduce((sum, seeds) => sum + seeds, 0)
      expect(totalSeeds).toBe(98)
    })

    it('stores are initially 0', () => {
      const board = createInitialBoard()
      expect(board[7]).toBe(0)
      expect(board[15]).toBe(0)
    })
  })

  describe('getValidPits', () => {
    it('returns only non-empty pits for player', () => {
      const board = createInitialBoard()
      const validPits = getValidPits(board, 'player')
      validPits.forEach(pit => {
        expect(board[pit]).toBeGreaterThan(0)
      })
    })

    it('returns only non-empty pits for ai', () => {
      const board = createInitialBoard()
      const validPits = getValidPits(board, 'ai')
      validPits.forEach(pit => {
        expect(board[pit]).toBeGreaterThan(0)
      })
    })

    it('excludes empty pits', () => {
      const board = createInitialBoard()
      board[0] = 0
      board[8] = 0
      const playerValidPits = getValidPits(board, 'player')
      const aiValidPits = getValidPits(board, 'ai')
      expect(playerValidPits).not.toContain(0)
      expect(aiValidPits).not.toContain(8)
    })
  })

  describe('oppositePit', () => {
    it('oppositePit(0) = 14', () => {
      expect(oppositePit(0)).toBe(14)
    })

    it('oppositePit(6) = 8', () => {
      expect(oppositePit(6)).toBe(8)
    })

    it('oppositePit(3) = 11', () => {
      expect(oppositePit(3)).toBe(11)
    })
  })

  describe('isStore', () => {
    it('isStore(7) = true', () => {
      expect(isStore(7)).toBe(true)
    })

    it('isStore(15) = true', () => {
      expect(isStore(15)).toBe(true)
    })

    it('isStore(5) = false', () => {
      expect(isStore(5)).toBe(false)
    })
  })

  describe('ownerOf', () => {
    it('ownerOf(0) = "player"', () => {
      expect(ownerOf(0)).toBe('player')
    })

    it('ownerOf(7) = "player"', () => {
      expect(ownerOf(7)).toBe('player')
    })

    it('ownerOf(8) = "ai"', () => {
      expect(ownerOf(8)).toBe('ai')
    })

    it('ownerOf(15) = "ai"', () => {
      expect(ownerOf(15)).toBe('ai')
    })
  })
})
