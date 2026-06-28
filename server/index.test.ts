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

describe('message validation & racing relay', () => {
  async function pair() {
    const res = await fetch(`http://localhost:${port}/rooms`, { method: 'POST' })
    const { code } = await res.json() as { code: string }
    const p1 = await wsConnect(code)
    const p2 = await wsConnect(code)
    await nextMessage(p1.messages) // game_start
    await nextMessage(p2.messages) // game_start
    return { p1, p2 }
  }

  it('relays racing_select from a player to the opponent', async () => {
    const { p1, p2 } = await pair()
    p2.ws.send(JSON.stringify({ type: 'racing_select', pit: 10 })) // p2 owns 8–14
    const relayed = await nextMessage(p1.messages)
    expect(relayed).toEqual({ type: 'opponent_racing_select', pit: 10 })
    p1.ws.close(); p2.ws.close()
  })

  it('relays racing_state from the host (player1) to the guest', async () => {
    const { p1, p2 } = await pair()
    p1.ws.send(JSON.stringify({ type: 'racing_state', state: { board: [1, 2, 3] } }))
    const relayed = await nextMessage(p2.messages)
    expect(relayed).toEqual({ type: 'racing_state', state: { board: [1, 2, 3] } })
    p1.ws.close(); p2.ws.close()
  })

  it('drops a move targeting the opponent\'s pits', async () => {
    const { p1, p2 } = await pair()
    p1.ws.send(JSON.stringify({ type: 'move', pit: 10 })) // 10 is player2's pit
    await expect(nextMessage(p2.messages, 150)).rejects.toThrow()
    p1.ws.close(); p2.ws.close()
  })

  it('ignores racing_state from the guest (only host may simulate)', async () => {
    const { p1, p2 } = await pair()
    p2.ws.send(JSON.stringify({ type: 'racing_state', state: {} }))
    await expect(nextMessage(p1.messages, 150)).rejects.toThrow()
    p1.ws.close(); p2.ws.close()
  })

  it('survives a malformed frame and keeps relaying afterwards', async () => {
    const { p1, p2 } = await pair()
    p1.ws.send('not json at all')
    p1.ws.send(JSON.stringify({ type: 'move', pit: 2 }))
    const relayed = await nextMessage(p2.messages)
    expect(relayed).toEqual({ type: 'opponent_move', pit: 2 })
    p1.ws.close(); p2.ws.close()
  })
})
