# Multiplayer Room System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time 2-player online mode — Player1 creates a room (6-digit code), Player2 joins via that code, both play the turn-based phase against each other over WebSockets.

**Architecture:** A minimal Node WebSocket relay server (`server/`) holds rooms in memory and forwards moves between clients; each client runs all game logic locally (client-authoritative). The existing `gameStore` gains a `mode: 'local'|'online'` flag and two new actions (`player2Move`, `applyOpponentMove`). App.tsx wires the socket to the store; the store never imports socket.ts (no circular deps).

**Tech Stack:** Node 20+, `ws` (WebSocket server), Vite/React 19, Zustand 5, TypeScript, Vitest

## Global Constraints

- No new frontend dependencies — `ws` is server-only
- Online mode skips the racing phase (too complex to sync); game starts directly at turn-based with Player1 going first
- Server is client-authoritative (relay only, no game logic); validate only room capacity and player identity
- `PlayerKey = 'player' | 'ai'` stays unchanged in game logic — Player2 "is" the AI side (pits 8–14, store at 15)
- Keep all existing single-player paths untouched; `mode === 'local'` must behave identically to today
- `server/` is a separate Node package (own `package.json`) — run independently from `npm run server`

---

## File Map

**Create:**
- `server/package.json` — Node server package, dep on `ws`
- `server/tsconfig.json` — NodeNext module resolution
- `server/protocol.ts` — canonical message types (ClientMessage, ServerMessage)
- `server/index.ts` — HTTP + WebSocket relay server, room management, exported `startServer()`
- `server/index.test.ts` — Vitest server integration tests (environment: node)
- `src/multiplayer/protocol.ts` — identical message types for client (no cross-package import)
- `src/multiplayer/socket.ts` — browser WebSocket wrapper: connect, send, onMessage, disconnect
- `src/multiplayer/socket.test.ts` — Vitest unit tests with mock WebSocket
- `src/components/LobbyScreen.tsx` — Create Room / Join Room UI
- `src/components/WaitingRoom.tsx` — "Waiting for opponent" + share code UI

**Modify:**
- `src/game/types.ts` — add `GameMode`, `MyRole` types
- `src/store/gameStore.ts` — add `mode`, `myRole`, `roomCode`, `opponentDisconnected`, `socketSend`; add `startOnlineGame`, `player2Move`, `applyOpponentMove`, `setSocketSend`, `leaveOnlineGame`
- `src/App.tsx` — add `screen` state (`'menu'|'lobby'|'waiting'|'game'`), wire socket lifecycle, render Lobby/WaitingRoom
- `src/components/Board.tsx` — add `flipped` rendering path for Player2 perspective

---

## Task 1: Server scaffolding + shared protocol types

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/protocol.ts`
- Create: `src/multiplayer/protocol.ts`
- Modify: `package.json` (root) — add `"server"` and `"server:dev"` scripts

**Interfaces:**
- Produces: `ClientMessage`, `ServerMessage` types used by Tasks 2, 3, 4

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "makkum-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node --import tsx/esm index.ts",
    "dev": "tsx watch index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.13",
    "tsx": "^4.19.2",
    "typescript": "~6.0.2",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create `server/protocol.ts`**

```typescript
export type ClientMessage = { type: 'move'; pit: number }

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'game_start'; yourRole: 'player1' | 'player2' }
  | { type: 'opponent_move'; pit: number }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }
```

- [ ] **Step 4: Create `src/multiplayer/protocol.ts`** (identical content — no cross-package import)

```typescript
export type ClientMessage = { type: 'move'; pit: number }

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'game_start'; yourRole: 'player1' | 'player2' }
  | { type: 'opponent_move'; pit: number }
  | { type: 'opponent_disconnected' }
  | { type: 'error'; message: string }
```

- [ ] **Step 5: Add scripts to root `package.json`**

In the `"scripts"` object, add after `"preview"`:

```json
"server": "cd server && npm start",
"server:dev": "cd server && npm run dev",
```

- [ ] **Step 6: Install server deps**

```bash
cd server && npm install
```

Expected: `node_modules/ws` appears in `server/node_modules/`.

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/tsconfig.json server/protocol.ts src/multiplayer/protocol.ts package.json server/node_modules
git commit -m "feat(multiplayer): server scaffold and shared protocol types"
```

---

## Task 2: WebSocket relay server

**Files:**
- Create: `server/index.ts`
- Create: `server/index.test.ts`

