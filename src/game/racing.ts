import type { PlayerKey, GameEvent, GameEventType } from './types'
import { PLAYER_STORE, AI_STORE } from './board'

export interface RacingHand {
  pit: number | null
  seeds: number
  status: 'selecting' | 'moving' | 'paused' | 'dead'
  hasDied: boolean
}

export interface RacingState {
  board: number[]
  player: RacingHand
  ai: RacingHand
  events: GameEvent[]
  phase: 'racing' | 'complete'
}

/**
 * Advance one pit from currentPit, skipping the opponent's store.
 * Player skips pit 15 (AI_STORE); AI skips pit 7 (PLAYER_STORE).
 */
function nextPitFor(currentPit: number, actor: PlayerKey): number {
  const skipPit = actor === 'player' ? AI_STORE : PLAYER_STORE
  let next = (currentPit + 1) % 16
  if (next === skipPit) {
    next = (next + 1) % 16
  }
  return next
}

function isOwnStore(pit: number, actor: PlayerKey): boolean {
  return actor === 'player' ? pit === PLAYER_STORE : pit === AI_STORE
}

function event(type: GameEventType, actor: PlayerKey, pit: number): GameEvent {
  return { type, actor, pit }
}

/**
 * Actor selects a start pit for the racing phase.
 * Also handles the "paused" re-pick: when an actor's status is 'paused'
 * after landing in their own store, they call selectStartPit again to
 * choose any non-empty own pit.
 */
export function selectStartPit(
  state: RacingState,
  actor: PlayerKey,
  pit: number
): RacingState {
  const board = [...state.board]
  const seeds = board[pit]
  board[pit] = 0

  const hand: RacingHand = {
    pit,
    seeds,
    status: 'moving',
    hasDied: state[actor].hasDied,
  }

  return {
    ...state,
    board,
    [actor]: hand,
    events: [...state.events, event('PIT_SELECTED', actor, pit)],
  }
}

/**
 * Advance the racing phase by one tick.
 *
 * Both actors advance SIMULTANEOUSLY:
 *   1. Compute both next-pit positions BEFORE modifying the board.
 *   2. Detect collision (same pit).
 *   3. Deposit seeds and resolve outcomes.
 *
 * Actors with status 'dead', 'selecting', or 'paused' are skipped.
 */
export function racingTick(state: RacingState): RacingState {
  const board = [...state.board]
  let player = { ...state.player }
  let ai = { ...state.ai }
  const events: GameEvent[] = [...state.events]

  const playerMoving = player.status === 'moving'
  const aiMoving = ai.status === 'moving'

  // — Compute next pit for each moving actor FIRST (no board mutation yet) —
  const playerNext = playerMoving ? nextPitFor(player.pit!, 'player') : null
  const aiNext = aiMoving ? nextPitFor(ai.pit!, 'ai') : null

  // — Collision detection —
  const collision = playerMoving && aiMoving && playerNext === aiNext

  if (collision) {
    const nextPit = playerNext!
    // Both deposit their seed simultaneously
    board[nextPit] += 2
    // Snapshot pit count before any chaining so we can split fairly if both actors chain
    const depositedCount = board[nextPit]

    // Resolve player
    player = { ...player, pit: nextPit, seeds: player.seeds - 1 }
    if (player.seeds === 0) {
      if (isOwnStore(nextPit, 'player')) {
        player = { ...player, status: 'paused' }
        events.push(event('PLAYER_PAUSED', 'player', nextPit))
      } else {
        // Collision immunity: no death even if pit was empty — chain instead.
        // If AI also runs out this tick, split the pit evenly so AI isn't left with 0.
        const aiAlsoChains = ai.seeds === 1 && !isOwnStore(nextPit, 'ai')
        const chainSeeds = aiAlsoChains ? Math.floor(depositedCount / 2) : board[nextPit]
        board[nextPit] -= chainSeeds
        player = { ...player, seeds: chainSeeds }
        events.push(event('CHAIN_TRIGGERED', 'player', nextPit))
      }
    }

    // Resolve AI (board now reflects player's share if a split occurred)
    ai = { ...ai, pit: nextPit, seeds: ai.seeds - 1 }
    if (ai.seeds === 0) {
      if (isOwnStore(nextPit, 'ai')) {
        ai = { ...ai, status: 'paused' }
        events.push(event('PLAYER_PAUSED', 'ai', nextPit))
      } else {
        // Collision immunity: no death — chain instead
        const chainSeeds = board[nextPit]
        board[nextPit] = 0
        ai = { ...ai, seeds: chainSeeds }
        events.push(event('CHAIN_TRIGGERED', 'ai', nextPit))
      }
    }
  } else {
    // — Non-collision: resolve each actor independently —
    if (playerMoving) {
      const nextPit = playerNext!
      const preDepositCount = board[nextPit]
      board[nextPit]++
      player = { ...player, pit: nextPit, seeds: player.seeds - 1 }

      if (player.seeds === 0) {
        if (isOwnStore(nextPit, 'player')) {
          player = { ...player, status: 'paused' }
          events.push(event('PLAYER_PAUSED', 'player', nextPit))
        } else if (preDepositCount === 0) {
          // Empty pit — player dies
          player = { ...player, status: 'dead', hasDied: true }
          events.push(event('PLAYER_DIED', 'player', nextPit))
        } else {
          // Non-empty pit — chain: pick up all seeds
          const chainSeeds = board[nextPit]
          board[nextPit] = 0
          player = { ...player, seeds: chainSeeds }
          events.push(event('CHAIN_TRIGGERED', 'player', nextPit))
        }
      }
    }

    if (aiMoving) {
      const nextPit = aiNext!
      const preDepositCount = board[nextPit]
      board[nextPit]++
      ai = { ...ai, pit: nextPit, seeds: ai.seeds - 1 }

      if (ai.seeds === 0) {
        if (isOwnStore(nextPit, 'ai')) {
          ai = { ...ai, status: 'paused' }
          events.push(event('PLAYER_PAUSED', 'ai', nextPit))
        } else if (preDepositCount === 0) {
          // Empty pit — AI dies
          ai = { ...ai, status: 'dead', hasDied: true }
          events.push(event('PLAYER_DIED', 'ai', nextPit))
        } else {
          // Non-empty pit — chain: pick up all seeds
          const chainSeeds = board[nextPit]
          board[nextPit] = 0
          ai = { ...ai, seeds: chainSeeds }
          events.push(event('CHAIN_TRIGGERED', 'ai', nextPit))
        }
      }
    }
  }

  // Phase is complete only when BOTH actors have died
  const phase = player.hasDied && ai.hasDied ? 'complete' : state.phase

  return { board, player, ai, events, phase }
}
