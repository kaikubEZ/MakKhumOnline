import { useGameStore } from '../store/gameStore'

export function HintPanel() {
  const { hint, isThinking, getHint, turn } = useGameStore()

  const isPlayerTurn = turn?.currentTurn === 'player'
  if (!isPlayerTurn) return null

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <button
        onClick={getHint}
        disabled={isThinking}
        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isThinking ? 'Thinking…' : '💡 Get Hint'}
      </button>
      {hint && (
        <p className="text-sm text-gray-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
          {hint}
        </p>
      )}
    </div>
  )
}
