# Project State: Mak Khum

**Last updated**: 2026-06-28
**Current phase**: MVP complete (Milestone 4)
**Status**: All MVP milestones done — Milestone 5 (Polish & Ship) not started

## Active Work

None — awaiting decision on Milestone 5.

## Completed

- Milestone 1: Game Engine — 101 unit tests passing (src/game/)
- Milestone 2: Playable Shell — full game loop in browser (Zustand + Board + phases)
- Milestone 3: AI Integration — OpenRouter, model failover, hints, trash talk, fallback
- Milestone 4: UI Polish — phase banners, player/AI cards, event popups, rules modal, settings modal, pause menu, game over modal, pit labels, racing→turn-based transition overlay
- E2E: 18 Playwright tests passing (e2e/game.spec.ts)

## Tech Stack

- React 19 + TypeScript + Vite 8
- Zustand 5 (game state)
- Tailwind CSS 4 + Framer Motion (animations)
- Vitest (unit/integration, 101 tests)
- Playwright (E2E, 18 tests)
- OpenRouter API (AI moves, hints, trash talk)

## Milestone 5 (Post-MVP) — Not Started

Per PRD §4.2:
- Seed trail animations (colored glow per player)
- Avatar expression states
- Move preview on hover
- Sound effects
- Accessibility pass
- Deploy to Vercel / GitHub Pages
