import { useState } from 'react'

interface Props {
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
  onBack: () => void
  error?: string | null
}

export function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, error }: Props) {
  const [mode, setMode] = useState<'menu' | 'join'>('menu')
  const [code, setCode] = useState('')

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-black text-amber-400">Join Room</h2>
        <input
          className="w-48 text-center text-3xl font-black tracking-widest bg-amber-900 border-2 border-amber-600 rounded-xl px-4 py-3 text-amber-200 outline-none focus:border-amber-400"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => onJoinRoom(code)}
            disabled={code.length !== 6}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-amber-950 font-black rounded-xl transition-colors"
          >
            Join
          </button>
          <button
            onClick={() => { setMode('menu'); setCode('') }}
            className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-300 font-semibold rounded-xl border border-amber-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-black text-amber-400 tracking-widest">MULTIPLAYER</h1>
        <p className="text-amber-600 text-sm mt-1">Play with a friend online</p>
      </div>
      <div className="flex flex-col gap-3 w-52">
        <button
          onClick={onCreateRoom}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl text-lg transition-colors shadow-lg"
        >
          Create Room
        </button>
        <button
          onClick={() => setMode('join')}
          className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
        >
          Join Room
        </button>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-amber-900/50 hover:bg-amber-900 text-amber-500 font-semibold rounded-xl transition-colors border border-amber-800"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
