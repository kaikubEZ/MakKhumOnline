import { useState } from 'react'

const TABS = ['Board', 'Racing Phase', 'Turn-Based', 'Special Rules', 'Win Condition'] as const
type Tab = typeof TABS[number]

const CONTENT: Record<Tab, { title: string; lines: string[] }> = {
  'Board': {
    title: 'Board Layout',
    lines: [
      '16 pits total (index 0–15).',
      'Your side: pits 0–6 (playfield) + pit 7 (your Store).',
      'AI side: pits 8–14 (playfield) + pit 15 (AI Store).',
      'Starting seeds: 7 seeds × 14 playfield pits = 98 total.',
      'Stores begin empty and cannot be sown from.',
      "Seeds always sow ascending (0→1→2…→15→0), skipping the opponent's Store.",
    ],
  },
  'Racing Phase': {
    title: 'Racing Phase Rules',
    lines: [
      'Both players move simultaneously every 400ms tick.',
      'Pick any non-empty pit on your side to start.',
      'Each tick: drop one seed into the next pit.',
      'CHAIN: landed in non-empty pit → pick up all seeds and keep going.',
      'PAUSED: landed in your Store → must pick a new pit to continue.',
      'DIED: landed in an empty pit → hand goes inactive (hasDied = true).',
      'COLLISION: both land on the same pit → 2 seeds deposited, no death for either.',
      'Phase ends when both players have died once.',
    ],
  },
  'Turn-Based': {
    title: 'Turn-Based Phase Rules',
    lines: [
      'Players alternate turns. You go first.',
      'Pick any non-empty pit on your side to sow.',
      "Seeds sow one per pit in ascending order, skipping opponent's Store.",
      'FREE TURN: last seed lands in your Store → play again.',
      'CHAIN: last seed lands in non-empty non-Store pit → pick up all and continue sowing.',
      'KIN (Capture): last seed lands in an empty own pit AND the opposite pit has seeds → both go to your Store.',
      'Stores never trigger Chain.',
    ],
  },
  'Special Rules': {
    title: 'Special Rules',
    lines: [
      'Sow direction: ascending index, wrapping 15→0.',
      "Opponent's Store is always skipped when sowing.",
      'Opposite pit formula: oppositePit = 14 − currentPit.',
      'Examples: pit 0 ↔ pit 14, pit 3 ↔ pit 11, pit 6 ↔ pit 8.',
      'Capture only works on your own empty pits (0–6), not AI pits.',
      'Collision in Racing Phase prevents death even if the pit was empty.',
    ],
  },
  'Win Condition': {
    title: 'Win Condition',
    lines: [
      'Game ends when either side has no valid moves (all pits empty).',
      "Sweep: remaining seeds on each side go into that side's own Store.",
      'Most seeds in your Store wins.',
      'Equal seeds = Draw.',
    ],
  },
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('Board')
  const { title, lines } = CONTENT[tab]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-amber-700">
          <h2 className="text-2xl font-black text-amber-200">📖 Rules</h2>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-200 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 overflow-x-auto shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                tab === t
                  ? 'bg-amber-500 text-amber-950'
                  : 'text-amber-400 hover:bg-amber-800',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <h3 className="text-lg font-bold text-amber-300 mb-3">{title}</h3>
          <ul className="flex flex-col gap-2">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-100">
                <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-amber-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
