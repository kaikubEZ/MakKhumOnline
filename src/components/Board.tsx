import { useGameStore } from '../store/gameStore'
import { getValidPits } from '../game/board'

function Pit({ seeds, onClick, highlight, isStore }: {
  seeds: number
  onClick?: () => void
  highlight?: boolean
  isStore?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={[
        isStore ? 'w-16 h-36 rounded-2xl' : 'w-16 h-16 rounded-full',
        'border-2 flex items-center justify-center text-xl font-bold transition-colors',
        highlight
          ? 'border-blue-500 bg-blue-100 hover:bg-blue-200 cursor-pointer'
          : 'border-gray-400 bg-gray-100 cursor-default',
      ].join(' ')}
    >
      {seeds}
    </button>
  )
}

export function Board() {
  const { phase, racing, turn, isAITurn, selectRacingPit, playerMove } = useGameStore()

  const board = turn?.board ?? racing?.board ?? Array(16).fill(0)

  const clickable = new Set<number>()
  if (phase === 'racing' && racing) {
    const s = racing.player.status
    if (s === 'selecting' || s === 'paused') getValidPits(board, 'player').forEach(p => clickable.add(p))
  } else if (phase === 'turnbased' && turn && !isAITurn) {
    getValidPits(board, 'player').forEach(p => clickable.add(p))
  }

  function onPitClick(pit: number) {
    if (phase === 'racing') selectRacingPit(pit)
    else if (phase === 'turnbased') playerMove(pit)
  }

  // AI row: pits 14→8 (visually mirrors player row), store 15
  // Player row: pits 0→6, store 7
  const aiPits = [14, 13, 12, 11, 10, 9, 8]
  const playerPits = [0, 1, 2, 3, 4, 5, 6]

  return (
    <div className="flex gap-4 items-center">
      {/* AI store (left) */}
      <Pit seeds={board[15]} isStore />

      {/* Pit grid */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {aiPits.map(i => <Pit key={i} seeds={board[i]} />)}
        </div>
        <div className="flex gap-2">
          {playerPits.map(i => (
            <Pit
              key={i}
              seeds={board[i]}
              highlight={clickable.has(i)}
              onClick={clickable.has(i) ? () => onPitClick(i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Player store (right) */}
      <Pit seeds={board[7]} isStore />
    </div>
  )
}
