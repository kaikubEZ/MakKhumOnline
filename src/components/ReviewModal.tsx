import { useMemo, useState, useEffect, useRef } from 'react'
import { executeMove } from '../game/turnbased'
import type { MoveRecord } from '../game/types'

interface Props { moves: MoveRecord[]; onClose: () => void }

const PLAYER_STORE = 7
const AI_STORE = 15

function evalBoard(board: number[], actor: 'player' | 'ai'): number {
  return actor === 'player'
    ? board[PLAYER_STORE] - board[AI_STORE]
    : board[AI_STORE] - board[PLAYER_STORE]
}

interface MoveAnalysis {
  record: MoveRecord
  bestPit: number
  delta: number
  grade: Grade
}

type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

const GRADE_META: Record<Grade, { symbol: string; label: string; color: string; pill: string }> = {
  best:       { symbol: '✨', label: 'Best',       color: 'text-teal-300',   pill: 'bg-teal-900 border-teal-600 text-teal-300' },
  good:       { symbol: '✓',  label: 'Good',       color: 'text-green-400',  pill: 'bg-green-900 border-green-600 text-green-300' },
  inaccuracy: { symbol: '?!', label: 'Inaccuracy', color: 'text-yellow-400', pill: 'bg-yellow-900 border-yellow-600 text-yellow-300' },
  mistake:    { symbol: '?',  label: 'Mistake',    color: 'text-orange-400', pill: 'bg-orange-900 border-orange-600 text-orange-300' },
  blunder:    { symbol: '??', label: 'Blunder',    color: 'text-red-400',    pill: 'bg-red-950 border-red-700 text-red-300' },
}

function gradeFromDelta(d: number): Grade {
  if (d === 0)  return 'best'
  if (d <= 3)   return 'good'
  if (d <= 7)   return 'inaccuracy'
  if (d <= 12)  return 'mistake'
  return 'blunder'
}

function analyzeMove(rec: MoveRecord): MoveAnalysis {
  const fake = { board: rec.boardBefore, currentTurn: rec.actor, events: [], phase: 'turnbased' as const }
  const evals = rec.validPits.map(p => ({ pit: p, val: evalBoard(executeMove(fake, p).board, rec.actor) }))
  const best = evals.reduce((a, b) => b.val > a.val ? b : a)
  const chosen = evals.find(e => e.pit === rec.pit) ?? { pit: rec.pit, val: best.val }
  const delta = best.val - chosen.val
  return { record: rec, bestPit: best.pit, delta, grade: gradeFromDelta(delta) }
}

// ── Mini board ──────────────────────────────────────────────────────────────
function BoardPreview({ board, chosenPit, bestPit, validPits, actor }: {
  board: number[]
  chosenPit: number
  bestPit: number
  validPits: number[]
  actor: 'player' | 'ai'
}) {
  const aiPits = [14, 13, 12, 11, 10, 9, 8]
  const playerPits = [0, 1, 2, 3, 4, 5, 6]

  function pitClass(i: number) {
    const isChosen = i === chosenPit
    const isBest = i === bestPit
    const isValid = validPits.includes(i)
    if (isChosen && isBest)
      return 'bg-teal-300 border-teal-400 ring-2 ring-teal-300 text-teal-900'
    if (isChosen)
      return actor === 'player'
        ? 'bg-blue-300 border-blue-400 ring-2 ring-blue-300 text-blue-900'
        : 'bg-orange-300 border-orange-400 ring-2 ring-orange-300 text-orange-900'
    if (isBest)
      return 'bg-green-300 border-green-400 ring-2 ring-green-300 text-green-900'
    if (isValid)
      return 'bg-amber-200/60 border-amber-500/60 text-amber-800'
    return board[i] === 0
      ? 'bg-amber-200/20 border-amber-700/30 text-amber-700/40'
      : 'bg-amber-100 border-amber-500 text-amber-900'
  }

  function Pit({ idx, store }: { idx: number; store?: boolean }) {
    const cls = store
      ? 'w-9 h-20 rounded-xl border-2 bg-amber-700 border-amber-900 flex flex-col items-center justify-center gap-0.5'
      : `w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black transition-all ${pitClass(idx)}`
    return (
      <div className={cls}>
        {store && <span className="text-amber-400 text-[9px]">{idx === AI_STORE ? 'AI' : 'YOU'}</span>}
        <span className={store ? 'text-amber-100 font-black text-sm' : ''}>{board[idx]}</span>
      </div>
    )
  }

  return (
    <div className="bg-amber-800 border-2 border-amber-900 rounded-xl p-2.5 flex gap-2 items-center shadow-inner">
      <Pit idx={AI_STORE} store />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">{aiPits.map(i => <Pit key={i} idx={i} />)}</div>
        <div className="flex gap-1.5">{playerPits.map(i => <Pit key={i} idx={i} />)}</div>
      </div>
      <Pit idx={PLAYER_STORE} store />
    </div>
  )
}

