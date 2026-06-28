# MakKhumOnline หมากขุม

A browser-based Thai mancala game (Mak Khum) with an AI opponent powered by OpenRouter. Playable in two phases — a fast **racing phase** where seeds scatter across the board, then a **turn-based phase** with strategic move selection, hints, and AI trash talk.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Zustand.

---

## Features

- **Two-phase gameplay** — Racing phase (real-time seed sowing with chains and collisions) transitions into Turn-Based phase (strategic pit selection)
- **AI opponent** — OpenRouter client with model failover, 8s timeout, and configurable difficulty
- **Hints** — Ask the AI for suggested moves during the turn-based phase
- **Trash talk** — AI responds with smack talk after its moves
- **Game review** — Step through your full move history after the game ends
- **Configurable** — Save your OpenRouter API key in-app; no env files needed
- **Dark amber theme** — Warm Thai-inspired palette with animated transitions

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173, click **Settings**, paste your OpenRouter API key, then **Play Game**.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run unit + integration tests (Vitest) |
| `npm run lint` | Lint with Oxlint |

---

## How to Play

1. **Racing phase** — Click any non-empty pit on your side to start seeds racing around the board. Seeds chain and collide as they go.
2. **Turn-based phase** — Click highlighted pits to make moves. Land your last seed in your store (pit 7) for a free turn.
3. **Win condition** — When one side empties, remaining seeds sweep to that opponent's store. Most seeds wins.

Full rules are available in-game via the **📖 Rules** button.

---

## Project Structure

```
src/
├── ai/                  # OpenRouter client, prompt builders, pit parser
│   ├── openrouter.ts
│   ├── prompts.ts
│   └── *.test.ts
├── components/          # React UI
│   ├── Board.tsx         # 16-pit board rendering
│   ├── HintPanel.tsx     # Get-hint button + response display
│   ├── TrashTalkBubble.tsx
│   ├── SettingsModal.tsx # API key management
│   ├── RulesModal.tsx
│   └── ReviewModal.tsx  # Move history replay
├── game/                # Game engine (pure logic)
│   ├── board.ts          # Board state & pit indexing
│   ├── sow.ts            # Sowing logic & collision handling
│   ├── racing.ts         # Racing-phase tick engine
│   ├── turnbased.ts      # Turn-based move resolution
│   ├── endgame.ts        # Win condition & seed sweep
│   ├── types.ts          # Phase, PlayerKey, MoveRecord, GameEvent
│   └── *.test.ts
├── store/
│   └── gameStore.ts      # Zustand store (game state + AI integration)
├── App.tsx               # Main shell, phase routing, overlays
└── main.tsx              # Entry point
```

---

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite** — Fast dev server and build tool
- **Tailwind CSS v4** — Utility-first styling via `@tailwindcss/vite`
- **Zustand** — Lightweight state management
- **OpenRouter** — Unified LLM API (supports Claude, GPT, Gemini, etc.)
- **Vitest** + **@testing-library/react** — Unit and integration tests
- **Oxlint** — Fast linter

---

## Deployment

This project is deployed on Vercel. Make sure the **Framework Preset** is set to **Vite** (not Next.js) in your Vercel project settings.

---

## License

MIT
