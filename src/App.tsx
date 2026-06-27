import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { Board } from './components/Board'

function statusText(phase: string, racing: ReturnType<typeof useGameStore.getState>['racing'], isAITurn: boolean, result: string | null): string {
  if (phase === 'idle') return 'Press Start to play'
  if (phase === 'racing') {
    if (!racing) return ''
    const s = racing.player.status
    if (s === 'selecting') return 'Select a pit to start racing'
    if (s === 'paused') return 'Landed in your store — pick a pit to continue'
    if (s === 'dead') return 'You died! Waiting for AI...'
    return 'Racing Phase — seeds moving...'
  }
  if (phase === 'turnbased') return isAITurn ? 'AI is thinking...' : 'Your turn — click a pit'
  if (phase === 'gameover') {
    if (result === 'player') return '🏆 You win!'
    if (result === 'ai') return 'AI wins!'
    return "It's a draw!"
  }
  return ''
}

export default function App() {
  const { phase, racing, turn, result, isAITurn, startGame, tick, aiMove } = useGameStore()

  // Racing tick — runs at 400ms when both have selected and phase isn't complete
  const shouldTick =
    phase === 'racing' &&
    !!racing &&
    racing.player.status !== 'selecting' &&
    racing.phase !== 'complete'

  useEffect(() => {
    if (!shouldTick) return
    const id = setInterval(tick, 400)
    return () => clearInterval(id)
  }, [shouldTick]) // tick is a stable Zustand action

  // AI turn in turn-based
  useEffect(() => {
    if (!isAITurn) return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn]) // aiMove is stable

  const board = turn?.board ?? racing?.board

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-800">Mak Khum</h1>

      <p className="text-lg text-gray-600 h-7">
        {statusText(phase, racing, isAITurn, result)}
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