**Interfaces:**
- Consumes: `ClientMessage`, `ServerMessage` from `./protocol.ts`
- Produces: `startServer(port?: number): Promise<{ port: number; close(): void }>` — used by tests and `server/main.ts`

- [ ] **Step 1: Write failing test**

Create `server/index.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import WebSocket from 'ws'
import { startServer } from './index.ts'
import type { ServerMessage } from './protocol.ts'

let close: () => void
let port: number

beforeAll(async () => {
  ({ close, port } = await startServer(0))
})
afterAll(() => close())

function wsConnect(code: string): Promise<{ ws: WebSocket; messages: ServerMessage[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/rooms/${code}`)
    const messages: ServerMessage[] = []
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())))
    ws.on('open', () => resolve({ ws, messages }))
    ws.on('error', reject)
  })
}

async function nextMessage(messages: ServerMessage[], timeout = 500): Promise<ServerMessage> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (messages.length > 0) return messages.shift()!
    await new Promise(r => setTimeout(r, 10))
  }
  throw new Error('Timed out waiting for message')
}

describe('POST /rooms', () => {
  it('returns a 6-digit code', async () => {
    const res = await fetch(`http://localhost:${port}/rooms`, { method: 'POST' })
    const body = await res.json() as { code: string }
    expect(res.status).toBe(200)
    expect(body.code).toMatch(/^\d{6}$/)
  })
})

describe('WebSocket room flow', () => {
  it('two players get game_start with correct roles', async () => {
    const res = await fetch(`http://localhost:${port}/rooms`, { method: 'POST' })
    const { code } = await res.json() as { code: string }

    const p1 = await wsConnect(code)
    const p2 = await wsConnect(code)

    const msg1 = await nextMessage(p1.messages)
    const msg2 = await nextMessage(p2.messages)

    expect(msg1).toEqual({ type: 'game_start', yourRole: 'player1' })
    expect(msg2).toEqual({ type: 'game_start', yourRole: 'player2' })

    p1.ws.close(); p2.ws.close()
  })

  it('relays move from player1 to player2', async () => {
    const res = await fetch(`http://localhost:${port}/rooms`, { method: 'POST' })
    const { code } = await res.json() as { code: string }

    const p1 = await wsConnect(code)
    const p2 = await wsConnect(code)

    await nextMessage(p1.messages) // game_start
    await nextMessage(p2.messages) // game_start

    p1.ws.send(JSON.stringify({ type: 'move', pit: 3 }))
    const relayed = await nextMessage(p2.messages)
    expect(relayed).toEqual({ type: 'opponent_move', pit: 3 })

    p1.ws.close(); p2.ws.close()
  })

  it('sends opponent_disconnected when a player leaves', async () => {
    const res = await fetch(`http://localhost:${port}/rooms`, { method: 'POST' })
    const { code } = await res.json() as { code: string }

    const p1 = await wsConnect(code)
    const p2 = await wsConnect(code)

    await nextMessage(p1.messages)
    await nextMessage(p2.messages)

    p1.ws.close()
    const msg = await nextMessage(p2.messages)
    expect(msg).toEqual({ type: 'opponent_disconnected' })

    p2.ws.close()
  })

  it('rejects WS connection to unknown room', async () => {
    const { ws, messages } = await wsConnect('000000')
    const msg = await nextMessage(messages)
    expect(msg).toEqual({ type: 'error', message: 'Room not found or full' })
    ws.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run index.test.ts 2>&1 | tail -15
```

Expected: FAIL — `startServer` not found.

- [ ] **Step 3: Implement `server/index.ts`**

```typescript
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { WebSocketServer, WebSocket } from 'ws'
import type { ClientMessage, ServerMessage } from './protocol.ts'

interface Room {
  code: string
  players: WebSocket[]
  roles: Map<WebSocket, 'player1' | 'player2'>
}

const rooms = new Map<string, Room>()

function generateCode(): string {
  let code: string
  do {
    code = String(Math.floor(Math.random() * 900000) + 100000)
  } while (rooms.has(code))
  return code
}

function send(ws: WebSocket, msg: ServerMessage) {
  ws.send(JSON.stringify(msg))
}

function handleHTTP(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'POST' && req.url === '/rooms') {
    const code = generateCode()
    rooms.set(code, { code, players: [], roles: new Map() })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code }))
    return
  }

  res.writeHead(404); res.end()
}

