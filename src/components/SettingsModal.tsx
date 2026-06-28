import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface Props {
  open: boolean
  onClose: () => void
}

const HAS_BUILTIN_KEY = !!(import.meta.env.VITE_OPENROUTER_API_KEY as string)

const DIFF_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  easy:   { label: 'Easy',   desc: 'Random moves',         color: 'bg-green-100 border-green-400 text-green-800' },
  medium: { label: 'Medium', desc: 'Smart heuristic',      color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  hard:   { label: 'Hard',   desc: 'AI + strategy prompt', color: 'bg-red-100 border-red-400 text-red-800' },
}

export function SettingsModal({ open, onClose }: Props) {
  const { userApiKey, setApiKey, difficulty, setDifficulty } = useGameStore()
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)

  if (!open) return null

  const maskedUserKey = userApiKey
    ? `${userApiKey.slice(0, 8)}${'•'.repeat(Math.max(0, userApiKey.length - 8))}`
    : ''

  function handleSave() {
    if (draft.trim()) {
      setApiKey(draft.trim())
      setDraft('')
    }
    onClose()
  }

  function handleClear() {
    setApiKey(null)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800">Settings</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">AI Difficulty</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${difficulty === d ? DIFF_LABELS[d].color : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              >
                <div>{DIFF_LABELS[d].label}</div>
                <div className="text-[10px] font-normal opacity-70">{DIFF_LABELS[d].desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">OpenRouter API Key</label>

          {/* Built-in key notice */}
          {HAS_BUILTIN_KEY && !userApiKey && (
            <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-green-700">✓ Built-in key active</span>
              <span className="text-green-500 text-xs ml-auto">Enter your own below to override</span>
            </div>
          )}

          {/* User's own key */}
          {userApiKey && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-mono flex-1">{showKey ? userApiKey : maskedUserKey}</span>
              <button onClick={() => setShowKey(v => !v)} className="text-blue-600 hover:underline text-xs">
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button onClick={handleClear} className="text-red-500 hover:underline text-xs">
                Clear{HAS_BUILTIN_KEY ? ' (revert to built-in)' : ''}
              </button>
            </div>
          )}

          <input
            type="password"
            placeholder={userApiKey ? 'Enter new key to replace…' : 'sk-or-… (optional — built-in key is active)'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400">
            {HAS_BUILTIN_KEY
              ? 'A built-in key is provided. Enter your own OpenRouter key to use it instead.'
              : 'Key is stored in your browser only. Without a key, AI uses random moves.'}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
