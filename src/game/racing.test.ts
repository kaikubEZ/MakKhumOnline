import { describe, it, expect } from 'vitest'
import { selectStartPit, racingTick } from './racing'
import type { RacingState, RacingHand } from './racing'
import { PLAYER_STORE, AI_STORE } from './board'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeHand(overrides: Partial<RacingHand> = {}): RacingHand {
  return {
    pit: null,
    seeds: 0,
    status: 'selecting',
    hasDied: false,
    ...overrides,
  }
}

function makeState(overrides: Partial<RacingState> = {}): RacingState {
  return {
    board: new Array(16).fill(0),
    player: makeHand(),
    ai: makeHand(),
    events: [],
    phase: 'racing',
    ...overrides,
  }
}

// ─── selectStartPit ──────────────────────────────────────────────────────────

describe('selectStartPit', () => {
  it('picks up all seeds from chosen pit and sets status to moving', () => {
    const board = new Array(16).fill(0)
    board[3] = 5
    const state = makeState({ board })
    const next = selectStartPit(state, 'player', 3)

    expect(next.board[3]).toBe(0)
    expect(next.player.seeds).toBe(5)
    expect(next.player.pit).toBe(3)
    expect(next.player.status).toBe('moving')
  })

  it('does not mutate the original board', () => {
    const board = new Array(16).fill(0)
    board[3] = 5
    const state = makeState({ board })
    selectStartPit(state, 'player', 3)
    expect(state.board[3]).toBe(5)
  })

  it('emits PIT_SELECTED event', () => {
    const board = new Array(16).fill(0)
    board[0] = 3
    const state = makeState({ board })
    const next = selectStartPit(state, 'player', 0)

    expect(next.events).toHaveLength(1)
    expect(next.events[0].type).toBe('PIT_SELECTED')
    expect(next.events[0].actor).toBe('player')
    expect(next.events[0].pit).toBe(0)
  })

  it('preserves hasDied from prior state', () => {
    const board = new Array(16).fill(0)
    board[10] = 4
    const state = makeState({
      board,
      ai: makeHand({ hasDied: true, status: 'paused', pit: 15, seeds: 0 }),
    })
    const next = selectStartPit(state, 'ai', 10)
    expect(next.ai.hasDied).toBe(true)
    expect(next.ai.status).toBe('moving')
    expect(next.ai.seeds).toBe(4)
  })

  it('handles paused re-pick: resets to moving with new pit', () => {
    const board = new Array(16).fill(0)
    board[2] = 7
    const state = makeState({
      board,
      player: makeHand({ status: 'paused', pit: PLAYER_STORE, seeds: 0 }),
    })
    const next = selectStartPit(state, 'player', 2)
    expect(next.player.status).toBe('moving')
    expect(next.player.pit).toBe(2)
    expect(next.player.seeds).toBe(7)
    expect(next.board[2]).toBe(0)
  })
})

// ─── racingTick: actors skipped ──────────────────────────────────────────────

describe('racingTick: skips non-moving actors', () => {
  it('skips an actor with status selecting', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'selecting', pit: 0, seeds: 3 }),
      ai: makeHand({ status: 'moving', pit: 8, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(0)
    expect(next.player.seeds).toBe(3)
  })

  it('skips an actor with status paused', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'paused', pit: PLAYER_STORE, seeds: 0 }),
      ai: makeHand({ status: 'moving', pit: 8, seeds: 2 }),
    })
    const next = racingTick(state)
    expect(next.player.status).toBe('paused')
    expect(next.player.pit).toBe(PLAYER_STORE)
  })

  it('skips an actor with status dead', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true, pit: 2, seeds: 0 }),
      ai: makeHand({ status: 'moving', pit: 8, seeds: 2 }),
    })
    const next = racingTick(state)
    expect(next.player.status).toBe('dead')
    expect(next.player.pit).toBe(2)
  })
})

// ─── racingTick: normal advance ──────────────────────────────────────────────

describe('racingTick: normal advance (not last seed)', () => {
  it('advances pit by one and decrements seeds when not last', () => {
    const board = new Array(16).fill(0)
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 5 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(3)
    expect(next.player.seeds).toBe(4)
    expect(next.board[3]).toBe(1)
    expect(next.player.status).toBe('moving')
    expect(next.events).toHaveLength(0)
  })

  it('both actors advance simultaneously when both moving', () => {
    const board = new Array(16).fill(0)
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 1, seeds: 3 }),
      ai: makeHand({ status: 'moving', pit: 9, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(2)
    expect(next.player.seeds).toBe(2)
    expect(next.ai.pit).toBe(10)
    expect(next.ai.seeds).toBe(2)
    expect(next.board[2]).toBe(1)
    expect(next.board[10]).toBe(1)
  })
})

// ─── racingTick: store skipping ──────────────────────────────────────────────

