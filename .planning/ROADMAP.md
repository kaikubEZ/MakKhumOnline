# Roadmap: Mak Khum

## Overview

Browser-based single-player Thai mancala game (Mak Khum / หมากขุม). Player competes against an AI opponent powered by OpenRouter. Two-phase game structure: simultaneous Racing Phase + strategic Turn-Based Phase. Built with React + TypeScript + Vite + Zustand.

## Phases

- [x] **Phase 1: Game Engine** - Core game logic, fully tested, no UI
- [x] **Phase 2: Playable Shell** - Human-playable game in the browser with random AI
- [ ] **Phase 3: AI Integration** - AI uses OpenRouter API for moves, hints, and trash talk
- [ ] **Phase 4: UI Polish** - Thai folk-cartoon visual design, MVP-complete
- [ ] **Phase 5: Polish & Ship** - Sound, accessibility, performance, production deployment

## Phase Details

### Phase 1: Game Engine
**Goal**: Core logic works in isolation, fully tested. No UI needed.
**Depends on**: Nothing
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. All game rules pass unit tests (91/91)
  2. Racing Phase tick engine with chain/death/store-pause/collision
  3. Turn-based move resolution (free turn/capture/chain)
  4. Win condition and seed sweep

Plans:
- [x] 01-01: Board data structure and sowing function
- [x] 01-02: Racing phase tick engine
- [x] 01-03: Turn-based move resolution and win condition

### Phase 2: Playable Shell
**Goal**: A human can play a complete game in the browser.
**Depends on**: Phase 1
**Requirements**: REQ-08, REQ-09, REQ-10, REQ-11, REQ-12
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Board renders pits with seed counts
  2. Player can click valid pits in both phases
  3. Racing Phase runs with 400ms tick and AI random moves
  4. Turn-Based Phase runs with player clicks and AI random picks
  5. Game Over triggers and shows result with Play Again

Plans:
- [x] 02-01: Zustand store and game shell

### Phase 3: AI Integration
**Goal**: AI uses OpenRouter API for moves, hints, and trash talk.
**Depends on**: Phase 2
**Requirements**: REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18
**Success Criteria** (what must be TRUE):
  1. Settings modal lets player enter/save/clear/mask API key
  2. AI makes moves via OpenRouter with model failover
  3. Player can request a hint on their turn
  4. Trash talk appears ~70% of the time during AI turns
  5. Game is fully playable without an API key (fallback random AI)
  6. "AI is thinking..." state shown during API call

Plans:
- [ ] 03-01: TBD

### Phase 4: UI Polish (MVP-complete)
**Goal**: Game looks and feels like the art direction intends.
**Depends on**: Phase 3
**Requirements**: REQ-19, REQ-20, REQ-21, REQ-22, REQ-23
**Success Criteria** (what must be TRUE):
  1. Thai folk-cartoon visual identity applied to board and UI
  2. Phase banners and game-event popups visible
  3. Player and AI cards with avatars and scores
  4. Rules modal with diagrams
  5. Main menu and pause menu functional

Plans:
- [ ] 04-01: TBD

### Phase 5: Polish & Ship
**Goal**: Production-ready: sound, performance, accessibility, deployment.
**Depends on**: Phase 4
**Requirements**: REQ-24, REQ-25, REQ-26
**Success Criteria** (what must be TRUE):
  1. Sound effects and background music togglable
  2. Lighthouse performance score ≥ 90
  3. Deployed and publicly accessible

Plans:
- [ ] 05-01: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Engine | 3/3 | Complete | 2026-06-28 |
| 2. Playable Shell | 1/1 | Complete | 2026-06-28 |
| 3. AI Integration | 0/TBD | Not started | - |
| 4. UI Polish | 0/TBD | Not started | - |
| 5. Polish & Ship | 0/TBD | Not started | - |
