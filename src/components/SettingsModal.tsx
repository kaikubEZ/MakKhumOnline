import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const { apiKey, setApiKey } = useGameStore()
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)

  if (!open) return null

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 8))}` : ''

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
          <label className="text-sm font-medium text-gray-700">OpenRouter API Key</label>
          {apiKey && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-mono flex-1">{showKey ? apiKey : maskedKey}</span>
              <button
                onClick={() => setShowKey(v => !v)}
                className="text-blue-600 hover:underline text-xs"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleClear}
                className="text-red-500 hover:underline text-xs"
              >
                Clear
              </button>
            </div>
          )}
          <input
            type="password"
            placeholder={apiKey ? 'Enter new key to replace…' : 'sk-or-…'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400">
            Key is stored in your browser only. Without a key, AI uses random moves.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