describe('racingTick: store skipping', () => {
  it('player skips AI_STORE (pit 15) when advancing from pit 14', () => {
    const board = new Array(16).fill(0)
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 14, seeds: 3 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(0)   // skips 15, wraps to 0
    expect(next.board[15]).toBe(0)     // AI_STORE untouched
    expect(next.board[0]).toBe(1)
  })

  it('AI skips PLAYER_STORE (pit 7) when advancing from pit 6', () => {
    const board = new Array(16).fill(0)
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 6, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.ai.pit).toBe(8)       // skips 7, lands on 8
    expect(next.board[7]).toBe(0)      // PLAYER_STORE untouched
    expect(next.board[8]).toBe(1)
  })
})

// ─── racingTick: own store landing (pause) ───────────────────────────────────

describe('racingTick: own store landing', () => {
  it('player pauses when last seed lands in PLAYER_STORE and own pits have seeds', () => {
    const board = new Array(16).fill(0)
    board[3] = 4 // player still has seeds in pit 3 → can continue
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 6, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(PLAYER_STORE)
    expect(next.player.status).toBe('paused')
    expect(next.player.seeds).toBe(0)
    expect(next.player.hasDied).toBe(false)
    expect(next.events.some(e => e.type === 'PLAYER_PAUSED' && e.actor === 'player')).toBe(true)
    expect(next.board[PLAYER_STORE]).toBe(1)
  })

  it('AI pauses when last seed lands in AI_STORE and own pits have seeds', () => {
    const board = new Array(16).fill(0)
    board[10] = 3 // AI still has seeds in pit 10 → can continue
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 14, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.ai.pit).toBe(AI_STORE)
    expect(next.ai.status).toBe('paused')
    expect(next.ai.seeds).toBe(0)
    expect(next.ai.hasDied).toBe(false)
    expect(next.events.some(e => e.type === 'PLAYER_PAUSED' && e.actor === 'ai')).toBe(true)
    expect(next.board[AI_STORE]).toBe(1)
  })

  it('pause does not set hasDied when own pits have seeds', () => {
    const board = new Array(16).fill(0)
    board[2] = 1
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 6, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.hasDied).toBe(false)
  })

  it('player dies at store when no own pits have seeds (softlock fix)', () => {
    const board = new Array(16).fill(0) // all playfield pits empty
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 6, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.status).toBe('dead')
    expect(next.player.hasDied).toBe(true)
    expect(next.events.some(e => e.type === 'PLAYER_DIED' && e.actor === 'player')).toBe(true)
  })

  it('AI dies at store when no own pits have seeds (softlock fix)', () => {
    const board = new Array(16).fill(0) // all playfield pits empty
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 14, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.ai.status).toBe('dead')
    expect(next.ai.hasDied).toBe(true)
    expect(next.events.some(e => e.type === 'PLAYER_DIED' && e.actor === 'ai')).toBe(true)
  })
})

// ─── racingTick: empty pit landing (death) ───────────────────────────────────

describe('racingTick: empty pit death', () => {
  it('player dies when last seed lands on empty non-store pit', () => {
    const board = new Array(16).fill(0) // all empty
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.pit).toBe(3)
    expect(next.player.status).toBe('dead')
    expect(next.player.hasDied).toBe(true)
    expect(next.events.some(e => e.type === 'PLAYER_DIED' && e.actor === 'player')).toBe(true)
  })

  it('AI dies when last seed lands on empty non-store pit', () => {
    const board = new Array(16).fill(0)
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 10, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.ai.pit).toBe(11)
    expect(next.ai.status).toBe('dead')
    expect(next.ai.hasDied).toBe(true)
    expect(next.events.some(e => e.type === 'PLAYER_DIED' && e.actor === 'ai')).toBe(true)
  })

  it('phase becomes complete only when BOTH hasDied', () => {
    const board = new Array(16).fill(0)
    // Player dies this tick; AI was already dead
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.phase).toBe('complete')
  })

  it('phase stays racing when only one actor has died', () => {
    const board = new Array(16).fill(0)
    // Player dies but AI is still alive
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 1 }),
      ai: makeHand({ status: 'moving', pit: 10, seeds: 5 }),
    })
    const next = racingTick(state)
    expect(next.phase).toBe('racing')
  })
})

// ─── racingTick: non-empty pit landing (chain) ───────────────────────────────

describe('racingTick: chain on non-empty pit', () => {
  it('player chains: picks up all seeds from non-empty landing pit', () => {
    const board = new Array(16).fill(0)
    board[3] = 4 // non-empty pit player will land on
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    // deposited 1 seed → pit 3 had 4, now 5 before chain; chain picks up all 5
    expect(next.player.seeds).toBe(5)
    expect(next.player.status).toBe('moving')
    expect(next.board[3]).toBe(0)
    expect(next.events.some(e => e.type === 'CHAIN_TRIGGERED' && e.actor === 'player')).toBe(true)
  })

  it('AI chains: picks up all seeds from non-empty landing pit', () => {
    const board = new Array(16).fill(0)
    board[11] = 3
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 10, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.ai.seeds).toBe(4) // 3 + 1 deposited = 4
    expect(next.ai.status).toBe('moving')
    expect(next.board[11]).toBe(0)
    expect(next.events.some(e => e.type === 'CHAIN_TRIGGERED' && e.actor === 'ai')).toBe(true)
  })

  it('chained seeds keep actor in moving status', () => {
    const board = new Array(16).fill(0)
    board[5] = 2
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 4, seeds: 1 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.player.status).toBe('moving')
    expect(next.player.seeds).toBeGreaterThan(0)
  })
})

