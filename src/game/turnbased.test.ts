import { describe, it, expect } from 'vitest'
import { executeMove, TurnState } from './turnbased'
import { PLAYER_STORE, AI_STORE } from './board'

function makeState(board: number[], currentTurn: TurnState['currentTurn'] = 'player'): TurnState {
  return { board, currentTurn, events: [], phase: 'turnbased' }
}

describe('executeMove', () => {
  describe('free turn', () => {
    it('last seed in player store → FREE_TURN_TRIGGERED, currentTurn stays player', () => {
      // Pit 5 has 2 seeds → sow lands at pit 7 (PLAYER_STORE)
      const board = Array(16).fill(0)
      board[5] = 2
      const result = executeMove(makeState(board, 'player'), 5)

      expect(result.currentTurn).toBe('player')
      expect(result.phase).toBe('turnbased')
      expect(result.events.some(e => e.type === 'FREE_TURN_TRIGGERED')).toBe(true)
      expect(result.board[PLAYER_STORE]).toBe(1) // the 2nd seed lands in store
    })

    it('last seed in AI store → FREE_TURN_TRIGGERED, currentTurn stays ai', () => {
      // AI pit 13 has 2 seeds → sow lands at pit 15 (AI_STORE)
      const board = Array(16).fill(0)
      board[13] = 2
      const result = executeMove(makeState(board, 'ai'), 13)

      expect(result.currentTurn).toBe('ai')
      expect(result.phase).toBe('turnbased')
      expect(result.events.some(e => e.type === 'FREE_TURN_TRIGGERED')).toBe(true)
      expect(result.board[AI_STORE]).toBe(1)
    })

    it('free turn does NOT emit CHAIN_TRIGGERED', () => {
      const board = Array(16).fill(0)
      board[5] = 2
      const result = executeMove(makeState(board, 'player'), 5)
      expect(result.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(false)
    })
  })

  describe('capture (kin)', () => {
    it('last seed in empty own pit, opposite has seeds → CAPTURE_TRIGGERED, seeds go to store, turn changes', () => {
      // Player sows 1 seed from pit 2 → lands at pit 3 (empty)
      // Opposite of pit 3 = pit 11 (has 5 seeds)
      const board = Array(16).fill(0)
      board[2] = 1   // source pit
      board[3] = 0   // destination (empty)
      board[11] = 5  // opposite pit
      const result = executeMove(makeState(board, 'player'), 2)

      expect(result.events.some(e => e.type === 'CAPTURE_TRIGGERED')).toBe(true)
      expect(result.board[3]).toBe(0)   // captured pit emptied
      expect(result.board[11]).toBe(0)  // opposite pit emptied
      expect(result.board[PLAYER_STORE]).toBe(6) // 1 + 5 seeds in player store
      expect(result.currentTurn).toBe('ai')    // turn changes
    })

    it('AI capture: last seed in empty AI pit, opposite has seeds → capture to AI store', () => {
      // AI sows 1 seed from pit 12 → lands at pit 13 (empty)
      // Opposite of pit 13 = pit 1 (has 3 seeds)
      const board = Array(16).fill(0)
      board[12] = 1  // source pit
      board[13] = 0  // destination (empty)
      board[1] = 3   // opposite pit
      const result = executeMove(makeState(board, 'ai'), 12)

      expect(result.events.some(e => e.type === 'CAPTURE_TRIGGERED')).toBe(true)
      expect(result.board[13]).toBe(0)
      expect(result.board[1]).toBe(0)
      expect(result.board[AI_STORE]).toBe(4) // 1 + 3
      expect(result.currentTurn).toBe('player')
    })
  })

  describe('no capture when opposite pit is empty', () => {
    it('last seed in empty own pit, opposite EMPTY → no capture, normal end, turn changes', () => {
      // Player sows 1 seed from pit 2 → lands at pit 3 (empty)
      // Opposite of pit 3 = pit 11 (also empty)
      const board = Array(16).fill(0)
      board[2] = 1
      board[3] = 0
      board[11] = 0
      const result = executeMove(makeState(board, 'player'), 2)

      expect(result.events.some(e => e.type === 'CAPTURE_TRIGGERED')).toBe(false)
      expect(result.board[3]).toBe(1)     // seed deposited normally
      expect(result.board[PLAYER_STORE]).toBe(0) // nothing captured
      expect(result.currentTurn).toBe('ai') // turn changes
    })
  })

  describe('chain', () => {
    it('last seed in non-empty non-store pit → CHAIN_TRIGGERED, continues sowing', () => {
      // Player pit 0 has 1 seed, pit 1 has 2 seeds
      // Sow 1 from pit 0 → lands at pit 1 (non-empty after sow: 3) → chain
      // Then sow 3 from pit 1 → lands at pit 4
      const board = Array(16).fill(0)
      board[0] = 1
      board[1] = 2
      const result = executeMove(makeState(board, 'player'), 0)

      expect(result.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(true)
      expect(result.board[0]).toBe(0)
      expect(result.board[1]).toBe(0) // all seeds picked up for chain
    })

    it('chain resolves fully to a terminal outcome', () => {
      // Set up so chain eventually ends with a normal move
      const board = Array(16).fill(0)
      board[0] = 1   // sow 1 → lands at pit 1
      board[1] = 1   // pit 1 has 1 seed → after sow becomes 2 → chain
      // After chain: pick up 2 from pit 1, sow → lands at pit 3
      // pit 3 is empty → normal end (assuming no capture setup)
      const result = executeMove(makeState(board, 'player'), 0)

      expect(result.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(true)
      expect(result.currentTurn).toBe('ai') // eventually turn changes
    })

    it('chain does NOT trigger from store landing', () => {
      // Player sows 2 seeds from pit 5 → lands at pit 7 (store, not a chain)
      const board = Array(16).fill(0)
      board[5] = 2
      board[7] = 5   // store already has seeds — should NOT chain
      const result = executeMove(makeState(board, 'player'), 5)

      expect(result.events.some(e => e.type === 'FREE_TURN_TRIGGERED')).toBe(true)
      expect(result.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(false)
      expect(result.currentTurn).toBe('player')
    })
  })

  describe('normal turn change', () => {
    it('turn changes to AI after a normal player move', () => {
      // Player sows 3 seeds from pit 0 → lands at pit 3 (empty, oppositePit(3)=11 also empty) → normal end
      const board = Array(16).fill(0)
      board[0] = 3   // source
      board[8] = 1   // AI has a seed so game doesn't end
      // pits 1,2,3 are 0 (no chain), pit 11 is 0 (no capture)
      const result = executeMove(makeState(board, 'player'), 0)

      expect(result.currentTurn).toBe('ai')
      expect(result.phase).toBe('turnbased')
      expect(result.events.some(e => e.type === 'FREE_TURN_TRIGGERED')).toBe(false)
      expect(result.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(false)
      expect(result.events.some(e => e.type === 'CAPTURE_TRIGGERED')).toBe(false)
    })

    it('turn changes to player after a normal AI move', () => {
      // AI sows 2 seeds from pit 8 → lands at pit 10 (empty, oppositePit(10)=4 also empty) → normal end
      const board = Array(16).fill(0)
      board[8] = 2   // source
      board[0] = 1   // player has a seed so game doesn't end
      // pits 9,10 are 0 (no chain), pit 4 is 0 (no capture)
      const result = executeMove(makeState(board, 'ai'), 8)

      expect(result.currentTurn).toBe('player')
      expect(result.phase).toBe('turnbased')
    })
  })

  describe('game over', () => {
    it('game over triggers when next actor has no valid pits', () => {
      // After player moves, AI side is empty → game over
      // Player pit 0 has 1 seed, sow → lands in AI zone somehow, AI has no other seeds
      // Simple: player pit 6 has 1 seed → sow → pit 8 (AI side, already 0)
      // But AI must already have 0 seeds after the sow
      const board = Array(16).fill(0)
      board[0] = 1  // player has 1 seed in pit 0
      // AI has no seeds anywhere
      const result = executeMove(makeState(board, 'player'), 0)

      // After sow, AI has no pits with seeds
      expect(result.phase).toBe('gameover')
      expect(result.events.some(e => e.type === 'GAME_OVER')).toBe(true)
    })

    it('game does NOT end when next actor has valid pits', () => {
      const board = Array(16).fill(0)
      board[0] = 1   // player seed
      board[8] = 3   // AI has seeds
      const result = executeMove(makeState(board, 'player'), 0)

      expect(result.phase).toBe('turnbased')
      expect(result.events.some(e => e.type === 'GAME_OVER')).toBe(false)
    })

    it('game over triggers when player (next actor after AI move) has no valid pits', () => {
      const board = Array(16).fill(0)
      board[8] = 1  // AI has 1 seed
      // Player has no seeds
      const result = executeMove(makeState(board, 'ai'), 8)

      expect(result.phase).toBe('gameover')
      expect(result.events.some(e => e.type === 'GAME_OVER')).toBe(true)
    })
  })

  describe('immutability', () => {
    it('does not mutate the input state', () => {
      const board = Array(16).fill(0)
      board[0] = 3
      board[8] = 3
      const state = makeState(board, 'player')
      const boardSnapshot = [...state.board]
      const eventsSnapshot = [...state.events]

      executeMove(state, 0)

      expect(state.board).toEqual(boardSnapshot)
      expect(state.events).toEqual(eventsSnapshot)
    })
  })
})
