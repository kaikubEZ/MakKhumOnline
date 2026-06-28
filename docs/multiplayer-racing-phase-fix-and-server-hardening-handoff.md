# Handoff — Multiplayer Racing Phase Fix & Server Hardening

**Branch:** `fix/online-racing-phase`
**Commits:** `4a88dff` (racing fix), `d46c879` (server hardening)
**Status:** ✅ Done & verified — 127 client tests + 10 server tests passing, typecheck clean.

---

## 1. The problems we started with

| # | Symptom (what you saw) | Real cause |
|---|------------------------|-----------|
| 1 | Clicking **Multiplayer → Create Room** froze the page, nothing appeared | The multiplayer server (port `3001`) was never started. Only the website (Vite, port `5173`) was running, so the "create room" request hung. |
| 2 | After 2 players joined, one player could click a pit and the game started **without waiting** for the second player, going straight into the **turn-based** phase instead of the **racing** phase | `startOnlineGame` hardcoded `phase: 'turnbased'` and `racing: null`, so online matches skipped the racing phase that local games run. |
| 3 | (Found while fixing) The server trusted clients completely; a malformed message could crash a room | The server was a blind relay with no validation. |
| 4 | (Found while fixing) A test suite never ran and asserted the buggy behavior | `gameStore.multiplayer.test.ts` crashed at load (`localStorage` not polyfilled in jsdom) and expected `phase === 'turnbased'`. |

---

## 2. What changed

### A. Online now runs the racing phase (commit `4a88dff`)

**Design: host-authoritative lockstep.** Player1 is the host and runs the racing simulation; Player2 is the guest and only renders what the host broadcasts.

- Both players pick a start pit. The sim **does not advance until both have selected.**
- Guest's pit choice → sent to host (`racing_select`) → host applies it to the opponent ("ai") side.
- Host runs the tick loop and broadcasts the full racing snapshot each tick (`racing_state`).
- Guest renders each snapshot and mirrors the transition into the turn-based phase.
- Because `racingTick()` is deterministic given both start pits, there is no desync.

**Files:**
- `src/multiplayer/protocol.ts` / `server/protocol.ts` — added `racing_select` and `racing_state` messages (opaque snapshot on the server side).
- `server/index.ts` — relay `racing_select → opponent_racing_select`, `racing_state` passthrough.
- `src/store/gameStore.ts` — `startOnlineGame` now starts in **racing**; `selectRacingPit` routes by role (host applies locally + broadcasts, guest sends to host); `tick` broadcasts and no longer auto-picks the opponent online; added `applyRacingState` and `applyRacingSelect`.
- `src/App.tsx` — handles the new messages; `shouldTick` gate now restricts simulation to the **host** and only once **both** sides have selected.
- `src/components/Board.tsx` — the guest can now click their racing pits (the "ai" side); the status strip is perspective-aware.

### B. Server hardening (commit `d46c879`)

Done *within* the existing relay architecture (the server still does not run the game rules):

- **Crash-safe `send()`** — errors on a half-open socket are swallowed.
- **Malformed-frame safety** — `try/catch` + shape check; bad frames are ignored, not fatal.
- **No early gameplay** — messages are dropped until both players are present.
- **Pit ownership** — a player may only move/select pits on **their own side** (player1 = pits 0–6, player2 = pits 8–14).
- **Host-only racing** — `racing_state` is accepted only from player1.
- **Room TTL** — rooms created via POST but never joined are swept after 10 minutes. The timer is `unref`'d and cleared on `close()` so it never leaks into tests.

### C. Test fixes

- `src/test-setup.ts` — added an in-memory `localStorage` polyfill (the store reads `localStorage` at module load, which crashed jsdom suites).
- `src/store/gameStore.multiplayer.test.ts` — rewritten for the racing-first behavior (+5 cases).
- `server/index.test.ts` — +5 cases (racing relay, ownership drop, host-only `racing_state`, malformed-frame survival).

---

## 3. How to run it

Two processes are required — run both from the project root:

```bash
npm run dev          # frontend  → http://localhost:5173/
npm run server:dev   # multiplayer backend → ws/http on :3001
```

**Test multiplayer:** open `http://localhost:5173/` in **two browser tabs**. Create a room in one, join with the code in the other. Both land in the **Racing Phase** and the simulation waits for both players to pick a pit.

> Tip: a single `npm start` that boots both at once (via `concurrently`) would prevent forgetting the server. Not done yet — easy follow-up.

---

## 4. Verification

```bash
npx tsc -b            # clean
npx vitest run        # 127 tests pass (11 suites)  — from repo root
cd server && npx vitest run   # 10 tests pass
```

---

## 5. Known boundary / possible next steps

- **No full server authority.** The server validates message *shape* and *pit ownership*, but it does not run the game rules, so it cannot enforce full turn order or free-turn logic. Doing that properly means running the engine server-side (the game logic is importable pure TypeScript) — a larger change.
- **No reconnection** — if a socket drops, the match ends (`opponent_disconnected`).
- **Hardcoded server URL** — `ws://localhost:3001` / `http://localhost:3001` in `src/multiplayer/socket.ts` and `src/App.tsx`. Needs an env var for deployment.
- **Convenience:** add a combined `npm start` script for frontend + server.
