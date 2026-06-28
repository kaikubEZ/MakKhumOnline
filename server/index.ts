import { createServer, IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { WebSocketServer, WebSocket } from 'ws'
import type { ClientMessage, ServerMessage } from './protocol.ts'

interface Room {
  code: string
  players: WebSocket[]
  roles: Map<WebSocket, 'player1' | 'player2'>
  createdAt: number
}

const rooms = new Map<string, Room>()

// Abandoned rooms (created but never joined) are swept after this long.
const ROOM_TTL_MS = 10 * 60 * 1000

// Each player may only act on their own pits — player1 owns the bottom row,
// player2 the top row. Stores (7, 15) are never directly selectable.
const PLAYER1_PITS = new Set([0, 1, 2, 3, 4, 5, 6])
const PLAYER2_PITS = new Set([8, 9, 10, 11, 12, 13, 14])

function ownsPit(role: 'player1' | 'player2', pit: unknown): boolean {
  if (typeof pit !== 'number' || !Number.isInteger(pit)) return false
  return role === 'player1' ? PLAYER1_PITS.has(pit) : PLAYER2_PITS.has(pit)
}

function generateCode(): string {
  let code: string
  do {
    code = String(Math.floor(Math.random() * 900000) + 100000)
  } while (rooms.has(code))
  return code
}

function send(ws: WebSocket, msg: ServerMessage) {
  // Swallow errors from sending on a half-open socket — one dead peer must not
  // crash the room's message handler.
  try { ws.send(JSON.stringify(msg)) } catch { /* socket gone */ }
}

function handleHTTP(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'POST' && req.url === '/rooms') {
    const code = generateCode()
    rooms.set(code, { code, players: [], roles: new Map(), createdAt: Date.now() })
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
      let msg: ClientMessage
      try {
        msg = JSON.parse(data.toString()) as ClientMessage
      } catch {
        return // ignore malformed frames
      }
      if (!msg || typeof msg.type !== 'string') return

      // No gameplay until both players are present.
      if (room.players.length < 2) return
      const opponent = room.players.find(p => p !== ws)
      const role = room.roles.get(ws)
      if (!opponent || !role) return

      if (msg.type === 'move') {
        if (!ownsPit(role, msg.pit)) return // can only move your own pits
        send(opponent, { type: 'opponent_move', pit: msg.pit })
      } else if (msg.type === 'racing_select') {
        if (!ownsPit(role, msg.pit)) return
        send(opponent, { type: 'opponent_racing_select', pit: msg.pit })
      } else if (msg.type === 'racing_state') {
        if (role !== 'player1') return // only the host simulates racing
        send(opponent, { type: 'racing_state', state: msg.state })
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

  // Sweep abandoned rooms (created via POST but never joined).
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [code, room] of rooms) {
      if (room.players.length === 0 && now - room.createdAt > ROOM_TTL_MS) {
        rooms.delete(code)
      }
    }
  }, 60 * 1000)
  sweep.unref?.() // don't keep the process (or test runner) alive

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      const addr = httpServer.address() as AddressInfo
      resolve({
        port: addr.port,
        close: () => { clearInterval(sweep); wss.close(); httpServer.close() },
      })
    })
  })
}

// Run when executed directly
import { pathToFileURL } from 'url'
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3001)
  startServer(port).then(({ port: p }) => console.log(`Server listening on :${p}`))
}
