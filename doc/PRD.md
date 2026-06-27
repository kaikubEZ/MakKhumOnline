# Mak Khum — Product Requirements Document

> **Status:** Draft for review  
> **Last updated:** 2026-06-28  
> **Read alongside:** `GAME_CONCEPT.md`, `ArtDesignConcept.md`, `UI_UX_SPEC.md`

---

## 1. Product Overview

**Mak Khum** (หมากขุม) is a browser-based, single-player Thai mancala game. The player competes against an AI opponent powered by the OpenRouter API. The game features a unique two-phase structure — a simultaneous real-time Racing Phase followed by a strategic Turn-Based Phase.

### Goals

- Deliver a playable, polished Mak Khum experience in the browser.
- Preserve the full two-phase game rules exactly as specified in `GAME_CONCEPT.md`.
- Achieve a cozy Thai folk-cartoon visual identity as specified in `ArtDesignConcept.md`.
- Make the complex rules feel understandable through clear UI feedback as specified in `UI_UX_SPEC.md`.
- Ship a working MVP fast; layer polish afterward.

### Non-Goals

- Multiplayer / real-time online play (not in scope)
- Mobile-first design (desktop-first; mobile is future consideration)
- Backend server or user accounts (fully client-side)
- Leaderboards or persistent stats

---

## 2. Target User

A player who:
- Is curious about Thai traditional games or mancala-style games
- Plays on desktop browser
- May not know the rules — needs in-game guidance
- Wants to see clean, culturally Thai visuals, not generic game UI

---

## 3. Tech Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React + TypeScript** | Component model fits phase/state-driven UI; TS catches game logic bugs at compile time |
| Build tool | **Vite** | Fast dev server, minimal config |
| Styling | **Tailwind CSS** | Utility-first; fast iteration on layout and visual states |
| Animation | **Framer Motion** | Declarative, composable; handles seed trail and popup animations |
| State management | **Zustand** | Lightweight; game state is complex enough to need a store, but not Redux-level |
| AI integration | **OpenRouter API** (fetch directly) | No SDK needed — single POST call per AI turn |
| Persistence | **localStorage** | API key only; no backend needed |
| Hosting | **Vercel or GitHub Pages** | Static export; zero infra to maintain |
| Testing | **Vitest** | Same ecosystem as Vite; unit-test game logic functions |

### Key Architecture Principle

> Game logic is pure TypeScript functions (no React). The React layer reads from Zustand state and dispatches events. Animation is visual-only — the logic tick is the source of truth.

State shape (from `UI_UX_SPEC.md §23.1`):

```ts
interface GameState {
  phase: 'menu' | 'racing' | 'turnbased' | 'gameover'
  currentTurn: 'player' | 'ai'
  boardSeeds: number[]          // index 0–15
  playerStatus: PlayerStatus
  aiStatus: AIStatus
  selectedPit: number | null
  activeAnimations: AnimationEvent[]
  lastEvent: GameEvent | null
  gameResult: 'player' | 'ai' | 'draw' | null
}
```

---

## 4. Feature Scope

### 4.1 MVP (Phase 1 — Ship)

Must work before any polish:

- [ ] Main Menu screen
- [ ] Settings modal (OpenRouter API key — save/clear/mask in localStorage)
- [ ] Rules modal (tabbed: Board, Racing Phase, Turn-Based Phase, Special Rules, Win Condition)
- [ ] Main Game Screen with board
- [ ] Board renders 16 pits with correct seed counts
- [ ] Racing Phase: simultaneous real-time play at 400ms tick
  - Player pit selection
  - Seed movement (player + AI)
  - Chain, Death, Store-Pause, Collision mechanics
  - `CHAIN!` / `DIED!` / `PAUSED` / `COLLISION!` visual feedback
  - Phase-end detection (both died once → transition)
- [ ] Turn-Based Phase: alternating turns
  - Valid pit highlighting
  - Free Turn, Capture (Kin), Chain outcomes
  - `FREE TURN!` / `KIN!` / `CHAIN!` visual feedback
  - AI turn (OpenRouter API call with fallback chain)
  - Player cannot interact during AI turn or animation
- [ ] AI trash talk bubble (~70% frequency after moves)
- [ ] Hint button (player turn only, OpenRouter API call)
- [ ] Game Over screen (sweep → score → result → replay)
- [ ] Pause menu overlay
- [ ] Fallback logic if no API key or API fails

### 4.2 Post-MVP (Phase 2 — Polish)

Add after MVP is playable and stable:

