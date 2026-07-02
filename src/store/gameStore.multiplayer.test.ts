import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { getValidPits } from '../game/board'
import type { TurnState } from '../game/turnbased'

function getStore() {
  return useGameStore.getState()
}

// Put an online game into the turn-based phase (post-racing) for move tests.
function enterTurnbased(role: 'player1' | 'player2') {
  getStore().startOnlineGame(role)
  const turn: TurnState = {
    board: getStore().racing!.board,
    currentTurn: 'player',
    events: [],
    phase: 'turnbased',
  }
  useGameStore.setState({ phase: 'turnbased', racing: null, turn })
}

beforeEach(() => {
  getStore().newGame()
  getStore().setSocketSend(null)
})

describe('startOnlineGame', () => {
  it('starts in the racing phase (both players race first, like local)', () => {
    getStore().startOnlineGame('player1')
    const s = getStore()
    expect(s.mode).toBe('online')
    expect(s.myRole).toBe('player1')
    expect(s.phase).toBe('racing')
    expect(s.racing).not.toBeNull()
    expect(s.turn).toBeNull()
    // Neither side has chosen a pit yet — sim must wait for both.
    expect(s.racing?.player.status).toBe('selecting')
    expect(s.racing?.ai.status).toBe('selecting')
  })

  it('player2 role also starts in racing with both sides selecting', () => {
    getStore().startOnlineGame('player2')
    const s = getStore()
    expect(s.myRole).toBe('player2')
    expect(s.phase).toBe('racing')
    expect(s.racing?.ai.status).toBe('selecting')
  })
})

describe('online racing selection', () => {
  it('host (player1) applies own pick to the player side and broadcasts — does NOT auto-pick opponent', () => {
    const mockSend = vi.fn()
    getStore().startOnlineGame('player1')
    getStore().setSocketSend(mockSend)

    const pit = getValidPits(getStore().racing!.board, 'player')[0]
    getStore().selectRacingPit(pit)

    const s = getStore()
    expect(s.racing?.player.status).toBe('moving')      // my pick applied
    expect(s.racing?.ai.status).toBe('selecting')        // opponent NOT auto-picked
    expect(mockSend).toHaveBeenCalledWith({ type: 'racing_state', state: s.racing })
  })

  it('guest (player2) sends its pick to the host instead of mutating local state', () => {
    const mockSend = vi.fn()
    getStore().startOnlineGame('player2')
    getStore().setSocketSend(mockSend)

    const pit = getValidPits(getStore().racing!.board, 'ai')[0]
    getStore().selectRacingPit(pit)

    expect(mockSend).toHaveBeenCalledWith({ type: 'racing_select', pit })
    // Guest waits for the host's authoritative snapshot.
    expect(getStore().racing?.ai.status).toBe('selecting')
  })

  it('host applies an incoming guest pick to the ai side and rebroadcasts', () => {
    const mockSend = vi.fn()
    getStore().startOnlineGame('player1')
    getStore().setSocketSend(mockSend)

    const pit = getValidPits(getStore().racing!.board, 'ai')[0]
    getStore().applyRacingSelect(pit)

    const s = getStore()
    expect(s.racing?.ai.status).toBe('moving')
    expect(mockSend).toHaveBeenCalledWith({ type: 'racing_state', state: s.racing })
  })

  it('guest adopts the host racing snapshot verbatim', () => {
    getStore().startOnlineGame('player2')
    const snapshot = { ...getStore().racing!, board: getStore().racing!.board.map((n, i) => i === 0 ? 99 : n) }
    getStore().applyRacingState(snapshot)
    expect(getStore().racing?.board[0]).toBe(99)
  })
})

describe('player2Move', () => {
  it('no-op when mode is local', () => {
    enterTurnbased('player2')
    useGameStore.setState({ mode: 'local' })
    // Advance to ai turn
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('no-op when it is not ai turn', () => {
    enterTurnbased('player2')
    // currentTurn is 'player' by default — not player2's turn
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('applies move and sends via socketSend when it is ai turn', () => {
    const mockSend = vi.fn()
    enterTurnbased('player2')
    getStore().setSocketSend(mockSend)
    // Force to ai turn
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })

    const valid = getValidPits(getStore().turn!.board, 'ai')
    getStore().player2Move(valid[0])

    expect(mockSend).toHaveBeenCalledWith({ type: 'move', pit: valid[0] })
    expect(getStore().tbAnim).not.toBeNull()
  })
})

describe('applyOpponentMove', () => {
  it('player1 receiving: applies move to ai side', () => {
    enterTurnbased('player1')
    // Force to ai turn (opponent's turn from player1's view)
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    const valid = getValidPits(getStore().turn!.board, 'ai')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })

  it('player2 receiving: applies move to player side', () => {
    enterTurnbased('player2')
    // currentTurn is 'player' — opponent (player1) is moving
    const valid = getValidPits(getStore().turn!.board, 'player')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })
})