export function startServer(port = 3001): Promise<{ port: number; close(): void }> {
  const httpServer = createServer(handleHTTP)
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    const match = req.url?.match(/^\/rooms\/(\d{6})$/)
    if (!match) { socket.destroy(); return }
    const code = match[1]
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, code)
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, code: string) => {
    const room = rooms.get(code)
    if (!room || room.players.length >= 2) {
      send(ws, { type: 'error', message: 'Room not found or full' })
      ws.close()
      return
    }

    room.players.push(ws)
    const role: 'player1' | 'player2' = room.players.length === 1 ? 'player1' : 'player2'
    room.roles.set(ws, role)

    if (room.players.length === 2) {
      for (const p of room.players) {
        send(p, { type: 'game_start', yourRole: room.roles.get(p)! })
      }
    }

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as ClientMessage
      if (msg.type === 'move') {
        const opponent = room.players.find(p => p !== ws)
        if (opponent) send(opponent, { type: 'opponent_move', pit: msg.pit })
      }
    })

    ws.on('close', () => {
      room.players = room.players.filter(p => p !== ws)
      room.roles.delete(ws)
      for (const p of room.players) {
        send(p, { type: 'opponent_disconnected' })
      }
      if (room.players.length === 0) rooms.delete(code)
    })
  })

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      const addr = httpServer.address() as AddressInfo
      resolve({
        port: addr.port,
        close: () => { wss.close(); httpServer.close() },
      })
    })
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npx vitest run index.test.ts 2>&1 | tail -15
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/index.ts server/index.test.ts
git commit -m "feat(multiplayer): WebSocket relay server with room management"
```

---

## Task 3: Client socket module

**Files:**
- Create: `src/multiplayer/socket.ts`
- Create: `src/multiplayer/socket.test.ts`

**Interfaces:**
- Consumes: `ClientMessage`, `ServerMessage` from `./protocol`
- Produces:
  - `connect(code: string): Promise<void>` — opens WS to `ws://localhost:3001/rooms/:code`
  - `send(msg: ClientMessage): void`
  - `onMessage(handler: (msg: ServerMessage) => void): () => void` — returns unsubscribe fn
  - `disconnect(): void`

- [ ] **Step 1: Write failing test**

Create `src/multiplayer/socket.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock browser WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onerror: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }
  send(data: string) { this.sent.push(data) }
  close() {}
}

vi.stubGlobal('WebSocket', MockWebSocket)

// Import AFTER stubbing
const { connect, send, onMessage, disconnect } = await import('./socket')

beforeEach(() => {
  MockWebSocket.instances = []
  disconnect()
})

describe('connect', () => {
  it('opens WS to correct URL', async () => {
    const promise = connect('123456')
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()
    await promise
    expect(ws.url).toBe('ws://localhost:3001/rooms/123456')
  })
})

describe('send', () => {
  it('sends JSON-encoded message', async () => {
    const promise = connect('123456')
    MockWebSocket.instances[0].onopen?.()
    await promise
    send({ type: 'move', pit: 5 })
    expect(MockWebSocket.instances[0].sent).toEqual(['{"type":"move","pit":5}'])
  })
})

describe('onMessage', () => {
  it('calls handler when message arrives', async () => {
    const handler = vi.fn()
    const unsub = onMessage(handler)

    const promise = connect('123456')
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()
    await promise

    ws.onmessage?.({ data: '{"type":"opponent_move","pit":11}' } as MessageEvent)
    expect(handler).toHaveBeenCalledWith({ type: 'opponent_move', pit: 11 })

    unsub()
    ws.onmessage?.({ data: '{"type":"opponent_move","pit":12}' } as MessageEvent)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/multiplayer/socket.test.ts 2>&1 | tail -15
```

Expected: FAIL — `connect` not found.

- [ ] **Step 3: Implement `src/multiplayer/socket.ts`**

```typescript
import type { ClientMessage, ServerMessage } from './protocol'

const SERVER = 'ws://localhost:3001'

let ws: WebSocket | null = null
let handlers: Array<(msg: ServerMessage) => void> = []

export function connect(code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`${SERVER}/rooms/${code}`)
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('WebSocket connection failed'))
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as ServerMessage
      for (const h of handlers) h(msg)
    }
  })
}

export function send(msg: ClientMessage) {
  ws?.send(JSON.stringify(msg))
}

export function onMessage(handler: (msg: ServerMessage) => void): () => void {
  handlers.push(handler)
  return () => { handlers = handlers.filter(h => h !== handler) }
}

export function disconnect() {
  ws?.close()
  ws = null
  handlers = []
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/multiplayer/socket.test.ts 2>&1 | tail -15
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer/socket.ts src/multiplayer/socket.test.ts src/multiplayer/protocol.ts
git commit -m "feat(multiplayer): client socket module"
```

