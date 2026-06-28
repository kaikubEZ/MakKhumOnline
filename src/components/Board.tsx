import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { getValidPits } from '../game/board'

const POPUP_COLORS: Record<string, string> = {
  'CHAIN!': 'bg-yellow-400 text-yellow-900',
  'COLLISION!': 'bg-white text-gray-900',
  'DIED!': 'bg-red-600 text-white',
  'PAUSED': 'bg-blue-500 text-white',
  'FREE TURN!': 'bg-amber-400 text-amber-900',
  'KIN!': 'bg-purple-500 text-white',
}

function Pit({ seeds, onClick, state, isStore, label, index }: {
  seeds: number
  onClick?: () => void
  state?: 'selectable' | 'active' | 'empty'
  isStore?: boolean
  label?: string
  index?: number
}) {
  const base = isStore
    ? 'w-14 h-32 rounded-2xl border-4 flex flex-col items-center justify-center gap-1'
    : 'w-14 h-14 rounded-full border-2 flex items-center justify-center relative'

  const color = isStore
    ? 'bg-amber-700 border-amber-900 shadow-inner'
    : state === 'selectable'
      ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300 cursor-pointer hover:bg-blue-200'
      : state === 'active'
        ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300'
        : state === 'empty'
          ? 'bg-amber-200/40 border-amber-700/30'
          : 'bg-amber-100 border-amber-600'

  const textColor = isStore ? 'text-amber-100' : state === 'empty' ? 'text-amber-600/50' : 'text-amber-900'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`${base} ${color} transition-all duration-150`}
      >
        {label && <span className="text-amber-400 text-xs font-medium">{label}</span>}
        <span className={`text-xl font-black ${textColor}`}>{seeds}</span>
      </button>
      {index !== undefined && (
        <span className="text-amber-600/60 text-[10px] font-mono leading-none">{index}</span>
      )}
    </div>
  )
}

export function Board() {
  const { phase, racing, turn, isAITurn, eventPopup, selectRacingPit, playerMove } = useGameStore()

  const board = turn?.board ?? racing?.board ?? Array(16).fill(0)

  const clickable = new Set<number>()
  if (phase === 'racing' && racing) {
    const s = racing.player.status
    if (s === 'selecting' || s === 'paused') getValidPits(board, 'player').forEach(p => clickable.add(p))
  } else if (phase === 'turnbased' && turn && !isAITurn) {
    getValidPits(board, 'player').forEach(p => clickable.add(p))
  }

  // Active pits (currently being sown)
  const activePits = new Set<number>()
  if (racing?.player.pit !== null && racing?.player.status === 'moving') activePits.add(racing.player.pit!)
  if (racing?.ai.pit !== null && racing?.ai.status === 'moving') activePits.add(racing.ai.pit!)

  function pitState(i: number): 'selectable' | 'active' | 'empty' | undefined {
    if (clickable.has(i)) return 'selectable'
    if (activePits.has(i)) return 'active'
    if (board[i] === 0) return 'empty'
    return undefined
  }

  function onPitClick(pit: number) {
    if (phase === 'racing') selectRacingPit(pit)
    else if (phase === 'turnbased') playerMove(pit)
  }

  const aiPits = [14, 13, 12, 11, 10, 9, 8]
  const playerPits = [0, 1, 2, 3, 4, 5, 6]

  const popupColor = eventPopup ? (POPUP_COLORS[eventPopup.label] ?? 'bg-amber-400 text-amber-900') : ''

  return (
    <div className="relative">
      {/* Event Popup */}
      <AnimatePresence>
        {eventPopup && (
          <motion.div
            key={eventPopup.key}
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1.15, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`absolute -top-10 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full font-black text-lg z-10 shadow-lg whitespace-nowrap ${popupColor}`}
          >
            {eventPopup.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="bg-amber-800 border-4 border-amber-900 rounded-2xl p-4 shadow-2xl flex gap-3 items-center">
        {/* AI Store (left) */}
        <Pit seeds={board[15]} isStore label="AI" />

        {/* Pit grid */}
        <div className="flex flex-col gap-2">
          {/* AI row — pit 14 on left mirrors player row */}
          <div className="flex gap-2">
            {aiPits.map(i => (
              <Pit key={i} seeds={board[i]} state={pitState(i)} index={i} />
            ))}
          </div>
          {/* Player row */}
          <div className="flex gap-2">
            {playerPits.map(i => (
              <Pit
                key={i}
                seeds={board[i]}
                state={pitState(i)}
                onClick={clickable.has(i) ? () => onPitClick(i) : undefined}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Player Store (right) */}
        <Pit seeds={board[7]} isStore label="YOU" />
      </div>

      {/* Racing status strip */}
      {phase === 'racing' && racing && (
        <div className="mt-2 flex justify-between text-xs text-amber-400 px-1">
          <span>
            AI: {racing.ai.status === 'dead' ? '💀 died' : racing.ai.status === 'paused' ? '⏸ paused' : `${racing.ai.seeds} in hand`}
          </span>
          <span>
            You: {racing.player.status === 'dead' ? '💀 died' : racing.player.status === 'paused' ? '⏸ paused' : racing.player.status === 'selecting' ? 'selecting…' : `${racing.player.seeds} in hand`}
          </span>
        </div>
      )}
    </div>
  )
}