- [ ] Full seed trail animations with colored glow (blue = player, orange/red = AI)
- [ ] Avatar expressions (normal / thinking / happy / shocked / winning / losing)
- [ ] Move preview on hover (sowing path + predicted outcome label)
- [ ] Sound effects (seed drop, chain, capture, collision, game over)
- [ ] Animation speed option in Settings
- [ ] Reduced motion accessibility mode
- [ ] Mobile / tablet layout
- [ ] Credits screen
- [ ] Event log (debug mode only, toggle in Settings)

### 4.3 Out of Scope

- Real-time multiplayer
- User accounts / save games
- Backend API
- Analytics

---

## 5. AI Integration Spec

### 5.1 OpenRouter API

- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer <user_api_key>` from localStorage
- **Model failover order** (try in sequence on failure/unavailability):

```
openrouter/owl-alpha
nvidia/nemotron-3-ultra-550b-a55b:free
poolside/laguna-m.1:free
nvidia/nemotron-3-super-120b-a12b:free
openai/gpt-oss-120b:free
poolside/laguna-xs.2:free
cohere/north-mini-code:free
google/gemma-4-31b-it:free
openai/gpt-oss-20b:free
```

### 5.2 AI Turn Prompt

The game sends a system prompt explaining the current board state and asks the AI to choose a pit index. Response must be a valid pit number on the AI's side.

Minimum required context in prompt:
- Current board seeds (all 16 pits)
- Current phase
- AI's valid pits

### 5.3 Hint Prompt

When player requests hint: send board state + player's valid pits + ask for a recommended pit with one-line explanation.

Response format: short natural language, e.g. `"Try pit 3 — it may create a chain and reach your Store."`

### 5.4 Trash Talk Prompt

After AI moves (~70% chance): send a one-line smug/funny message in the AI's personality. 10–20 words max.

### 5.5 Fallback Behavior

| Condition | Behavior |
|---|---|
| No API key | AI uses local random-valid-move logic |
| API key present, call fails | Try next model in failover chain |
| All models fail | Use local random-valid-move logic; show `AI used fallback move.` |
| Hint fails | Show `Hint unavailable. Look for a move that reaches your Store or captures opposite seeds.` |

---

## 6. Game Logic Rules (Non-Negotiable)

These must be implemented exactly — do not modify for UX convenience:

| Rule | Spec |
|---|---|
| Board | 16 pits (index 0–15). Player: 0–6 (playfield) + 7 (Store). AI: 8–14 (playfield) + 15 (Store). |
| Starting seeds | 7 seeds × 14 playfield pits = 98 total |
| Sow direction | Ascending index, wrapping 15→0. Skip opponent's Store. |
| Racing tick | 400ms. Both players advance simultaneously if active. |
| Racing: Store landing | Player pauses. Must select non-empty own pit to continue. |
| Racing: Empty pit landing | Player dies (hasDiedOnce = true), hand goes inactive. |
| Racing: Chain | Landing in non-empty pit picks up all seeds, continues. |
| Racing: Collision | Both drop same pit same tick → pit gets 2 seeds. Neither player dies. |
| Racing end | Both players have died once. |
| Turn-Based: Free Turn | Last seed lands in own Store (pit 7) → play again. |
| Turn-Based: Capture (Kin) | Last seed in empty own pit + opposite has seeds → both go to own Store. |
| Turn-Based: Chain | Last seed in non-empty non-Store pit → pick up and continue. Stores never trigger chain. |
| Opposite pit formula | `oppositePit = 14 - currentPit` |
| Win condition | Either side has no valid moves. Sweep each side's remaining seeds into own Store. Most seeds wins. Equal = Draw. |

---

## 7. Screens & Routes

| Screen | Route | Notes |
|---|---|---|
| Main Menu | `/` | Entry point |
| Game | `/game` | All phases run here; no separate routes per phase |
| (Modals) | — | Rules, Settings, Pause, Hint, Game Over are overlays, not routes |

---

## 8. Development Milestones

### Milestone 1 — Game Engine (no UI)
**Goal:** Core logic works in isolation, fully tested.

- [ ] Board data structure and seed array
- [ ] Sowing function (ascending, skip opponent store)
- [ ] Racing Phase tick engine
- [ ] Chain / Death / Store-Pause / Collision detection
- [ ] Turn-Based move resolution (Free Turn / Capture / Chain)
- [ ] Win condition and seed sweep
- [ ] Unit tests for all rules (including edge cases: collision, chain-into-store, capture with empty opposite)

**Done when:** All game rules pass unit tests. No UI needed.

---

### Milestone 2 — Playable Shell (ugly is fine)
**Goal:** A human can play a complete game in the browser.

- [ ] Vite + React + TypeScript + Zustand scaffold
- [ ] Board renders pits with seed counts
- [ ] Player can click valid pits
- [ ] Racing Phase runs: player movement, AI random moves, 400ms tick
- [ ] Turn-Based Phase runs: player clicks, AI random picks
- [ ] All rule outcomes apply correctly (no animations yet — instant state updates)
- [ ] Game Over triggers and shows result

**Done when:** A full game from Racing Phase to Game Over completes with correct rules.

---

### Milestone 3 — AI Integration
**Goal:** AI uses OpenRouter API for moves, hints, and trash talk.

- [ ] Settings modal: API key input / save / clear / mask
- [ ] OpenRouter API call for AI turn with model failover
- [ ] OpenRouter API call for player hints
- [ ] Trash talk generation (~70% frequency)
- [ ] Graceful fallback to random move on API failure
- [ ] "AI is thinking..." loading state

**Done when:** AI plays via API; hint works; trash talk appears; fallback works without key.

---

### Milestone 4 — UI Polish (MVP-complete)
**Goal:** Game looks and feels like the art direction intends.

- [ ] Thai folk-cartoon visual design applied
- [ ] Phase banners (Racing Phase / Turn-Based Phase / Game Over)
- [ ] Player and AI cards with avatars, scores, status
- [ ] All pit states visually distinct (selectable, empty, active, chain, collision, death, capture)
- [ ] `CHAIN!` / `COLLISION!` / `DIED!` / `PAUSED` / `FREE TURN!` / `KIN!` popup text
- [ ] AI trash talk bubble near AI avatar
- [ ] Action helper panel with context-aware messages
- [ ] Rules modal with diagrams
- [ ] Main Menu screen
- [ ] Pause menu overlay
- [ ] Game Over modal (seed sweep animation, final scores, AI reaction, Play Again)
- [ ] Seed drop animation (basic — drop into pit + sparkle)
- [ ] Hint panel display

**Done when:** The game matches `UI_UX_SPEC.md` acceptance criteria (§22) and `ArtDesignConcept.md` visual direction.

---

### Milestone 5 — Polish & Ship
**Goal:** Ready for public link.

- [ ] Seed trail animations (colored glow per player)
- [ ] Avatar expression states
- [ ] Move preview on hover
- [ ] Accessibility: color + label (not color-only), readable pit numbers, contrast
- [ ] Performance: no jank on 400ms tick during Racing Phase
- [ ] No console errors in production
- [ ] Deploy to Vercel / GitHub Pages
- [ ] Test in Chrome, Firefox, Safari

---

## 9. Acceptance Criteria (MVP)

Pulled from `UI_UX_SPEC.md §22` — expanded with logic requirements:

### Board
- Pits 0–6 (player) and 8–14 (AI) are clearly labeled and show accurate seed counts at all times.
- Stores (7, 15) are visually distinct and show score prominently.
- Empty pits are visually different from non-empty pits.

### Racing Phase
- Player can only select non-empty own pits (0–6) to start.
- Both player and AI seeds move simultaneously every 400ms.
- Store-Pause, Empty-Pit-Death, Chain, and Collision all trigger correct logic AND visual feedback.
- Phase ends exactly when both players have died once.
- Transition overlay shows before entering Turn-Based Phase.

### Turn-Based Phase
- Only valid player pits are clickable.
- Player cannot click during AI turn or active animation.
- Free Turn, Capture (Kin), and Chain trigger correct logic AND visual feedback.
- AI takes turns via API (or fallback) and shows thinking state.

### AI & Hints
- Game is fully playable without an API key (fallback random AI).
- Hints only available on player's turn when no animation is running.
- API errors are handled gracefully — never crash the game.

### Game Over
- Correct seed sweep into each player's own Store.
- Final seed count determines winner / draw.
- Play Again restarts a full new game.

---

## 10. Open Questions

> Review these before starting Milestone 1.

1. **Seed trail animation during Racing Phase:** Should the 400ms tick wait for the seed animation to complete, or does animation run asynchronously while logic advances? (Recommendation: animation is async visual-only; logic is source of truth per `UI_UX_SPEC.md §11.3`.)

2. **AI response latency:** If the OpenRouter call takes 3–5 seconds during Turn-Based Phase, is there a max wait before falling back to random move? Suggested: 8s timeout then fallback.

3. **Racing Phase: does the player need to wait for AI to pick its starting pit before movement begins?** (Recommendation: yes — both must be selected before the tick starts.)

4. **Trash talk:** Should it call the API per move, or pre-generate a batch at game start to reduce API calls? (Recommendation: pre-generate 10–15 lines at game start; randomly pick from them.)

5. **Move preview:** Is it required for MVP or post-MVP? (`UI_UX_SPEC.md §12.3` says "does not need to be perfect in MVP".) Recommendation: post-MVP.

6. **Sound effects:** Post-MVP or MVP? Not in `UI/UX_SPEC.md §21.1` MVP scope — confirm this is acceptable.
