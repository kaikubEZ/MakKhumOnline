import { useGameStore } from '../store/gameStore'

export function HintPanel() {
  const { hint, isThinking, getHint, turn } = useGameStore()

  const isPlayerTurn = turn?.currentTurn === 'player'
  if (!isPlayerTurn) return null

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={getHint}
        disabled={isThinking}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isThinking ? '...' : '💡 Hint'}
      </button>
      {hint && (
        <p className="text-xs text-blue-200 bg-blue-900/50 border border-blue-700/50 rounded-lg px-3 py-2 max-w-[200px] text-right">
          {hint}
        </p>
      )}
    </div>
  )
}
