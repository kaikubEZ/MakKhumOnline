import { useGameStore } from '../store/gameStore'

export function TrashTalkBubble() {
  const trashTalk = useGameStore(s => s.trashTalk)
  if (!trashTalk) return null

  return (
    <div className="relative max-w-xs bg-orange-100 border border-orange-300 rounded-2xl px-4 py-2 text-sm text-orange-800 shadow">
      {/* ponytail: speech bubble tail via CSS triangle */}
      <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-300" />
      <span className="font-medium">AI: </span>{trashTalk}
    </div>
  )
}