---

## Task 4: Store multiplayer state + actions

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Consumes: `ClientMessage` from `../multiplayer/protocol` (via injected `socketSend`)
- Produces (new store shape additions):
  - `mode: 'local' | 'online'`
  - `myRole: 'player1' | 'player2' | null`
  - `roomCode: string | null`
  - `opponentDisconnected: boolean`
  - `socketSend: ((msg: ClientMessage) => void) | null`
  - `startOnlineGame(role: 'player1' | 'player2'): void`
  - `player2Move(pit: number): void`
  - `applyOpponentMove(pit: number): void`
  - `setSocketSend(fn: ((msg: ClientMessage) => void) | null): void`
  - `leaveOnlineGame(): void`

- [ ] **Step 1: Add types to `src/game/types.ts`**

The current file is:
```typescript
export type Phase = 'racing' | 'turnbased' | 'gameover'
export type PlayerKey = 'player' | 'ai'

export type GameResult = 'player' | 'ai' | 'draw'
// ... rest of file
```

Read the full file first, then append after the existing exports:

```typescript
export type GameMode = 'local' | 'online'
export type MyRole = 'player1' | 'player2'
```

- [ ] **Step 2: Write failing tests for new store actions**

Create `src/store/gameStore.multiplayer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { getValidPits } from '../game/board'

function getStore() {
  return useGameStore.getState()
}

beforeEach(() => {
  getStore().newGame()
  getStore().setSocketSend(null)
})

describe('startOnlineGame', () => {
  it('sets mode=online, myRole, phase=turnbased, skips racing', () => {
    getStore().startOnlineGame('player1')
    const s = getStore()
    expect(s.mode).toBe('online')
    expect(s.myRole).toBe('player1')
    expect(s.phase).toBe('turnbased')
    expect(s.racing).toBeNull()
    expect(s.turn).not.toBeNull()
    expect(s.turn?.currentTurn).toBe('player')
  })

  it('player2 role: phase=turnbased, currentTurn still player (player1 goes first)', () => {
    getStore().startOnlineGame('player2')
    const s = getStore()
    expect(s.myRole).toBe('player2')
    expect(s.phase).toBe('turnbased')
    expect(s.turn?.currentTurn).toBe('player')
  })
})

describe('player2Move', () => {
  it('no-op when mode is local', () => {
    getStore().startOnlineGame('player2')
    useGameStore.setState({ mode: 'local' })
    // Advance to ai turn
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('no-op when it is not ai turn', () => {
    getStore().startOnlineGame('player2')
    // currentTurn is 'player' by default — not player2's turn
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('applies move and sends via socketSend when it is ai turn', () => {
    const mockSend = vi.fn()
    getStore().startOnlineGame('player2')
    getStore().setSocketSend(mockSend)
    // Force to ai turn
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })

    const valid = getValidPits(getStore().turn!.board, 'ai')
    getStore().player2Move(valid[0])

    expect(mockSend).toHaveBeenCalledWith({ type: 'move', pit: valid[0] })
    expect(getStore().tbAnim).not.toBeNull()
  })
})

describe('applyOpponentMove', () => {
  it('player1 receiving: applies move to ai side', () => {
    getStore().startOnlineGame('player1')
    // Force to ai turn (opponent's turn from player1's view)
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    const valid = getValidPits(getStore().turn!.board, 'ai')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })

  it('player2 receiving: applies move to player side', () => {
    getStore().startOnlineGame('player2')
    // currentTurn is 'player' — opponent (player1) is moving
    const valid = getValidPits(getStore().turn!.board, 'player')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --run src/store/gameStore.multiplayer.test.ts 2>&1 | tail -15
```

Expected: FAIL — `startOnlineGame` not a function.

- [ ] **Step 4: Add multiplayer state + actions to `src/store/gameStore.ts`**

**4a.** Add the import at the top (after existing imports):

```typescript
import type { GameMode, MyRole } from '../game/types'
import type { ClientMessage } from '../multiplayer/protocol'
```

