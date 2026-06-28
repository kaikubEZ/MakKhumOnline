# Milestone 3: AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random AI moves with OpenRouter API calls, add player hints, and display AI trash talk — all with graceful fallback to random logic when no key is set or API fails.

**Architecture:** A pure `src/ai/openrouter.ts` module handles all HTTP with model failover and 8s timeout; `src/ai/prompts.ts` builds the three prompt types; the Zustand store gains `apiKey`, `isThinking`, `hint`, `trashTalk`, and `trashTalkLines` state plus async actions; three new UI components (`SettingsModal`, `HintPanel`, `TrashTalkBubble`) surface the new state. No new npm dependencies.

**Tech Stack:** fetch (browser stdlib), Zustand 5 (installed), React 19 + Tailwind 4 (installed), Vitest 4 (testing)

## Global Constraints

- OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model failover order (attempt in sequence, abort after 8s each):
  1. `openrouter/owl-alpha`
  2. `nvidia/nemotron-3-ultra-550b-a55b:free`
  3. `poolside/laguna-m.1:free`
  4. `nvidia/nemotron-3-super-120b-a12b:free`
  5. `openai/gpt-oss-120b:free`
  6. `poolside/laguna-xs.2:free`
  7. `cohere/north-mini-code:free`
  8. `google/gemma-4-31b-it:free`
  9. `openai/gpt-oss-20b:free`
- API key stored in `localStorage` key `"makkum_api_key"`
- No key → random move, no trash talk, generic hint fallback string
- All models fail → random move, show `"AI used fallback move."`, generic hint text
- Hint fallback text: `"Hint unavailable. Look for a move that reaches your Store or captures opposite seeds."`
- Trash talk fires ~70% after each AI move; pre-generated (10 lines) at game start
- Hint only available on player's turn and only when `isThinking === false`
- Board index layout: Player pits 0–6, Player Store 7, AI pits 8–14, AI Store 15
- Opposite pit formula: `14 - currentPit`
- No new npm dependencies

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/ai/openrouter.ts` | Create | Raw API client — `askAI(apiKey, prompt)` with model failover + 8s timeout |
| `src/ai/prompts.ts` | Create | Prompt builders — `movePrompt`, `hintPrompt`, `trashTalkPrompt` |
| `src/ai/openrouter.test.ts` | Create | Unit tests for failover logic and prompt parsing |
| `src/store/gameStore.ts` | Modify | Add `apiKey`, `isThinking`, `hint`, `trashTalk`, `trashTalkLines`; replace sync `aiMove` with async; add `getHint`, `loadApiKey`, `setApiKey`, `loadTrashTalk` |
| `src/components/SettingsModal.tsx` | Create | API key input/save/clear/mask UI with localStorage |
| `src/components/HintPanel.tsx` | Create | Shows `hint` state; "Get Hint" button triggers `getHint()` |
| `src/components/TrashTalkBubble.tsx` | Create | Shows `trashTalk` state near AI side |
| `src/App.tsx` | Modify | Mount new components; load API key on init; pass `isThinking` to block player input |

---

## Task 1: OpenRouter Client (`src/ai/openrouter.ts`)

**Files:**
- Create: `src/ai/openrouter.ts`
- Create: `src/ai/openrouter.test.ts`

**Interfaces:**
- Produces: `askAI(apiKey: string, prompt: string): Promise<string | null>` — returns the model's text response, or `null` if all models fail

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/openrouter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askAI } from './openrouter'

describe('askAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns response text on first model success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '42' } }] }),
    }))

    const result = await askAI('test-key', 'pick a pit')
    expect(result).toBe('42')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('tries next model on HTTP error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await askAI('test-key', 'say something')
    expect(result).toBe('hi')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns null when all models fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    const result = await askAI('test-key', 'any')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/ai/openrouter.test.ts
```

Expected: FAIL — `Cannot find module './openrouter'`

- [ ] **Step 3: Implement `src/ai/openrouter.ts`**

```ts
const MODELS = [
  'openrouter/owl-alpha',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'poolside/laguna-m.1:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'poolside/laguna-xs.2:free',
  'cohere/north-mini-code:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
]

async function callModel(apiKey: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.choices[0].message.content as string
  } finally {
    clearTimeout(timer)
  }
}

export async function askAI(apiKey: string, prompt: string): Promise<string | null> {
  for (const model of MODELS) {
    try {
      return await callModel(apiKey, model, prompt)
    } catch {
      // try next
    }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --run src/ai/openrouter.test.ts
```

Expected: 3 passing

- [ ] **Step 5: Commit**

