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
