import { describe, it, expect } from 'vitest'
import { PLAYER_STORE, AI_STORE } from './board'
import { selectStartPit, racingTick, RacingState } from './racing'
import { executeMove, TurnState } from './turnbased'
import { sweepSeeds, determineWinner } from './endgame'

describe('integration', () => {
  describe('racing phase', () => {
    it('both actors die → phase complete, seeds conserved', () => {
      // Player picks pit 0 (1 seed), AI picks pit 8 (1 seed).
      // Both land on empty pits (1 and 9) → both die in one tick.
      const board = new Array(16).fill(0)
      board[0] = 1
      board[8] = 1
      const total = board.reduce((s: number, n: number) => s + n, 0)

      let state: RacingState = {
        board,
        player: { pit: null, seeds: 0, status: 'selecting', hasDied: false },
        ai: { pit: null, seeds: 0, status: 'selecting', hasDied: false },
        events: [],
        phase: 'racing',
      }
      state = selectStartPit(state, 'player', 0)
      state = selectStartPit(state, 'ai', 8)
      state = racingTick(state)

      expect(state.player.hasDied).toBe(true)
      expect(state.ai.hasDied).toBe(true)
      expect(state.phase).toBe('complete')
      expect(state.board.reduce((s: number, n: number) => s + n, 0)).toBe(total)
    })

    it('collision on empty pit → immunity, neither actor dies', () => {
      // Both actors at pit 3 with 1 seed → both advance to pit 4 (empty).
      // Collision immunity: no death, CHAIN_TRIGGERED for each.
      const state: RacingState = {
        board: new Array(16).fill(0),
        player: { pit: 3, seeds: 1, status: 'moving', hasDied: false },
        ai: { pit: 3, seeds: 1, status: 'moving', hasDied: false },
        events: [],
        phase: 'racing',
      }
      const next = racingTick(state)

      expect(next.player.status).not.toBe('dead')
      expect(next.ai.status).not.toBe('dead')
      expect(next.player.pit).toBe(4)
      expect(next.ai.pit).toBe(4)
      expect(next.events.filter(e => e.type === 'CHAIN_TRIGGERED')).toHaveLength(2)
    })
  })

  describe('turn-based phase', () => {
    it('chain cascade: sow triggers two chained re-sows', () => {
      // pit 0 = 2 seeds → lands at pit 2 (non-empty) → CHAIN
      // pit 2 = 2 seeds → lands at pit 5 (non-empty) → CHAIN
      // pit 5 = 1 seed → lands at pit 6 → normal terminal
      const board = new Array(16).fill(0)
      board[0] = 2
      board[2] = 2
      board[5] = 1
      board[AI_STORE] = 30 // ensure AI has seeds so no premature game over
      const state: TurnState = { board, currentTurn: 'player', events: [], phase: 'turnbased' }

      const next = executeMove(state, 0)

      const chains = next.events.filter(e => e.type === 'CHAIN_TRIGGERED')
      expect(chains.length).toBeGreaterThanOrEqual(2)
    })

    it('capture via oppositePit(6)=8: transfers seeds to player store', () => {
      // Player sows 1 seed from pit 5 → lands at pit 6 (empty own pit).
      // oppositePit(6) = 8 has 5 seeds → capture: player store gains 1+5=6.
      const board = new Array(16).fill(0)
      board[5] = 1
      board[8] = 5
      const state: TurnState = { board, currentTurn: 'player', events: [], phase: 'turnbased' }

      const next = executeMove(state, 5)

      expect(next.events.some(e => e.type === 'CAPTURE_TRIGGERED')).toBe(true)
      expect(next.board[PLAYER_STORE]).toBe(6)
      expect(next.board[6]).toBe(0)
      expect(next.board[8]).toBe(0)
    })

    it('full game: move empties AI pits → game over, sweep, winner correct', () => {
      // Player has 1 seed at pit 0; AI pits all empty.
      // After player moves, AI has no valid pits → game over.
      // After sweep, player store wins.
      const board = new Array(16).fill(0)
      board[0] = 1
      board[PLAYER_STORE] = 10
      board[AI_STORE] = 5
      const state: TurnState = { board, currentTurn: 'player', events: [], phase: 'turnbased' }

      const after = executeMove(state, 0)
      expect(after.phase).toBe('gameover')
      expect(after.events.some(e => e.type === 'GAME_OVER')).toBe(true)

      const swept = sweepSeeds(after.board)
      expect(determineWinner(swept)).toBe('player') // 10+1 > 5
    })
  })
})
