import { useState, useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { Board } from './components/Board'
import { SettingsModal } from './components/SettingsModal'
import { TrashTalkBubble } from './components/TrashTalkBubble'
import { HintPanel } from './components/HintPanel'
import { RulesModal } from './components/RulesModal'
import { ReviewModal } from './components/ReviewModal'
import { LobbyScreen } from './components/LobbyScreen'
import { WaitingRoom } from './components/WaitingRoom'
import { connect, onMessage, disconnect, send } from './multiplayer/socket'

function PhaseBanner({ phase }: { phase: string }) {
  if (phase === 'racing') return (
    <span className="px-4 py-1 bg-red-600 text-white font-black rounded-full text-sm tracking-widest uppercase">
      Racing Phase
    </span>
  )
  if (phase === 'turnbased') return (
    <span className="px-4 py-1 bg-blue-600 text-white font-black rounded-full text-sm tracking-widest uppercase">
      Turn-Based Phase
    </span>
  )
  if (phase === 'gameover') return (
    <span className="px-4 py-1 bg-amber-600 text-white font-black rounded-full text-sm tracking-widest uppercase">
      Game Over
    </span>
  )
  return null
}

export default function App() {
  const {
    phase, racing, turn, result, isAITurn, isThinking,
    paused, transitioning, trashTalk, tbAnim, pitHistory, difficulty, moveHistory,
    mode,
    startGame, tick, tickTbAnim, aiMove, loadApiKey, setPaused, newGame,
    startOnlineGame, applyOpponentMove, setSocketSend, leaveOnlineGame,
  } = useGameStore()

  const animFrame = tbAnim?.frames[tbAnim.frame]
  const seedsInHand = animFrame?.seedsInHand ?? null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [screen, setScreen] = useState<'menu' | 'lobby' | 'waiting' | 'game'>('menu')
  const [waitingCode, setWaitingCode] = useState('')
  const [lobbyError, setLobbyError] = useState<string | null>(null)

  useEffect(() => { loadApiKey() }, [])

  useEffect(() => {
    if (screen !== 'game') return
    const unsub = onMessage((msg) => {
      if (msg.type === 'game_start') {
        startOnlineGame(msg.yourRole)
        setScreen('game')
      } else if (msg.type === 'opponent_move') {
        applyOpponentMove(msg.pit)
      } else if (msg.type === 'opponent_disconnected') {
        leaveOnlineGame()
        disconnect()
        setScreen('menu')
        alert('Opponent disconnected.')
      }
    })
    setSocketSend(send)
    return () => { unsub(); setSocketSend(null) }
  }, [screen])

  useEffect(() => {
    if (screen !== 'waiting') return
    const unsub = onMessage((msg) => {
      if (msg.type === 'game_start') {
        startOnlineGame(msg.yourRole)
        setScreen('game')
      }
    })
    return unsub
  }, [screen])

  const shouldTick =
    phase === 'racing' &&
    !!racing &&
    racing.player.status !== 'selecting' &&
    racing.phase !== 'complete' &&
    !transitioning &&
    !paused

  useEffect(() => {
    if (!shouldTick) return
    const id = setInterval(tick, 400)
    return () => clearInterval(id)
  }, [shouldTick])

  async function handleCreateRoom() {
    setLobbyError(null)
    try {
      const res = await fetch('http://localhost:3001/rooms', { method: 'POST' })
      const { code } = await res.json() as { code: string }
      await connect(code)
      setWaitingCode(code)
      setScreen('waiting')
    } catch {
      setLobbyError('Failed to create room. Is the server running?')
    }
  }

  async function handleJoinRoom(code: string) {
    setLobbyError(null)
    try {
      await connect(code)
      setScreen('waiting')
    } catch {
      setLobbyError('Could not connect to that room. Check the code and try again.')
    }
  }

  function handleCancelWaiting() {
    disconnect()
    setScreen('lobby')
    setWaitingCode('')
  }

  useEffect(() => {
    if (!isAITurn || paused || tbAnim || mode === 'online') return
    const id = setTimeout(aiMove, 600)
    return () => clearTimeout(id)
  }, [isAITurn, paused, tbAnim, mode])

  useEffect(() => {
    if (!tbAnim) return
    const id = setInterval(tickTbAnim, 130)
    return () => clearInterval(id)
  }, [!!tbAnim])

  const board = turn?.board ?? racing?.board

  const actionText = (() => {
    if (phase === 'racing') {
      if (!racing) return ''
      const s = racing.player.status
      if (s === 'selecting') return 'Select any non-empty pit to start racing'
      if (s === 'paused') return 'Landed in your Store — pick a pit to continue'
      if (s === 'dead') return 'You died! Waiting for AI to finish...'
      return 'Seeds are racing — watch for chains and collisions!'
    }
    if (phase === 'turnbased') {
      if (isThinking) return 'AI is thinking...'
      if (isAITurn) return 'AI is choosing a move...'
      return 'Your turn — click a highlighted pit'
    }
    return ''
  })()

  if (screen === 'lobby') {
    return (
      <LobbyScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen('menu')}
        error={lobbyError}
      />
    )
  }

  if (screen === 'waiting') {
    return <WaitingRoom roomCode={waitingCode} onCancel={handleCancelWaiting} />
  }

  // Main Menu
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Decorative corner AI */}
        <div className="absolute bottom-6 right-8 text-9xl opacity-20 select-none">🦊</div>

        <div className="text-center">
          <h1 className="text-7xl font-black text-amber-400 tracking-widest drop-shadow-lg">MAK KHUM</h1>
          <p className="text-3xl text-amber-300 mt-1">หมากขุม</p>
          <p className="text-amber-600 text-sm mt-2">Thai Traditional Mancala</p>
        </div>

        {/* Decorative pits preview */}
        <div className="flex gap-2 opacity-40">
          {[7,4,2,6,3,5,7].map((n, i) => (
            <div key={i} className="w-12 h-12 rounded-full bg-amber-700 border-2 border-amber-600 flex items-center justify-center text-amber-200 font-bold">
              {n}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-52">
          <button
            onClick={startGame}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl text-lg transition-colors shadow-lg"
          >
            🎮 Play Game
          </button>
          <button
            onClick={() => setRulesOpen(true)}
            className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
          >
            📖 Rules
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
          >
            ⚙ Settings
          </button>
          <button
            onClick={() => setScreen('lobby')}
            className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-blue-200 font-semibold rounded-xl transition-colors border border-blue-700"
          >
            🌐 Multiplayer
          </button>
        </div>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-950 flex flex-col items-center gap-4 p-4 pb-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2">
        <span className="text-amber-400 font-black text-xl tracking-widest">MAK KHUM</span>
        <div className="flex items-center gap-2">
          <PhaseBanner phase={phase} />
          {phase === 'turnbased' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${difficulty === 'easy' ? 'bg-green-800 text-green-300' : difficulty === 'medium' ? 'bg-yellow-800 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
              {difficulty}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {phase !== 'gameover' && (
            <button
              onClick={() => setPaused(!paused)}
              className="px-3 py-1.5 text-sm text-amber-300 border border-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 text-sm text-amber-300 border border-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
          >
            ⚙
          </button>
          <button
            onClick={() => setRulesOpen(true)}
            className="px-3 py-1.5 text-sm text-amber-300 border border-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
          >
            📖
          </button>
        </div>
      </div>

      {/* AI Card */}
      <div className="w-full max-w-2xl bg-orange-950/70 border border-orange-800/50 rounded-xl px-4 py-3 flex items-center gap-4">
        <div className="text-4xl">🦊</div>
        <div className="flex flex-col gap-1">
          <span className="text-orange-300 font-bold text-sm uppercase tracking-wide">AI Opponent</span>
          <span className="text-orange-200 font-black text-2xl">{board?.[15] ?? 0} <span className="text-orange-500 text-sm font-normal">seeds in store</span></span>
          {isThinking && <span className="text-orange-400 text-xs animate-pulse">thinking...</span>}
          {tbAnim && turn?.currentTurn === 'ai' && seedsInHand !== null && (
            <span className="text-yellow-300 text-xs font-bold">{seedsInHand} in hand</span>
          )}
          {phase === 'turnbased' && pitHistory.ai.length > 0 && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-orange-600 text-[10px]">picks:</span>
              {pitHistory.ai.slice(-6).map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-orange-900 border border-orange-700 rounded text-orange-300 text-[10px] font-mono">{p}</span>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto max-w-xs">
          <TrashTalkBubble />
        </div>
      </div>

      {/* Board */}
      <Board />

      {/* Player Card */}
      <div className="w-full max-w-2xl bg-blue-950/70 border border-blue-800/50 rounded-xl px-4 py-3 flex items-center gap-4">
        <div className="text-4xl">🧑</div>
        <div className="flex flex-col gap-1">
          <span className="text-blue-300 font-bold text-sm uppercase tracking-wide">You</span>
          <span className="text-blue-200 font-black text-2xl">{board?.[7] ?? 0} <span className="text-blue-500 text-sm font-normal">seeds in store</span></span>
          {tbAnim && turn?.currentTurn === 'player' && seedsInHand !== null && (
            <span className="text-yellow-300 text-xs font-bold">{seedsInHand} in hand</span>
          )}
          {phase === 'turnbased' && pitHistory.player.length > 0 && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-blue-600 text-[10px]">picks:</span>
              {pitHistory.player.slice(-6).map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-blue-900 border border-blue-700 rounded text-blue-300 text-[10px] font-mono">{p}</span>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto">
          {phase === 'turnbased' && <HintPanel />}
        </div>
      </div>

      {/* Action Helper */}
      {actionText && (
        <div className="w-full max-w-2xl bg-amber-900/40 border border-amber-800/30 rounded-lg px-4 py-2 text-amber-300 text-sm text-center italic">
          {actionText}
        </div>
      )}

      {/* Pause Overlay */}
      {paused && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40">
          <div className="bg-amber-900 border-2 border-amber-600 rounded-2xl p-8 flex flex-col gap-3 min-w-[200px] items-center shadow-2xl">
            <h2 className="text-3xl font-black text-amber-200 mb-2">PAUSED</h2>
            <button
              onClick={() => setPaused(false)}
              className="w-full px-6 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl transition-colors"
            >
              ▶ Resume
            </button>
            <button
              onClick={() => { setPaused(false); setSettingsOpen(true) }}
              className="w-full px-6 py-2 bg-amber-800 hover:bg-amber-700 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
            >
              ⚙ Settings
            </button>
            <button
              onClick={() => { setPaused(false); setRulesOpen(true) }}
              className="w-full px-6 py-2 bg-amber-800 hover:bg-amber-700 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
            >
              📖 Rules
            </button>
            <button
              onClick={() => { newGame() }}
              className="w-full px-6 py-2 bg-amber-900 hover:bg-amber-800 text-amber-400 font-semibold rounded-xl transition-colors border border-amber-700"
            >
              ↩ Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Phase Transition Overlay */}
      {transitioning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl">⚔️</div>
            <h2 className="text-4xl font-black text-blue-300 tracking-widest uppercase">Turn-Based Phase</h2>
            <p className="text-amber-400 text-sm">Racing is over — strategy begins</p>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="bg-amber-900 border-2 border-amber-500 rounded-2xl p-8 flex flex-col gap-5 items-center shadow-2xl min-w-[280px]">
            <div className="text-7xl">
              {result === 'player' ? '🏆' : result === 'ai' ? '🦊' : '🤝'}
            </div>
            <h2 className="text-4xl font-black text-amber-200">
              {result === 'player' ? 'You Win!' : result === 'ai' ? (mode === 'online' ? 'Opponent Wins!' : 'AI Wins!') : "It's a Draw!"}
            </h2>

            <div className="flex gap-10 text-center">
              <div>
                <div className="text-5xl font-black text-blue-300">{board?.[7] ?? 0}</div>
                <div className="text-amber-400 text-sm">Your Seeds</div>
              </div>
              <div className="text-amber-600 text-2xl self-center">vs</div>
              <div>
                <div className="text-5xl font-black text-orange-300">{board?.[15] ?? 0}</div>
                <div className="text-amber-400 text-sm">AI Seeds</div>
              </div>
            </div>

            {trashTalk && (
              <p className="text-orange-300 italic text-sm text-center max-w-xs">
                🦊 &ldquo;{trashTalk}&rdquo;
              </p>
            )}

            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              <button
                onClick={startGame}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-xl transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => setReviewOpen(true)}
                className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-blue-100 font-bold rounded-xl transition-colors border border-blue-600"
              >
                📊 Review
              </button>
              <button
                onClick={newGame}
                className="px-6 py-2 bg-amber-800 hover:bg-amber-700 text-amber-200 font-semibold rounded-xl transition-colors border border-amber-700"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {reviewOpen && <ReviewModal moves={moveHistory} onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