**4b.** Add to the `GameStore` interface (after `moveHistory: MoveRecord[]`):

```typescript
  mode: GameMode
  myRole: MyRole | null
  roomCode: string | null
  opponentDisconnected: boolean
  socketSend: ((msg: ClientMessage) => void) | null

  startOnlineGame(role: MyRole): void
  player2Move(pit: number): void
  applyOpponentMove(pit: number): void
  setSocketSend(fn: ((msg: ClientMessage) => void) | null): void
  leaveOnlineGame(): void
```

**4c.** Add initial values to the store object (after `moveHistory: []`):

```typescript
  mode: 'local',
  myRole: null,
  roomCode: null,
  opponentDisconnected: false,
  socketSend: null,
```

**4d.** Add new actions to the store object (after `newGame()` definition):

```typescript
  setSocketSend(fn) {
    set({ socketSend: fn })
  },

  startOnlineGame(role) {
    const firstTurn: TurnState = {
      board: createInitialBoard(),
      currentTurn: 'player',
      events: [],
      phase: 'turnbased',
    }
    set({
      phase: 'turnbased', turn: firstTurn, racing: null, result: null,
      isAITurn: false, mode: 'online', myRole: role,
      opponentDisconnected: false,
      hint: null, trashTalk: null, trashTalkLines: [], paused: false,
      transitioning: false, eventPopup: null, tbAnim: null,
      pitHistory: { player: [], ai: [] }, moveHistory: [],
    })
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
    get().socketSend  // socketSend held by App.tsx; disconnect() called there
    set({ mode: 'local', myRole: null, roomCode: null, opponentDisconnected: false, socketSend: null })
    get().newGame()
  },
```

**4e.** Modify `aiMove()` — add early return when mode is online (Player2 handles their own moves):

Find the line:
```typescript
    if (!turn || turn.currentTurn !== 'ai' || paused || tbAnim) return
```

Replace with:
```typescript
    const { mode } = get()
    if (!turn || turn.currentTurn !== 'ai' || paused || tbAnim || mode === 'online') return
```

**4f.** Modify `newGame()` — reset multiplayer state:

Find the end of the `newGame()` set call and add:
```typescript
      mode: 'local', myRole: null, roomCode: null, opponentDisconnected: false, socketSend: null,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/store/gameStore.multiplayer.test.ts 2>&1 | tail -15
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Run the full test suite to check for regressions**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all pre-existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/store/gameStore.ts src/store/gameStore.multiplayer.test.ts
git commit -m "feat(multiplayer): add online mode state and actions to game store"
```

---

## Task 5: Lobby + Waiting Room screens

**Files:**
- Create: `src/components/LobbyScreen.tsx`
- Create: `src/components/WaitingRoom.tsx`

**Interfaces:**
- Consumes: nothing from store (pure props)
- Produces:
  - `<LobbyScreen onCreateRoom() onJoinRoom(code: string) onBack() />`
  - `<WaitingRoom code roomCode: string onCancel() />`

- [ ] **Step 1: Create `src/components/LobbyScreen.tsx`**

```tsx
import { useState } from 'react'

interface Props {
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
  onBack: () => void
  error?: string | null
}

export function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, error }: Props) {
  const [mode, setMode] = useState<'menu' | 'join'>('menu')
  const [code, setCode] = useState('')

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-black text-amber-400">Join Room</h2>
        <input
          className="w-48 text-center text-3xl font-black tracking-widest bg-amber-900 border-2 border-amber-600 rounded-xl px-4 py-3 text-amber-200 outline-none focus:border-amber-400"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => onJoinRoom(code)}
            disabled={code.length !== 6}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-amber-950 font-black rounded-xl transition-colors"
          >
            Join
          </button>
          <button
            onClick={() => { setMode('menu'); setCode('') }}
            className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-300 font-semibold rounded-xl border border-amber-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-black text-amber-400 tracking-widest">MULTIPLAYER</h1>
        <p className="text-amber-600 text-sm mt-1">Play with a friend online</p>
      </div>
      <div className="flex flex-col gap-3 w-52">
        <button
          onClick={onCreateRoom}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl text-lg transition-colors shadow-lg"
        >
          Create Room
        </button>
        <button
          onClick={() => setMode('join')}
          className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
        >
          Join Room
        </button>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-amber-900/50 hover:bg-amber-900 text-amber-500 font-semibold rounded-xl transition-colors border border-amber-800"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/WaitingRoom.tsx`**

