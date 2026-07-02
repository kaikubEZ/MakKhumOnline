import type { ClientMessage, ServerMessage } from './protocol'

export const SERVER_HTTP = (import.meta.env.VITE_SERVER_URL as string) || 'http://localhost:3001'
const SERVER = SERVER_HTTP.replace(/^http/, 'ws')

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