// ── Legend ──────────────────────────────────────────────────────────────────
function Legend({ actor, delta }: { actor: 'player' | 'ai'; delta: number }) {
  const chosenColor = actor === 'player' ? 'bg-blue-400' : 'bg-orange-400'
  return (
    <div className="flex gap-3 text-[10px] text-amber-400 flex-wrap">
      <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${delta === 0 ? 'bg-teal-400' : chosenColor}`} /> Chosen pit</span>
      {delta > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Best pit</span>}
    </div>
  )
}

// ── Summary ──────────────────────────────────────────────────────────────────
function Summary({ analyses }: { analyses: MoveAnalysis[] }) {
  function acc(actor: 'player' | 'ai') {
    const mine = analyses.filter(a => a.record.actor === actor)
    if (!mine.length) return '—'
    return Math.round(100 * mine.filter(a => a.delta <= 3).length / mine.length) + '%'
  }
  const grades: Grade[] = ['best', 'good', 'inaccuracy', 'mistake', 'blunder']
  function counts(actor: 'player' | 'ai') {
    const mine = analyses.filter(a => a.record.actor === actor)
    return grades.map(g => ({ g, n: mine.filter(a => a.grade === g).length })).filter(x => x.n > 0)
  }
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-amber-800 shrink-0">
      {(['player', 'ai'] as const).map(actor => (
        <div key={actor} className={`rounded-xl border p-2.5 ${actor === 'player' ? 'bg-blue-950/50 border-blue-800' : 'bg-orange-950/50 border-orange-800'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${actor === 'player' ? 'text-blue-400' : 'text-orange-400'}`}>
            {actor === 'player' ? '🧑 You' : '🦊 AI'} · {acc(actor)} accuracy
          </div>
          <div className="flex gap-1 flex-wrap">
            {counts(actor).map(({ g, n }) => {
              const m = GRADE_META[g]
              return <span key={g} className={`px-1 py-0.5 rounded text-[9px] font-bold border ${m.pill}`}>{m.symbol} {n}</span>
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function ReviewModal({ moves, onClose }: Props) {
  const analyses = useMemo(() => moves.map(analyzeMove), [moves])
  const [sel, setSel] = useState<number>(0)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    itemRefs.current[sel]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sel])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')   setSel(s => Math.max(0, s - 1))
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setSel(s => Math.min(analyses.length - 1, s + 1))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [analyses.length, onClose])

  if (moves.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl p-8 flex flex-col gap-4 items-center">
          <p className="text-amber-300">No moves to review.</p>
          <button onClick={onClose} className="px-4 py-2 bg-amber-700 text-amber-100 rounded-xl">Close</button>
        </div>
      </div>
    )
  }

  const a = analyses[sel]
  const m = GRADE_META[a.grade]

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-3">
      <div className="bg-amber-950 border-2 border-amber-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[95vh] shadow-2xl">

        {/* Header */}
        <div className="px-4 py-3 border-b border-amber-800 flex items-center justify-between shrink-0">
          <h2 className="text-amber-200 font-black text-lg tracking-wide">📊 Game Review</h2>
          <button onClick={onClose} className="text-amber-500 hover:text-amber-300 text-2xl leading-none px-1">×</button>
        </div>

        {/* Summary */}
        <Summary analyses={analyses} />

        {/* Board preview */}
        <div className="px-4 pt-3 shrink-0 flex flex-col gap-2">
          <BoardPreview
            board={a.record.boardBefore}
            chosenPit={a.record.pit}
            bestPit={a.bestPit}
            validPits={a.record.validPits}
            actor={a.record.actor}
          />
          <Legend actor={a.record.actor} delta={a.delta} />
        </div>

        {/* Selected move detail + nav */}
        <div className="px-4 py-2 border-b border-amber-800 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-500 text-xs font-mono">#{sel + 1}/{analyses.length}</span>
            <span className="text-amber-200 font-bold text-sm">
              {a.record.actor === 'player' ? '🧑 You' : '🦊 AI'} → pit <span className="font-black">{a.record.pit}</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${m.pill}`}>{m.symbol} {m.label}</span>
            <span className={`text-xs font-mono ${a.record.storeGain > 0 ? 'text-green-400' : a.record.storeGain < 0 ? 'text-red-400' : 'text-amber-600'}`}>
              {a.record.storeGain >= 0 ? '+' : ''}{a.record.storeGain} store
            </span>
          </div>
          {a.delta > 0 && (
            <div className="text-[11px] text-amber-500 mt-0.5">
              Best was pit <span className="font-bold text-green-400">{a.bestPit}</span>
              {' '}· lost <span className="text-red-400 font-bold">{a.delta}</span> seed{a.delta !== 1 ? 's' : ''} of advantage
            </div>
          )}
          {/* Nav */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setSel(s => Math.max(0, s - 1))}
              disabled={sel === 0}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-700 disabled:opacity-30 text-amber-200 rounded-lg text-sm transition-colors"
            >← Prev</button>
            <button
              onClick={() => setSel(s => Math.min(analyses.length - 1, s + 1))}
              disabled={sel === analyses.length - 1}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-700 disabled:opacity-30 text-amber-200 rounded-lg text-sm transition-colors"
            >Next →</button>
          </div>
        </div>

        {/* Move list */}
        <div className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-1" ref={listRef}>
          {analyses.map((an, i) => {
            const gm = GRADE_META[an.grade]
            const isSelected = i === sel
            const isPlayer = an.record.actor === 'player'
            return (
              <button
                key={i}
                ref={el => { itemRefs.current[i] = el }}
                onClick={() => setSel(i)}
                className={`w-full text-left rounded-lg px-3 py-1.5 flex items-center gap-2 transition-colors border ${
                  isSelected
                    ? 'bg-amber-700/50 border-amber-500'
                    : 'bg-amber-900/30 border-amber-800/40 hover:bg-amber-800/40'
                }`}
              >
                <span className="text-amber-600 text-[10px] w-5 shrink-0">#{i + 1}</span>
                <span className="text-sm">{isPlayer ? '🧑' : '🦊'}</span>
                <span className="text-amber-300 text-xs font-mono">pit {an.record.pit}</span>
                <span className={`text-[10px] font-bold ${gm.color}`}>{gm.symbol} {gm.label}</span>
                <span className={`ml-auto text-[10px] font-mono ${an.record.storeGain > 0 ? 'text-green-400' : an.record.storeGain < 0 ? 'text-red-400' : 'text-amber-700'}`}>
                  {an.record.storeGain >= 0 ? '+' : ''}{an.record.storeGain}
                </span>
                {an.delta > 0 && (
                  <span className="text-[10px] font-mono text-red-500">-{an.delta}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-amber-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold rounded-xl transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  )
}
