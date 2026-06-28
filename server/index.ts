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

// Run when executed directly
import { pathToFileURL } from 'url'
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3001)
  startServer(port).then(({ port: p }) => console.log(`Server listening on :${p}`))
}