```bash
git add src/ai/openrouter.ts src/ai/openrouter.test.ts
git commit -m "feat(ai): OpenRouter client with model failover and 8s timeout"
```

---

## Task 2: Prompt Builders (`src/ai/prompts.ts`)

**Files:**
- Create: `src/ai/prompts.ts`
- Create: `src/ai/prompts.test.ts`

**Interfaces:**
- Consumes: `board: number[]` (16-element array), `validPits: number[]`
- Produces:
  - `movePrompt(board: number[], validPits: number[]): string`
  - `hintPrompt(board: number[], validPits: number[]): string`
  - `trashTalkPrompt(): string`
  - `parsePit(text: string, validPits: number[]): number | null` — extract pit index from model response; return `null` if unparseable or not in `validPits`

- [ ] **Step 1: Write the failing tests**

```ts
// src/ai/prompts.test.ts
import { describe, it, expect } from 'vitest'
import { movePrompt, hintPrompt, trashTalkPrompt, parsePit } from './prompts'

const board = Array(16).fill(7)
const validPits = [9, 10, 11]

describe('prompts', () => {
  it('movePrompt includes board and valid pits', () => {
    const p = movePrompt(board, validPits)
    expect(p).toContain('9, 10, 11')
    expect(p).toContain('7, 7, 7')
  })

  it('hintPrompt includes valid pits', () => {
    const p = hintPrompt(board, validPits)
    expect(p).toContain('9, 10, 11')
  })

  it('trashTalkPrompt returns non-empty string', () => {
    expect(trashTalkPrompt().length).toBeGreaterThan(10)
  })
})

describe('parsePit', () => {
  it('extracts valid pit from "I choose 10"', () => {
    expect(parsePit('I choose 10', [9, 10, 11])).toBe(10)
  })

  it('returns null for pit not in validPits', () => {
    expect(parsePit('pit 5', [9, 10, 11])).toBeNull()
  })

  it('returns null when no number found', () => {
    expect(parsePit('no idea', [9, 10, 11])).toBeNull()
  })

  it('returns first valid pit number found', () => {
    expect(parsePit('9 then 11', [9, 10, 11])).toBe(9)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/ai/prompts.test.ts
```

Expected: FAIL — `Cannot find module './prompts'`

- [ ] **Step 3: Implement `src/ai/prompts.ts`**

```ts
export function movePrompt(board: number[], validPits: number[]): string {
  return (
    `You are playing Mak Khum (Thai mancala). ` +
    `Board seeds by index 0–15: [${board.join(', ')}]. ` +
    `Your pits are 8–14; index 15 is your store. ` +
    `Valid pits you can choose: [${validPits.join(', ')}]. ` +
    `Reply with ONLY a single integer — the pit index you choose. No explanation.`
  )
}

export function hintPrompt(board: number[], validPits: number[]): string {
  return (
    `You are advising a Mak Khum player. ` +
    `Board seeds by index 0–15: [${board.join(', ')}]. ` +
    `Player pits are 0–6; index 7 is their store. ` +
    `Valid pits: [${validPits.join(', ')}]. ` +
    `Suggest ONE pit and explain why in one short sentence. Format exactly: "Try pit N — reason."`
  )
}

export function trashTalkPrompt(): string {
  return (
    `You are a smug AI opponent in a Thai mancala game called Mak Khum. ` +
    `Write ONE short, funny, smug comment about your move. 10–20 words. No quotation marks.`
  )
}

export function parsePit(text: string, validPits: number[]): number | null {
  const numbers = [...text.matchAll(/\d+/g)].map(m => parseInt(m[0], 10))
  return numbers.find(n => validPits.includes(n)) ?? null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/ai/prompts.test.ts
```

Expected: all passing

- [ ] **Step 5: Commit**

```bash
git add src/ai/prompts.ts src/ai/prompts.test.ts
git commit -m "feat(ai): prompt builders and pit parser"
```

---

## Task 3: Extend Store with API-Backed AI

**Files:**
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Consumes: `askAI` from `src/ai/openrouter.ts`, `movePrompt`, `trashTalkPrompt`, `hintPrompt`, `parsePit` from `src/ai/prompts.ts`, `getValidPits` from `src/game/board.ts`
- Produces new store shape additions:
  ```ts
  apiKey: string | null
  isThinking: boolean
  hint: string | null
  trashTalk: string | null
  trashTalkLines: string[]
  loadApiKey(): void
  setApiKey(key: string | null): void
  getHint(): Promise<void>
  loadTrashTalk(): Promise<void>
  // aiMove() becomes async, clears hint, sets trashTalk after move
  ```

- [ ] **Step 1: Replace `src/store/gameStore.ts` entirely**

