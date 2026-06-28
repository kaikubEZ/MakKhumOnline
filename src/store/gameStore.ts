import { create } from 'zustand'
import { createInitialBoard, getValidPits } from '../game/board'
import { selectStartPit, racingTick } from '../game/racing'
import type { RacingState } from '../game/racing'
import { executeMove } from '../game/turnbased'
import type { TurnState } from '../game/turnbased'
import { sweepSeeds, determineWinner } from '../game/endgame'
import type { GameResult, GameEventType } from '../game/types'
import { askAI } from '../ai/openrouter'
import { movePrompt, hintPrompt, trashTalkPrompt, parsePit } from '../ai/prompts'

const API_KEY_STORAGE = 'makkum_api_key'
const HINT_FALLBACK = 'Hint unavailable. Look for a move that reaches your Store or captures opposite seeds.'
const TRASH_TALK_COUNT = 10

let popupSeq = 0

function eventToLabel(type: GameEventType): string | null {
  const map: Partial<Record<GameEventType, string>> = {
    CHAIN_TRIGGERED: 'CHAIN!',
    COLLISION_TRIGGERED: 'COLLISION!',
    PLAYER_DIED: 'DIED!',
    PLAYER_PAUSED: 'PAUSED',
    FREE_TURN_TRIGGERED: 'FREE TURN!',
    CAPTURE_TRIGGERED: 'KIN!',
  }
  return map[type] ?? null
}

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
  paused: boolean
  transitioning: boolean
  eventPopup: { label: string; key: number; actor: string } | null

  loadApiKey(): void
  setTransitioning(v: boolean): void
  setApiKey(key: string | null): void
  startGame(): void
  selectRacingPit(pit: number): void
  tick(): void
  playerMove(pit: number): void
  aiMove(): Promise<void>
  getHint(): Promise<void>
  loadTrashTalk(): Promise<void>
  setPaused(v: boolean): void
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
  paused: false,
  transitioning: false,
  eventPopup: null,

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

  setTransitioning(v: boolean) { set({ transitioning: v }) },

  startGame() {
    set({ phase: 'racing', racing: initRacing(), turn: null, result: null, isAITurn: false, hint: null, trashTalk: null, paused: false, transitioning: false, eventPopup: null })
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
    const { racing, phase, paused } = get()
    if (!racing || phase !== 'racing' || racing.phase === 'complete' || paused) return

    const prevLen = racing.events.length
    let state = racingTick(racing)

    // Show popup for most recent notable event
    const newEvents = state.events.slice(prevLen)
    for (let i = newEvents.length - 1; i >= 0; i--) {
      const label = eventToLabel(newEvents[i].type)
      if (label) {
        const key = ++popupSeq
        const actor = newEvents[i].actor ?? 'player'
        set({ eventPopup: { label, key, actor } })
        setTimeout(() => set(s => s.eventPopup?.key === key ? { eventPopup: null } : {}), 1400)
        break
      }
    }

    if (state.ai.status === 'paused') {
      const aiPits = getValidPits(state.board, 'ai')
      if (aiPits.length > 0) state = selectStartPit(state, 'ai', pick(aiPits))
    }

    if (state.phase === 'complete') {
      const turn: TurnState = { board: state.board, currentTurn: 'player', events: [], phase: 'turnbased' }
      set({ racing: state, transitioning: true })
      setTimeout(() => { if (get().transitioning) set({ phase: 'turnbased', turn, transitioning: false }) }, 1800)
    } else {
      set({ racing: state })
    }
  },

  playerMove(pit: number) {
    const { turn, isThinking } = get()
    if (!turn || turn.currentTurn !== 'player' || isThinking) return

    set({ hint: null, trashTalk: null })
    const prevLen = turn.events.length
    const next = executeMove(turn, pit)

    // Show popup for move outcome
    const newEvents = next.events.slice(prevLen)
    for (let i = newEvents.length - 1; i >= 0; i--) {
      const label = eventToLabel(newEvents[i].type)
      if (label) {
        const key = ++popupSeq
        set({ eventPopup: { label, key, actor: newEvents[i].actor ?? 'player' } })
        setTimeout(() => set(s => s.eventPopup?.key === key ? { eventPopup: null } : {}), 1400)
        break
      }
    }

    if (next.phase === 'gameover') {
      const finalBoard = sweepSeeds(next.board)
      set({ phase: 'gameover', turn: { ...next, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false })
    } else {
      set({ turn: next, isAITurn: next.currentTurn === 'ai' })
    }
  },

  async aiMove() {
    const { turn, apiKey, trashTalkLines, paused } = get()
    if (!turn || turn.currentTurn !== 'ai' || paused) return

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

    // Show popup for AI move outcome
    const newTurnEvents = next.events.slice(turn.events.length)
    for (let i = newTurnEvents.length - 1; i >= 0; i--) {
      const label = eventToLabel(newTurnEvents[i].type)
      if (label) {
        const key = ++popupSeq
        set({ eventPopup: { label, key, actor: newTurnEvents[i].actor ?? 'ai' } })
        setTimeout(() => set(s => s.eventPopup?.key === key ? { eventPopup: null } : {}), 1400)
        break
      }
    }

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

  setPaused(v: boolean) {
    set({ paused: v })
  },

  newGame() {
    set({ phase: 'idle', racing: null, turn: null, result: null, isAITurn: false, hint: null, trashTalk: null, trashTalkLines: [], isThinking: false, paused: false, transitioning: false, eventPopup: null })
  },
}))