```tsx
interface Props {
  roomCode: string
  onCancel: () => void
}

export function WaitingRoom({ roomCode, onCancel }: Props) {
  return (
    <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-black text-amber-400 mb-2">Waiting for opponent…</h2>
        <p className="text-amber-600 text-sm">Share this code with your friend</p>
      </div>
      <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl px-10 py-6 text-center">
        <p className="text-amber-500 text-xs uppercase tracking-widest mb-2">Room Code</p>
        <p className="text-6xl font-black text-amber-200 tracking-[0.25em]">{roomCode}</p>
      </div>
      <div className="animate-pulse text-amber-600 text-sm">Waiting…</div>
      <button
        onClick={onCancel}
        className="px-6 py-2 bg-amber-900 hover:bg-amber-800 text-amber-400 font-semibold rounded-xl border border-amber-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Visual smoke check — confirm components render without TypeScript errors**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds (components not yet imported, so no TS errors about unused exports).

- [ ] **Step 4: Commit**

```bash
git add src/components/LobbyScreen.tsx src/components/WaitingRoom.tsx
git commit -m "feat(multiplayer): Lobby and WaitingRoom screen components"
```

---

## Task 6: App routing + Board perspective for Player2

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Board.tsx`

**Interfaces:**
- Consumes:
  - `LobbyScreen`, `WaitingRoom` from Task 5
  - `connect`, `send`, `onMessage`, `disconnect` from `../multiplayer/socket`
  - `startOnlineGame`, `player2Move`, `applyOpponentMove`, `setSocketSend`, `leaveOnlineGame`, `opponentDisconnected`, `mode`, `myRole` from store (Task 4)

- [ ] **Step 1: Add `flipped` rendering to `src/components/Board.tsx`**

The current `Board` component has `aiPits = [14,13,12,11,10,9,8]` and `playerPits = [0,1,2,3,4,5,6]`.

In Player2's flipped view:
- Their pits (8–14) are on the **bottom row**, shown left-to-right as [8,9,10,11,12,13,14]
- Opponent's pits (0–6) are on the **top row**, shown left-to-right as [6,5,4,3,2,1,0]
- Left store = board[7] labeled "OPP", right store = board[15] labeled "YOU"
- Clickable pits: 8–14 when `isAITurn && !tbAnim` (it's Player2's turn)

Read `src/components/Board.tsx`, then apply this diff:

**Change the function signature** from:
```tsx
export function Board() {
  const { phase, racing, turn, isAITurn, tbAnim, eventPopup, selectRacingPit, playerMove } = useGameStore()
```

To:
```tsx
export function Board() {
  const { phase, racing, turn, isAITurn, tbAnim, eventPopup, selectRacingPit, playerMove, player2Move, mode, myRole } = useGameStore()
  const flipped = mode === 'online' && myRole === 'player2'
```

**Change the clickable pits logic** — find:
```tsx
  if (phase === 'racing' && racing) {
    const s = racing.player.status
    if (s === 'selecting' || s === 'paused') getValidPits(board, 'player').forEach(p => clickable.add(p))
  } else if (phase === 'turnbased' && turn && !isAITurn && !tbAnim) {
    getValidPits(board, 'player').forEach(p => clickable.add(p))
  }
```

Replace with:
```tsx
  if (phase === 'racing' && racing && !flipped) {
    const s = racing.player.status
    if (s === 'selecting' || s === 'paused') getValidPits(board, 'player').forEach(p => clickable.add(p))
  } else if (phase === 'turnbased' && turn && !tbAnim) {
    if (!flipped && !isAITurn) getValidPits(board, 'player').forEach(p => clickable.add(p))
    if (flipped && isAITurn) getValidPits(board, 'ai').forEach(p => clickable.add(p))
  }
```

**Change the click handler** — find:
```tsx
  function onPitClick(pit: number) {
    if (phase === 'racing') selectRacingPit(pit)
    else if (phase === 'turnbased') playerMove(pit)
  }
```

Replace with:
```tsx
  function onPitClick(pit: number) {
    if (phase === 'racing') selectRacingPit(pit)
    else if (phase === 'turnbased') {
      if (flipped) player2Move(pit)
      else playerMove(pit)
    }
  }
```