// ─── racingTick: collision detection ─────────────────────────────────────────

describe('racingTick: collision immunity', () => {
  it('pit gets +2 seeds when both actors land on same pit', () => {
    const board = new Array(16).fill(0)
    // Both will advance to pit 5
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 4, seeds: 3 }),
      ai: makeHand({ status: 'moving', pit: 4, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.board[5]).toBe(2)
    expect(next.player.pit).toBe(5)
    expect(next.ai.pit).toBe(5)
  })

  it('neither actor dies on collision even if pit was empty', () => {
    const board = new Array(16).fill(0) // pit 5 is empty
    // Both land on empty pit 5 on their last seed
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 4, seeds: 1 }),
      ai: makeHand({ status: 'moving', pit: 4, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.player.hasDied).toBe(false)
    expect(next.ai.hasDied).toBe(false)
    expect(next.player.status).not.toBe('dead')
    expect(next.ai.status).not.toBe('dead')
    expect(next.events.some(e => e.type === 'PLAYER_DIED')).toBe(false)
  })

  it('collision on empty pit triggers chain instead of death for both', () => {
    const board = new Array(16).fill(0) // pit 5 empty before collision
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 4, seeds: 1 }),
      ai: makeHand({ status: 'moving', pit: 4, seeds: 1 }),
    })
    const next = racingTick(state)
    // After +2 deposit, pit splits evenly: each actor gets 1 seed
    expect(next.events.some(e => e.type === 'CHAIN_TRIGGERED')).toBe(true)
    expect(next.player.seeds).toBeGreaterThan(0)
    expect(next.ai.seeds).toBeGreaterThan(0)
    expect(next.player.status).not.toBe('dead')
    expect(next.ai.status).not.toBe('dead')
  })

  it('non-colliding advance still works when actors start at same pit', () => {
    // Both at pit 2 but going to different outcomes after multiple ticks
    // Verify basic non-collision path is unaffected
    const board = new Array(16).fill(0)
    board[5] = 3 // pit 5 non-empty, player will land there; ai also advances there
    // Make them go to different pits by putting them at different positions
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 4, seeds: 3 }),
      ai: makeHand({ status: 'moving', pit: 6, seeds: 3 }),
    })
    const next = racingTick(state)
    // player → 5, ai → 8 (since 7 is PLAYER_STORE and AI skips it)
    expect(next.player.pit).toBe(5)
    expect(next.ai.pit).toBe(8)
    // No collision — board[5] had 3 seeds, player deposited 1 → 4 total
    expect(next.board[5]).toBe(4) // 3 pre-existing + 1 deposited
  })
})

// ─── racingTick: phase completion ────────────────────────────────────────────

describe('racingTick: phase completion', () => {
  it('phase stays racing when neither actor has died', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 0, seeds: 3 }),
      ai: makeHand({ status: 'moving', pit: 8, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.phase).toBe('racing')
  })

  it('phase becomes complete when both player and ai have hasDied = true', () => {
    const board = new Array(16).fill(0)
    // Player is already dead, AI dies this tick
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 10, seeds: 1 }),
    })
    const next = racingTick(state)
    expect(next.ai.hasDied).toBe(true)
    expect(next.phase).toBe('complete')
  })

  it('phase stays racing when only player has died (ai still moving)', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'dead', hasDied: true }),
      ai: makeHand({ status: 'moving', pit: 8, seeds: 3 }),
    })
    const next = racingTick(state)
    expect(next.phase).toBe('racing')
  })

  it('phase stays racing when only ai has died (player still moving)', () => {
    const board = new Array(16).fill(1)
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 0, seeds: 3 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const next = racingTick(state)
    expect(next.phase).toBe('racing')
  })
})

// ─── immutability ────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('racingTick does not mutate the input state', () => {
    const board = new Array(16).fill(0)
    board[3] = 5
    const state = makeState({
      board,
      player: makeHand({ status: 'moving', pit: 2, seeds: 2 }),
      ai: makeHand({ status: 'dead', hasDied: true }),
    })
    const boardCopy = [...state.board]
    racingTick(state)
    expect(state.board).toEqual(boardCopy)
    expect(state.player.seeds).toBe(2)
  })

  it('selectStartPit does not mutate the input state', () => {
    const board = new Array(16).fill(0)
    board[0] = 5
    const state = makeState({ board })
    const boardCopy = [...state.board]
    selectStartPit(state, 'player', 0)
    expect(state.board).toEqual(boardCopy)
  })
})
