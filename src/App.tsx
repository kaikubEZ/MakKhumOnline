import { useState, useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { Board } from './components/Board'
import { SettingsModal } from './components/SettingsModal'

function statusText(phase: string, racing: ReturnType<typeof useGameStore.getState>['racing'], isThinking: boolean, result: string | null): string {
  if (phase === 'idle') return 'Press Start to play'
  if (phase === 'racing') {
    if (!racing) return ''
    const s = racing.player.status
    if (s === 'selecting') return 'Select a pit to start racing'
    if (s === 'paused') return 'Landed in your store — pick a pit to continue'
    if (s === 'dead') return 'You died! Waiting for AI...'
    return 'Racing Phase — seeds moving...'
  }
  if (phase === 'turnbased') return isThinking ? 'AI is thinking...' : 'Your turn — click a pit'
  if (phase === 'gameover') {
    if (result === 'player') return '🏆 You win!'
    if (result === 'ai') return 'AI wins!'
    return "It's a draw!"
  }
  return ''
}

export default function App() {
  const { phase, racing, turn, result, isAITurn, isThinking, startGame, tick, aiMove, loadApiKey } = useGameStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => { loadApiKey() }, [])

  const shouldTick =
    phase === 'racing' &&
    !!racing &&
    racing.player.status !== 'selecting' &&
    racing.phase !== 'complete'

  useEffect(() => {
    if (!shouldTick) return
    const id = setInterval(tick, 400)
    return () => clearInterval(id)
  }, [shouldTick])

  useEffect(() => {
    if (!isAITurn) return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn])

  const board = turn?.board ?? racing?.board

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-50">
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        ⚙ Settings
      </button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <h1 className="text-4xl font-bold text-gray-800">Mak Khum</h1>

      <p className="text-lg text-gray-600 h-7">
        {statusText(phase, racing, isThinking, result)}
      </p>

      {phase !== 'idle' && <Board />}

      {board && (
        <div className="text-sm text-gray-500">
          Player store: {board[7]} | AI store: {board[15]}
        </div>
      )}

      {phase === 'idle' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </button>
      )}

      {phase === 'gameover' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  )
}