**Change the pit layout rendering** — find the pit grid section:
```tsx
        {/* AI Store (left) */}
        <Pit seeds={board[15]} isStore label="AI" />

        {/* Pit grid */}
        <div className="flex flex-col gap-2">
          {/* AI row — pit 14 on left mirrors player row */}
          <div className="flex gap-2">
            {aiPits.map(i => (
              <Pit key={i} seeds={board[i]} state={pitState(i)} index={i} />
            ))}
          </div>
          {/* Player row */}
          <div className="flex gap-2">
            {playerPits.map(i => (
              <Pit
                key={i}
                seeds={board[i]}
                state={pitState(i)}
                onClick={clickable.has(i) ? () => onPitClick(i) : undefined}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Player Store (right) */}
        <Pit seeds={board[7]} isStore label="YOU" />
```

Replace with:
```tsx
        {/* Left store */}
        <Pit
          seeds={flipped ? board[7] : board[15]}
          isStore
          label={flipped ? 'OPP' : 'AI'}
        />

        {/* Pit grid */}
        <div className="flex flex-col gap-2">
          {/* Top row */}
          <div className="flex gap-2">
            {(flipped ? [6,5,4,3,2,1,0] : aiPits).map(i => (
              <Pit key={i} seeds={board[i]} state={pitState(i)} index={i} />
            ))}
          </div>
          {/* Bottom row (clickable) */}
          <div className="flex gap-2">
            {(flipped ? [8,9,10,11,12,13,14] : playerPits).map(i => (
              <Pit
                key={i}
                seeds={board[i]}
                state={pitState(i)}
                onClick={clickable.has(i) ? () => onPitClick(i) : undefined}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Right store */}
        <Pit
          seeds={flipped ? board[15] : board[7]}
          isStore
          label="YOU"
        />
```

- [ ] **Step 2: Add multiplayer routing to `src/App.tsx`**

**2a.** Add imports at the top of App.tsx (after existing imports):

```tsx
import { LobbyScreen } from './components/LobbyScreen'
import { WaitingRoom } from './components/WaitingRoom'
import { connect, onMessage, disconnect, send } from './multiplayer/socket'
```

**2b.** Destructure new store values in the `useGameStore()` call — add to existing destructure:

```tsx
    mode, myRole, opponentDisconnected,
    startOnlineGame, applyOpponentMove, setSocketSend, leaveOnlineGame,
```

**2c.** Add `screen` and `lobbyError` state after existing `useState` lines:

```tsx
  const [screen, setScreen] = useState<'menu' | 'lobby' | 'waiting' | 'game'>('menu')
  const [waitingCode, setWaitingCode] = useState('')
  const [lobbyError, setLobbyError] = useState<string | null>(null)
```

**2d.** Add socket lifecycle effect after `useEffect(() => { loadApiKey() }, [])`:

```tsx
  useEffect(() => {
    if (screen !== 'game') return
    const unsub = onMessage((msg) => {
      if (msg.type === 'game_start') {
        startOnlineGame(msg.yourRole)
        setScreen('game')
      } else if (msg.type === 'opponent_move') {
        applyOpponentMove(msg.pit)
      } else if (msg.type === 'opponent_disconnected') {
        useGameStore.getState().leaveOnlineGame()
        disconnect()
        setScreen('menu')
        alert('Opponent disconnected.')
      }
    })
    setSocketSend(send)
    return () => { unsub(); setSocketSend(null) }
  }, [screen])

  // Also subscribe during waiting (need game_start before screen switches)
  useEffect(() => {
    if (screen !== 'waiting') return
    const unsub = onMessage((msg) => {
      if (msg.type === 'game_start') {
        startOnlineGame(msg.yourRole)
        setScreen('game')
      }
    })
    return unsub
  }, [screen])
```

**2e.** Add multiplayer lobby handlers after the existing state declarations:

```tsx
  async function handleCreateRoom() {
    setLobbyError(null)
    try {
      const res = await fetch('http://localhost:3001/rooms', { method: 'POST' })
      const { code } = await res.json() as { code: string }
      await connect(code)
      setWaitingCode(code)
      setScreen('waiting')
    } catch {
      setLobbyError('Failed to create room. Is the server running?')
    }
  }

  async function handleJoinRoom(code: string) {
    setLobbyError(null)
    try {
      await connect(code)
      setScreen('waiting')
      // game_start arrives via the waiting-screen effect above
    } catch {
      setLobbyError('Could not connect to that room. Check the code and try again.')
    }
  }

  function handleCancelWaiting() {
    disconnect()
    setScreen('lobby')
    setWaitingCode('')
  }
```

