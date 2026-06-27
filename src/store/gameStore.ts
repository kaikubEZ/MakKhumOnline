import { create } from 'zustand'
import { createInitialBoard, getValidPits } from '../game/board'
import { selectStartPit, racingTick } from '../game/racing'
import type { RacingState } from '../game/racing'
import { executeMove } from '../game/turnbased'
import type { TurnState } from '../game/turnbased'
import { sweepSeeds, determineWinner } from '../game/endgame'
import type { GameResult } from '../game/types'
import { askAI } from '../ai/openrouter'
import { movePrompt, hintPrompt, trashTalkPrompt, parsePit } from '../ai/prompts'

const API_KEY_STORAGE = 'makkum_api_key'
const HINT_FALLBACK = 'Hint unavailable. Look for a move that reaches your Store or captures opposite seeds.'
const TRASH_TALK_COUNT = 10

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
  apiKey: string | null
  isThinking: boolean
  hint: string | null
  trashTalk: string | null
  trashTalkLines: string[]

  loadApiKey(): void
  setApiKey(key: string | null): void
  startGame(): void
  selectRacingPit(pit: number): void
  tick(): void
  playerMove(pit: number): void
  aiMove(): Promise<void>
  getHint(): Promise<void>
  loadTrashTalk(): Promise<void>
  newGame(): void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  racing: null,
  turn: null,
  result: null,
  isAITurn: false,
  apiKey: null,
  isThinking: false,
  hint: null,
  trashTalk: null,
  trashTalkLines: [],

  loadApiKey() {
    const key = localStorage.getItem(API_KEY_STORAGE)
    set({ apiKey: key })
  },

  setApiKey(key: string | null) {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key)
    } else {
      localStorage.removeItem(API_KEY_STORAGE)
    }
    set({ apiKey: key })
  },

  startGame() {
    set({ phase: 'racing', racing: initRacing(), turn: null, result: null, isAITurn: false, hint: null, trashTalk: null })
    // fire-and-forget: pre-generate trash talk if key available
    get().loadTrashTalk()
  },

  async loadTrashTalk() {
    const { apiKey } = get()
    if (!apiKey) return
    const lines: string[] = []
    // Generate in parallel — 10 calls at once
    const results = await Promise.allSettled(
      Array.from({ length: TRASH_TALK_COUNT }, () =>
        askAI(apiKey, trashTalkPrompt())
      )
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) lines.push(r.value.trim())
    }
    set({ trashTalkLines: lines })
  },

  selectRacingPit(pit: number) {
    const { racing } = get()
    if (!racing) return

    let state = selectStartPit(racing, 'player', pit)

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
    const { turn, isThinking } = get()
    if (!turn || turn.currentTurn !== 'player' || isThinking) return

    set({ hint: null, trashTalk: null })
    const next = executeMove(turn, pit)

    if (next.phase === 'gameover') {
      const finalBoard = sweepSeeds(next.board)
      set({ phase: 'gameover', turn: { ...next, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false })
    } else {
      set({ turn: next, isAITurn: next.currentTurn === 'ai' })
    }
  },

  async aiMove() {
    const { turn, apiKey, trashTalkLines } = get()
    if (!turn || turn.currentTurn !== 'ai') return

    const valid = getValidPits(turn.board, 'ai')
    if (valid.length === 0) return

    set({ isThinking: true })

    let chosenPit: number
    let usedFallback = false

    if (apiKey) {
      const response = await askAI(apiKey, movePrompt(turn.board, valid))
      const parsed = response ? parsePit(response, valid) : null
      if (parsed !== null) {
        chosenPit = parsed
      } else {
        chosenPit = pick(valid)
        usedFallback = true
      }
    } else {
      chosenPit = pick(valid)
    }

    const next = executeMove(turn, chosenPit)

    // Trash talk: 70% chance, only if pre-generated lines exist
    let trashTalk: string | null = null
    if (trashTalkLines.length > 0 && Math.random() < 0.7) {
      trashTalk = pick(trashTalkLines)
    }

    if (next.phase === 'gameover') {
      const finalBoard = sweepSeeds(next.board)
      set({ phase: 'gameover', turn: { ...next, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false, isThinking: false, trashTalk })
    } else if (next.currentTurn === 'ai') {
      // Free turn — recurse after delay
      set({ turn: next, isThinking: false, trashTalk })
      setTimeout(() => get().aiMove(), 600)
    } else {
      set({ turn: next, isAITurn: false, isThinking: false, trashTalk, hint: usedFallback ? 'AI used fallback move.' : null })
    }
  },

  async getHint() {
    const { turn, apiKey, isThinking } = get()
    if (!turn || turn.currentTurn !== 'player' || isThinking) return

    const valid = getValidPits(turn.board, 'player')
    if (valid.length === 0) return

    if (!apiKey) {
      set({ hint: HINT_FALLBACK })
      return
    }

    set({ isThinking: true })
    const response = await askAI(apiKey, hintPrompt(turn.board, valid))
    set({ hint: response?.trim() ?? HINT_FALLBACK, isThinking: false })
  },

  newGame() {
    set({ phase: 'idle', racing: null, turn: null, result: null, isAITurn: false, hint: null, trashTalk: null, trashTalkLines: [], isThinking: false })
  },
}))
