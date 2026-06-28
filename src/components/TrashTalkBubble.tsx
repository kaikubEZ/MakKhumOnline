import { useGameStore } from '../store/gameStore'

export function TrashTalkBubble() {
  const trashTalk = useGameStore(s => s.trashTalk)
  if (!trashTalk) return null

  return (
    <div className="relative bg-orange-900/80 border border-orange-700 rounded-2xl px-3 py-2 text-xs text-orange-200 max-w-[180px]">
      {/* ponytail: speech bubble tail */}
      <div className="absolute -left-2 top-3 w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-orange-700" />
      <span className="italic">&ldquo;{trashTalk}&rdquo;</span>
    </div>
  )
}