```ts
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
```

- [ ] **Step 2: Run the existing tests to verify nothing broke**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all pre-existing tests still pass

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): async aiMove with API, hint, trash talk, fallback"
```

---

## Task 4: Settings Modal (`src/components/SettingsModal.tsx`)

**Files:**
- Create: `src/components/SettingsModal.tsx`
- Modify: `src/App.tsx` — add settings button + mount `<SettingsModal>`

**Interfaces:**
- Consumes: `useGameStore` — `apiKey`, `setApiKey`
- Produces: `SettingsModal` component (takes `open: boolean`, `onClose: () => void`)

- [ ] **Step 1: Create `src/components/SettingsModal.tsx`**

```tsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const { apiKey, setApiKey } = useGameStore()
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)

  if (!open) return null

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 8))}` : ''

  function handleSave() {
    if (draft.trim()) {
      setApiKey(draft.trim())
      setDraft('')
    }
    onClose()
  }

  function handleClear() {
    setApiKey(null)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800">Settings</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">OpenRouter API Key</label>
          {apiKey && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-mono flex-1">{showKey ? apiKey : maskedKey}</span>
              <button
                onClick={() => setShowKey(v => !v)}
                className="text-blue-600 hover:underline text-xs"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleClear}
                className="text-red-500 hover:underline text-xs"
              >
                Clear
              </button>
            </div>
          )}
          <input
            type="password"
            placeholder={apiKey ? 'Enter new key to replace…' : 'sk-or-…'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400">
            Key is stored in your browser only. Without a key, AI uses random moves.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add settings button and mount modal in `src/App.tsx`**

Replace the top of `App.tsx` imports and add state + modal. Diff — add to `App.tsx`:

```tsx
// Add import
import { useState, useEffect } from 'react'
import { SettingsModal } from './components/SettingsModal'

// Inside App():
const [settingsOpen, setSettingsOpen] = useState(false)
const { loadApiKey } = useGameStore()

useEffect(() => { loadApiKey() }, [])

// Add in JSX near the title:
<button
  onClick={() => setSettingsOpen(true)}
  className="absolute top-4 right-4 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
>
  ⚙ Settings
</button>
<SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

Full updated `src/App.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { Board } from './components/Board'
import { SettingsModal } from './components/SettingsModal'

function statusText(phase: string, racing: ReturnType<typeof useGameStore.getState>['racing'], isThinking: boolean, result: string | null): string {
  if (phase === 'idle') return 'Press Start to play'
  if (phase === 'racing') {
    if (!racing) return ''
    const s = racing.player.status
    if (s === 'selecting') return 'Select a pit to start racing'
    if (s === 'paused') return 'Landed in your store — pick a pit to continue'
    if (s === 'dead') return 'You died! Waiting for AI...'
    return 'Racing Phase — seeds moving...'
  }
  if (phase === 'turnbased') return isThinking ? 'AI is thinking...' : 'Your turn — click a pit'
  if (phase === 'gameover') {
    if (result === 'player') return '🏆 You win!'
    if (result === 'ai') return 'AI wins!'
    return "It's a draw!"
  }
  return ''
}

export default function App() {
  const { phase, racing, turn, result, isAITurn, isThinking, startGame, tick, aiMove, loadApiKey } = useGameStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => { loadApiKey() }, [])

  const shouldTick =
    phase === 'racing' &&
    !!racing &&
    racing.player.status !== 'selecting' &&
    racing.phase !== 'complete'

  useEffect(() => {
    if (!shouldTick) return
    const id = setInterval(tick, 400)
    return () => clearInterval(id)
  }, [shouldTick])

  useEffect(() => {
    if (!isAITurn) return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn])

  const board = turn?.board ?? racing?.board

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-50">
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        ⚙ Settings
      </button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <h1 className="text-4xl font-bold text-gray-800">Mak Khum</h1>

      <p className="text-lg text-gray-600 h-7">
        {statusText(phase, racing, isThinking, result)}
      </p>

      {phase !== 'idle' && <Board />}

      {board && (
        <div className="text-sm text-gray-500">
          Player store: {board[7]} | AI store: {board[15]}
        </div>
      )}

      {phase === 'idle' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </button>
      )}

      {phase === 'gameover' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run build to verify no type errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (0 errors)

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsModal.tsx src/App.tsx
git commit -m "feat(ui): SettingsModal with API key save/clear/mask"
```

---

## Task 5: Trash Talk Bubble (`src/components/TrashTalkBubble.tsx`)

**Files:**
- Create: `src/components/TrashTalkBubble.tsx`
- Modify: `src/App.tsx` — mount the bubble

