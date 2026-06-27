import { create } from 'zustand'
import { createInitialBoard, getValidPits } from '../game/board'
import { selectStartPit, racingTick } from '../game/racing'
import type { RacingState } from '../game/racing'
import { executeMove } from '../game/turnbased'
import type { TurnState } from '../game/turnbased'
import { sweepSeeds, determineWinner } from '../game/endgame'
import type { GameResult } from '../game/types'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function initRacing(): RacingState {
  return {
    board: createInitialBoard(),
    player: { pit: null, seeds: 0, status: 'selecting', hasDied: false },
    ai: { pit: null, seeds: 0, status: 'selecting', hasDied: false },
    events: [],
    phase: 'racing',
  }
}

interface GameStore {
  phase: 'idle' | 'racing' | 'turnbased' | 'gameover'
  racing: RacingState | null
  turn: TurnState | null
  result: GameResult | null
  isAITurn: boolean

  startGame(): void
  selectRacingPit(pit: number): void
  tick(): void
  playerMove(pit: number): void
  aiMove(): void
  newGame(): void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  racing: null,
  turn: null,
  result: null,
  isAITurn: false,

  startGame() {
    set({ phase: 'racing', racing: initRacing(), turn: null, result: null, isAITurn: false })
  },

  selectRacingPit(pit: number) {
    const { racing } = get()
    if (!racing) return

    let state = selectStartPit(racing, 'player', pit)

    // AI auto-picks when it needs to select or re-pick after pause
    if (state.ai.status === 'selecting' || state.ai.status === 'paused') {
      const aiPits = getValidPits(state.board, 'ai')
      if (aiPits.length > 0) state = selectStartPit(state, 'ai', pick(aiPits))
    }

    set({ racing: state })
  },

  tick() {
    const { racing, phase } = get()
    if (!racing || phase !== 'racing' || racing.phase === 'complete') return

    let state = racingTick(racing)

    // AI auto-re-picks after pause
    if (state.ai.status === 'paused') {
      const aiPits = getValidPits(state.board, 'ai')
      if (aiPits.length > 0) state = selectStartPit(state, 'ai', pick(aiPits))
    }

    if (state.phase === 'complete') {
      const turn: TurnState = { board: state.board, currentTurn: 'player', events: [], phase: 'turnbased' }
      set({ phase: 'turnbased', racing: state, turn })
    } else {
      set({ racing: state })
    }
  },

  playerMove(pit: number) {
    const { turn } = get()
    if (!turn || turn.currentTurn !== 'player') return

    const next = executeMove(turn, pit)

    if (next.phase === 'gameover') {
      const finalBoard = sweepSeeds(next.board)
      set({ phase: 'gameover', turn: { ...next, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false })
    } else {
      set({ turn: next, isAITurn: next.currentTurn === 'ai' })
    }
  },

  aiMove() {
    const { turn } = get()
    if (!turn || turn.currentTurn !== 'ai') return

    const valid = getValidPits(turn.board, 'ai')
    if (valid.length === 0) return

    const next = executeMove(turn, pick(valid))

    if (next.phase === 'gameover') {
      const finalBoard = sweepSeeds(next.board)
      set({ phase: 'gameover', turn: { ...next, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false })
    } else if (next.currentTurn === 'ai') {
      // Free turn — schedule next AI move internally
      set({ turn: next })
      setTimeout(() => get().aiMove(), 600)
    } else {
      set({ turn: next, isAITurn: false })
    }
  },

  newGame() {
    set({ phase: 'idle', racing: null, turn: null, result: null, isAITurn: false })
  },
}))
