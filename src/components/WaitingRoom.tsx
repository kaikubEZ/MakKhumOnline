interface Props {
  roomCode: string
  onCancel: () => void
}

export function WaitingRoom({ roomCode, onCancel }: Props) {
  return (
    <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-black text-amber-400 mb-2">Waiting for opponent…</h2>
        <p className="text-amber-600 text-sm">Share this code with your friend</p>
      </div>
      <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl px-10 py-6 text-center">
        <p className="text-amber-500 text-xs uppercase tracking-widest mb-2">Room Code</p>
        <p className="text-6xl font-black text-amber-200 tracking-[0.25em]">{roomCode}</p>
      </div>
      <div className="animate-pulse text-amber-600 text-sm">Waiting…</div>
      <button
        onClick={onCancel}
        className="px-6 py-2 bg-amber-900 hover:bg-amber-800 text-amber-400 font-semibold rounded-xl border border-amber-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