**2f.** Add a Multiplayer button to the idle (main menu) screen — in the `if (phase === 'idle')` return block, after the existing `<button onClick={startGame}>` block, add:

```tsx
          <button
            onClick={() => setScreen('lobby')}
            className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-blue-200 font-semibold rounded-xl transition-colors border border-blue-700"
          >
            🌐 Multiplayer
          </button>
```

**2g.** Add screen renders before the `if (phase === 'idle')` check:

```tsx
  if (screen === 'lobby') {
    return (
      <LobbyScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen('menu')}
        error={lobbyError}
      />
    )
  }

  if (screen === 'waiting') {
    return <WaitingRoom roomCode={waitingCode} onCancel={handleCancelWaiting} />
  }
```

**2h.** Guard the AI turn effect so it doesn't fire in online mode — change:

```tsx
  useEffect(() => {
    if (!isAITurn || paused || tbAnim) return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn, paused, tbAnim])
```

To:

```tsx
  useEffect(() => {
    if (!isAITurn || paused || tbAnim || mode === 'online') return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn, paused, tbAnim, mode])
```

**2i.** In the game-over modal, update the "AI Wins" / "You Win" copy for online mode — find:

```tsx
              {result === 'player' ? 'You Win!' : result === 'ai' ? 'AI Wins!' : "It's a Draw!"}
```

Replace with:

```tsx
              {result === 'player' ? 'You Win!' : result === 'ai' ? (mode === 'online' ? 'Opponent Wins!' : 'AI Wins!') : "It's a Draw!"}
```

- [ ] **Step 3: Build to catch TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with 0 errors.

- [ ] **Step 4: Manual integration test**

Start the server and the app in two terminals:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
npm run dev
```

Open two browser tabs to `http://localhost:5173`.

**Tab 1:** Click "Multiplayer" → "Create Room" → note the 6-digit code.
**Tab 2:** Click "Multiplayer" → "Join Room" → enter the code → click Join.

Expected:
- Both tabs transition to the game screen.
- Tab 1 (Player1) sees the board with bottom row pits 0–6 highlighted on their turn.
- Tab 2 (Player2) sees the board flipped — bottom row shows pits 8–14 highlighted on their turn.
- A move in Tab 1 is reflected in Tab 2, and vice versa.
- Closing one tab shows an alert in the other and returns to main menu.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Board.tsx src/components/LobbyScreen.tsx src/components/WaitingRoom.tsx
git commit -m "feat(multiplayer): App routing, socket lifecycle, and Board perspective for Player2"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Player1 creates room with 6-digit code | Task 2 (POST /rooms) + Task 6 (handleCreateRoom) |
| Player2 joins via code | Task 2 (WS join) + Task 6 (handleJoinRoom) |
| Real-time move sync | Task 2 (relay) + Task 4 (applyOpponentMove) |
| Player2 sees their side highlighted | Task 6 (Board flipped) |
| Opponent disconnect handling | Task 2 (ws.on close) + Task 6 (onMessage handler) |
| Single-player unaffected | Task 4 (mode guard in aiMove, newGame reset) |
| Racing phase skipped online | Task 4 (startOnlineGame goes direct to turnbased) |
| Game-over copy for online | Task 6 step 2i |

### Placeholder Scan

No TBD/TODO/placeholder steps found. All steps include complete code.

### Type Consistency

- `ClientMessage`, `ServerMessage` — defined in Task 1, used identically in Tasks 2, 3, 4
- `MyRole = 'player1' | 'player2'` — defined in Task 4 (types.ts), used in store actions + Board
- `startOnlineGame(role: MyRole)` — defined Task 4, called Task 6
- `applyOpponentMove(pit: number)` — defined Task 4, called Task 6
- `player2Move(pit: number)` — defined Task 4, called Board Task 6
- `setSocketSend` / `socketSend` — defined Task 4, wired Task 6
- Board `flipped` is a local derived value (`mode === 'online' && myRole === 'player2'`) — no prop needed, reads from store directly

---

## Notes

- **ponytail:** server uses in-memory room store — rooms lost on restart; add Redis/persistence only if sessions need to survive deploys
- **ponytail:** no server-side turn validation — server relays blindly; add validation if cheating becomes a concern
- **ponytail:** racing phase disabled for online — add online racing sync only if needed
- **ponytail:** hardcoded `localhost:3001` in socket.ts — parameterize via `VITE_WS_URL` env var for production
