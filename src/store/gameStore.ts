import { create } from 'zustand'
import { createInitialBoard, getValidPits, oppositePit, AI_STORE, isStore as isBoardStore } from '../game/board'
import { selectStartPit, racingTick } from '../game/racing'
import type { RacingState } from '../game/racing'
import { executeMove, computeTurnFrames } from '../game/turnbased'
import type { TurnState, AnimFrame } from '../game/turnbased'
import { sweepSeeds, determineWinner } from '../game/endgame'
import type { GameResult, GameEventType, MoveRecord, GameMode, MyRole } from '../game/types'
import type { ClientMessage } from '../multiplayer/protocol'
import { askAI } from '../ai/openrouter'
import { movePrompt, hintPrompt, trashTalkPrompt, parsePit, extractTrashTalk } from '../ai/prompts'
import { sow } from '../game/sow'

type Difficulty = 'easy' | 'medium' | 'hard'
const DIFFICULTY_KEY = 'makkum_difficulty'

function scorePit(board: number[], pit: number): number {
  const { board: b, lastPit } = sow(board, pit, 'ai')
  if (lastPit === AI_STORE) return 10                                          // free turn
  const opp = oppositePit(lastPit)
  if (!isBoardStore(lastPit) && b[lastPit] === 1 && b[opp] > 0 && lastPit >= 8 && lastPit <= 14)
    return 8 + b[opp]                                                          // capture
  if (!isBoardStore(lastPit) && b[lastPit] > 1) return 3                      // chain
  return 0.1 * board[pit]                                                      // tiebreak by size
}

function mediumPick(board: number[], valid: number[]): number {
  return valid.reduce((best, p) => scorePit(board, p) >= scorePit(board, best) ? p : best, valid[0])
}

function hardPrompt(board: number[], valid: number[]): string {
  return (
    movePrompt(board, valid) +
    ` Prioritize: 1) landing in your store (free turn), 2) capturing opposite seeds (Kin), ` +
    `3) creating chains. Minimize leaving seeds in pits the player can capture.`
  )
}

