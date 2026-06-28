import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { getValidPits } from '../game/board'

function getStore() {
  return useGameStore.getState()
}

beforeEach(() => {
  getStore().newGame()
  getStore().setSocketSend(null)
})

describe('startOnlineGame', () => {
  it('sets mode=online, myRole, phase=turnbased, skips racing', () => {
    getStore().startOnlineGame('player1')
    const s = getStore()
    expect(s.mode).toBe('online')
    expect(s.myRole).toBe('player1')
    expect(s.phase).toBe('turnbased')
    expect(s.racing).toBeNull()
    expect(s.turn).not.toBeNull()
    expect(s.turn?.currentTurn).toBe('player')
  })

  it('player2 role: phase=turnbased, currentTurn still player (player1 goes first)', () => {
    getStore().startOnlineGame('player2')
    const s = getStore()
    expect(s.myRole).toBe('player2')
    expect(s.phase).toBe('turnbased')
    expect(s.turn?.currentTurn).toBe('player')
  })
})

describe('player2Move', () => {
  it('no-op when mode is local', () => {
    getStore().startOnlineGame('player2')
    useGameStore.setState({ mode: 'local' })
    // Advance to ai turn
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('no-op when it is not ai turn', () => {
    getStore().startOnlineGame('player2')
    // currentTurn is 'player' by default — not player2's turn
    getStore().player2Move(8)
    expect(getStore().tbAnim).toBeNull()
  })

  it('applies move and sends via socketSend when it is ai turn', () => {
    const mockSend = vi.fn()
    getStore().startOnlineGame('player2')
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
    getStore().startOnlineGame('player1')
    // Force to ai turn (opponent's turn from player1's view)
    useGameStore.setState({ turn: { ...getStore().turn!, currentTurn: 'ai' }, isAITurn: true })
    const valid = getValidPits(getStore().turn!.board, 'ai')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })

  it('player2 receiving: applies move to player side', () => {
    getStore().startOnlineGame('player2')
    // currentTurn is 'player' — opponent (player1) is moving
    const valid = getValidPits(getStore().turn!.board, 'player')
    getStore().applyOpponentMove(valid[0])
    expect(getStore().tbAnim).not.toBeNull()
  })
})
