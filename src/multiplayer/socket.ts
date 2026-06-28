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