const API_KEY_STORAGE = 'makkum_api_key'
const ENV_API_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY as string) || null
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
  userApiKey: string | null  // key explicitly set by user in localStorage
  isThinking: boolean
  hint: string | null
  trashTalk: string | null
  trashTalkLines: string[]
  paused: boolean
  transitioning: boolean
  eventPopup: { label: string; key: number; actor: string } | null
  tbAnim: { frames: AnimFrame[]; frame: number; pending: TurnState; trashTalk?: string | null } | null
  pitHistory: { player: number[]; ai: number[] }
  difficulty: Difficulty
  moveHistory: MoveRecord[]
  mode: GameMode
  myRole: MyRole | null
  roomCode: string | null
  opponentDisconnected: boolean
  socketSend: ((msg: ClientMessage) => void) | null

  loadApiKey(): void
  startOnlineGame(role: MyRole): void
  player2Move(pit: number): void
  applyOpponentMove(pit: number): void
  applyRacingState(state: RacingState): void
  applyRacingSelect(pit: number): void
  setSocketSend(fn: ((msg: ClientMessage) => void) | null): void
  leaveOnlineGame(): void
  setTransitioning(v: boolean): void
  setApiKey(key: string | null): void
  setDifficulty(d: Difficulty): void
  startGame(): void
  selectRacingPit(pit: number): void
  tick(): void
  tickTbAnim(): void
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
  userApiKey: null,
  isThinking: false,
  hint: null,
  trashTalk: null,
  trashTalkLines: [],
  paused: false,
  transitioning: false,
  eventPopup: null,
  tbAnim: null,
  pitHistory: { player: [], ai: [] },
  moveHistory: [],
  mode: 'local',
  myRole: null,
  roomCode: null,
  opponentDisconnected: false,
  socketSend: null,
  difficulty: (localStorage.getItem(DIFFICULTY_KEY) as Difficulty) ?? 'medium',

  loadApiKey() {
    const userKey = localStorage.getItem(API_KEY_STORAGE)
    const diff = (localStorage.getItem(DIFFICULTY_KEY) as Difficulty) ?? 'medium'
    set({ userApiKey: userKey, apiKey: userKey || ENV_API_KEY, difficulty: diff })
  },

  setDifficulty(d: Difficulty) {
    localStorage.setItem(DIFFICULTY_KEY, d)
    set({ difficulty: d })
  },

  setApiKey(key: string | null) {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key)
    } else {
      localStorage.removeItem(API_KEY_STORAGE)
    }
    set({ userApiKey: key, apiKey: key || ENV_API_KEY })
  },

  setTransitioning(v: boolean) { set({ transitioning: v }) },

  startGame() {
    set({ phase: 'racing', racing: initRacing(), turn: null, result: null, isAITurn: false, hint: null, trashTalk: null, paused: false, transitioning: false, eventPopup: null, tbAnim: null, pitHistory: { player: [], ai: [] }, moveHistory: [] })
    // fire-and-forget: pre-generate trash talk if key available
    get().loadTrashTalk()
  },

  async loadTrashTalk() {
    const { apiKey } = get()
    if (!apiKey) return
    const lines: string[] = []
    const results = await Promise.allSettled(
      Array.from({ length: TRASH_TALK_COUNT }, () =>
        askAI(apiKey, trashTalkPrompt(), 60)
      )
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const line = extractTrashTalk(r.value)
        if (line) lines.push(line)
      }
    }
    set({ trashTalkLines: lines })
  },

  selectRacingPit(pit: number) {
    const { racing, mode, myRole, socketSend } = get()
    if (!racing) return

    if (mode === 'online') {
      if (myRole === 'player1') {
        // host: apply my own pick to the 'player' side and broadcast the snapshot
        const state = selectStartPit(racing, 'player', pit)
        set({ racing: state })
        socketSend?.({ type: 'racing_state', state })
      } else {
        // guest: my pits live on the 'ai' side — send the pick to the host, who simulates
        socketSend?.({ type: 'racing_select', pit })
      }
      return
    }

    // local: pick my pit, then auto-pick a random pit for the AI opponent
    let state = selectStartPit(racing, 'player', pit)

    if (state.ai.status === 'selecting' || state.ai.status === 'paused') {
      const aiPits = getValidPits(state.board, 'ai')
      if (aiPits.length > 0) state = selectStartPit(state, 'ai', pick(aiPits))
    }

    set({ racing: state })
  },

  tick() {
    const { racing, phase, paused, mode, socketSend } = get()
    if (!racing || phase !== 'racing' || racing.phase === 'complete' || paused) return
    const isOnline = mode === 'online'

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

    // local: auto re-pick for the AI when it pauses. Online: the human guest re-picks.
    if (!isOnline && state.ai.status === 'paused') {
      const aiPits = getValidPits(state.board, 'ai')
      if (aiPits.length > 0) state = selectStartPit(state, 'ai', pick(aiPits))
    }

    if (state.phase === 'complete') {
      const turn: TurnState = { board: state.board, currentTurn: 'player', events: [], phase: 'turnbased' }
      set({ racing: state, transitioning: true })
      if (isOnline) socketSend?.({ type: 'racing_state', state })
      setTimeout(() => { if (get().transitioning) set({ phase: 'turnbased', turn, transitioning: false }) }, 1800)
    } else {
      set({ racing: state })
      if (isOnline) socketSend?.({ type: 'racing_state', state })
    }
  },

  tickTbAnim() {
    const { tbAnim, turn } = get()
    if (!tbAnim) return
    const next = tbAnim.frame + 1
    if (next >= tbAnim.frames.length) {
      const { pending } = tbAnim
      const prevLen = turn?.events.length ?? 0
      set({ tbAnim: null })
      const newEvents = pending.events.slice(prevLen)
      for (let i = newEvents.length - 1; i >= 0; i--) {
        const label = eventToLabel(newEvents[i].type)
        if (label) {
          const key = ++popupSeq
          set({ eventPopup: { label, key, actor: newEvents[i].actor ?? 'player' } })
          setTimeout(() => set(s => s.eventPopup?.key === key ? { eventPopup: null } : {}), 1400)
          break
        }
      }
      if (pending.phase === 'gameover') {
        const finalBoard = sweepSeeds(pending.board)
        set({ phase: 'gameover', turn: { ...pending, board: finalBoard }, result: determineWinner(finalBoard), isAITurn: false, isThinking: false, trashTalk: tbAnim.trashTalk ?? null })
      } else {
        set({ turn: pending, isAITurn: pending.currentTurn === 'ai', isThinking: false, trashTalk: tbAnim.trashTalk ?? null })
      }
    } else {
      set({ tbAnim: { ...tbAnim, frame: next } })
    }
  },

  playerMove(pit: number) {
    const { turn, isThinking, tbAnim } = get()
    if (!turn || turn.currentTurn !== 'player' || isThinking || tbAnim) return

    set({ hint: null, trashTalk: null })
    const { pitHistory, moveHistory, mode, socketSend } = get()
    const pending = executeMove(turn, pit)
    const frames = computeTurnFrames(turn, pit)
    const storeGain = pending.board[7] - turn.board[7]
    const rec: MoveRecord = { actor: 'player', pit, boardBefore: turn.board, validPits: getValidPits(turn.board, 'player'), storeGain }
    if (mode === 'online') socketSend?.({ type: 'move', pit })
    set({ pitHistory: { ...pitHistory, player: [...pitHistory.player, pit] }, moveHistory: [...moveHistory, rec], tbAnim: { frames, frame: 0, pending } })
  },

  async aiMove() {
    const { turn, apiKey, trashTalkLines, paused, tbAnim, difficulty, mode } = get()
    if (!turn || turn.currentTurn !== 'ai' || paused || tbAnim || mode === 'online') return

    const valid = getValidPits(turn.board, 'ai')
    if (valid.length === 0) return

    set({ isThinking: true })

    let chosenPit: number
    let usedFallback = false

    if (difficulty === 'easy') {
      chosenPit = pick(valid)
    } else if (difficulty === 'medium') {
      chosenPit = mediumPick(turn.board, valid)
    } else {
      // hard — use API with strategic prompt
      if (apiKey) {
        const response = await askAI(apiKey, hardPrompt(turn.board, valid))
        const parsed = response ? parsePit(response, valid) : null
        if (parsed !== null) {
          chosenPit = parsed
        } else {
          chosenPit = mediumPick(turn.board, valid)
          usedFallback = true
        }
      } else {
        chosenPit = mediumPick(turn.board, valid)
      }
    }

    const pending = executeMove(turn, chosenPit)
    const frames = computeTurnFrames(turn, chosenPit)

    let trashTalk: string | null = null
    if (trashTalkLines.length > 0 && Math.random() < 0.7) {
      trashTalk = pick(trashTalkLines)
    }

    const { pitHistory, moveHistory } = get()
    const storeGain = pending.board[15] - turn.board[15]
    const rec: MoveRecord = { actor: 'ai', pit: chosenPit, boardBefore: turn.board, validPits: valid, storeGain }
    set({
      isThinking: false,
      pitHistory: { ...pitHistory, ai: [...pitHistory.ai, chosenPit] },
      moveHistory: [...moveHistory, rec],
      tbAnim: { frames, frame: 0, pending, trashTalk },
      hint: usedFallback ? 'AI used fallback move.' : null,
    })
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
    set({ phase: 'idle', racing: null, turn: null, result: null, isAITurn: false, hint: null, trashTalk: null, trashTalkLines: [], isThinking: false, paused: false, transitioning: false, eventPopup: null, tbAnim: null, pitHistory: { player: [], ai: [] }, moveHistory: [], mode: 'local', myRole: null, roomCode: null, opponentDisconnected: false, socketSend: null })
  },

  setSocketSend(fn) {
    set({ socketSend: fn })
  },

  startOnlineGame(role) {
    // Online matches begin in the racing phase, just like local games. Both
    // players start in 'selecting'; the racing simulation only advances once
    // both have chosen a start pit (see App's shouldTick gate).
    set({
      phase: 'racing', racing: initRacing(), turn: null, result: null,
      isAITurn: false, mode: 'online', myRole: role,
      opponentDisconnected: false,
      hint: null, trashTalk: null, trashTalkLines: [], paused: false,
      transitioning: false, eventPopup: null, tbAnim: null,
      pitHistory: { player: [], ai: [] }, moveHistory: [],
    })
  },

  // Host only: a guest's racing pick arrives — apply it to the 'ai' side and rebroadcast.
  applyRacingSelect(pit) {
    const { racing, mode, myRole, socketSend } = get()
    if (mode !== 'online' || myRole !== 'player1' || !racing) return
    const state = selectStartPit(racing, 'ai', pit)
    set({ racing: state })
    socketSend?.({ type: 'racing_state', state })
  },

  // Guest only: adopt the host's authoritative racing snapshot and mirror its transitions.
  applyRacingState(state) {
    const { mode, myRole, racing: prev, transitioning } = get()
    if (mode !== 'online' || myRole !== 'player2') return

    // Surface a popup for the most recent notable event since the last snapshot.
    const prevLen = prev?.events.length ?? 0
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

    if (state.phase === 'complete' && !transitioning) {
      const turn: TurnState = { board: state.board, currentTurn: 'player', events: [], phase: 'turnbased' }
      set({ racing: state, transitioning: true })
      setTimeout(() => { if (get().transitioning) set({ phase: 'turnbased', turn, transitioning: false }) }, 1800)
    } else {
      set({ racing: state })
    }
  },

  player2Move(pit) {
    const { turn, tbAnim, mode, myRole, socketSend, pitHistory, moveHistory } = get()
    if (mode !== 'online' || myRole !== 'player2') return
    if (!turn || turn.currentTurn !== 'ai' || tbAnim) return
    const valid = getValidPits(turn.board, 'ai')
    if (!valid.includes(pit)) return
    const pending = executeMove(turn, pit)
    const frames = computeTurnFrames(turn, pit)
    const storeGain = pending.board[15] - turn.board[15]
    const rec: MoveRecord = { actor: 'ai', pit, boardBefore: turn.board, validPits: valid, storeGain }
    socketSend?.({ type: 'move', pit })
    set({
      pitHistory: { ...pitHistory, ai: [...pitHistory.ai, pit] },
      moveHistory: [...moveHistory, rec],
      tbAnim: { frames, frame: 0, pending },
    })
  },

  applyOpponentMove(pit) {
    const { turn, myRole, tbAnim, pitHistory, moveHistory } = get()
    if (!turn || tbAnim) return
    if (myRole === 'player1') {
      if (turn.currentTurn !== 'ai') return
      const valid = getValidPits(turn.board, 'ai')
      if (!valid.includes(pit)) return
      const pending = executeMove(turn, pit)
      const frames = computeTurnFrames(turn, pit)
      const storeGain = pending.board[15] - turn.board[15]
      const rec: MoveRecord = { actor: 'ai', pit, boardBefore: turn.board, validPits: valid, storeGain }
      set({
        pitHistory: { ...pitHistory, ai: [...pitHistory.ai, pit] },
        moveHistory: [...moveHistory, rec],
        tbAnim: { frames, frame: 0, pending },
      })
    } else {
      // myRole === 'player2': opponent is player1, their move is on 'player' side
      if (turn.currentTurn !== 'player') return
      const valid = getValidPits(turn.board, 'player')
      if (!valid.includes(pit)) return
      const pending = executeMove(turn, pit)
      const frames = computeTurnFrames(turn, pit)
      const storeGain = pending.board[7] - turn.board[7]
      const rec: MoveRecord = { actor: 'player', pit, boardBefore: turn.board, validPits: valid, storeGain }
      set({
        hint: null, trashTalk: null,
        pitHistory: { ...pitHistory, player: [...pitHistory.player, pit] },
        moveHistory: [...moveHistory, rec],
        tbAnim: { frames, frame: 0, pending },
      })
    }
  },

  leaveOnlineGame() {
    set({ mode: 'local', myRole: null, roomCode: null, opponentDisconnected: false, socketSend: null })
    get().newGame()
  },
}))