**Interfaces:**
- Consumes: `useGameStore` — `trashTalk: string | null`
- Produces: `TrashTalkBubble` component (no props — reads from store directly)

- [ ] **Step 1: Create `src/components/TrashTalkBubble.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'

export function TrashTalkBubble() {
  const trashTalk = useGameStore(s => s.trashTalk)
  if (!trashTalk) return null

  return (
    <div className="relative max-w-xs bg-orange-100 border border-orange-300 rounded-2xl px-4 py-2 text-sm text-orange-800 shadow">
      {/* ponytail: speech bubble tail via CSS triangle */}
      <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-300" />
      <span className="font-medium">AI: </span>{trashTalk}
    </div>
  )
}
```

- [ ] **Step 2: Mount in `src/App.tsx`**

Add import: `import { TrashTalkBubble } from './components/TrashTalkBubble'`

Add just above the board in JSX (inside the conditional `{phase !== 'idle' && ...}` section or inline):

```tsx
{phase === 'turnbased' && <TrashTalkBubble />}
```

Full App.tsx with the addition (add after the `<p>` status line):

```tsx
{phase === 'turnbased' && <TrashTalkBubble />}
```

- [ ] **Step 3: Run build to verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/TrashTalkBubble.tsx src/App.tsx
git commit -m "feat(ui): TrashTalkBubble renders AI smack talk after moves"
```

---

## Task 6: Hint Panel (`src/components/HintPanel.tsx`)

**Files:**
- Create: `src/components/HintPanel.tsx`
- Modify: `src/App.tsx` — mount hint panel during player's turn

**Interfaces:**
- Consumes: `useGameStore` — `hint: string | null`, `isThinking: boolean`, `getHint(): Promise<void>`, `turn.currentTurn`
- Produces: `HintPanel` component (no props — reads store directly)

- [ ] **Step 1: Create `src/components/HintPanel.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'

export function HintPanel() {
  const { hint, isThinking, getHint, turn } = useGameStore()

  const isPlayerTurn = turn?.currentTurn === 'player'
  if (!isPlayerTurn) return null

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <button
        onClick={getHint}
        disabled={isThinking}
        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isThinking ? 'Thinking…' : '💡 Get Hint'}
      </button>
      {hint && (
        <p className="text-sm text-gray-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
          {hint}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Mount in `src/App.tsx`**

Add import: `import { HintPanel } from './components/HintPanel'`

Add in JSX, inside the `phase === 'turnbased'` section (after the Board):

```tsx
{phase === 'turnbased' && <HintPanel />}
```

- [ ] **Step 3: Run build + existing tests one final time**

```bash
npm run build 2>&1 | tail -10 && npm test -- --run 2>&1 | tail -15
```

Expected: build 0 errors, all tests pass

- [ ] **Step 4: Final commit**

```bash
git add src/components/HintPanel.tsx src/App.tsx
git commit -m "feat(ui): HintPanel with get-hint button and API response display"
```

---

## Self-Review

### Spec Coverage Check

| PRD Requirement | Task |
|---|---|
| Settings modal: API key input/save/clear/mask in localStorage | Task 4 |
| OpenRouter API call for AI turn with model failover | Task 1 + Task 3 |
| 8s timeout per model | Task 1 |
| OpenRouter API call for player hints | Task 3 (`getHint`) + Task 6 (UI) |
| Trash talk generation (~70% frequency) | Task 3 (`aiMove` trash talk logic) |
| Pre-generate 10 trash talk lines at game start | Task 3 (`loadTrashTalk`) |
| Graceful fallback to random move on API failure | Task 3 (`aiMove` fallback branch) |
| `"AI used fallback move."` message | Task 3 (sets `hint` as info message) |
| Hint fallback text when API fails | Task 3 (`getHint` fallback) |
| `"AI is thinking..."` loading state | Task 4 (statusText reads `isThinking`) |
| Player cannot interact during AI turn | Task 3 (`playerMove` guards `isThinking`) |
| No API key → random move | Task 3 (`aiMove` key check) |
| All models fail → random move | Task 1 (`askAI` returns null) + Task 3 |

### Placeholder Scan
No TBDs, no "implement later", all code blocks are complete.

### Type Consistency
- `aiMove()` returns `Promise<void>` — matches `setTimeout(() => aiMove(), 600)` usage (Promise ignored, fine)
- `askAI` returns `Promise<string | null>` — matched in Task 3 null-check
- `parsePit` returns `number | null` — matched in Task 3 null-check
- `isThinking` read in `playerMove`, `getHint`, `statusText`, `HintPanel` — consistent boolean
