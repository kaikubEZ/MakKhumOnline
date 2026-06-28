import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/gameStore.ts'

if (import.meta.env.DEV) {
  // ponytail: test hook — lets E2E tests inject state via window.__gameStore
  ;(window as unknown as Record<string, unknown>).__gameStore = useGameStore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
