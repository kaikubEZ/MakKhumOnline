import type { PlayerKey, GameEvent } from './types'
import { sow } from './sow'
import {
  oppositePit,
  getValidPits,
  PLAYER_STORE,
  AI_STORE,
  PLAYER_PITS,
  AI_PITS,
  isStore,
} from './board'

export interface TurnState {
  board: number[]
  currentTurn: PlayerKey
  events: GameEvent[]
  phase: 'turnbased' | 'gameover'
}

function ownStore(actor: PlayerKey): number {
  return actor === 'player' ? PLAYER_STORE : AI_STORE
}

function isOwnPit(pit: number, actor: PlayerKey): boolean {
  const pits = actor === 'player' ? PLAYER_PITS : AI_PITS
  return pits.includes(pit)
}

function otherActor(actor: PlayerKey): PlayerKey {
  return actor === 'player' ? 'ai' : 'player'
}

/**
 * Resolve a full turn-based move from the given pit.
 * Recursively handles chains until a terminal outcome is reached:
 *   - Free Turn: last seed in own store → same actor continues
 *   - Chain: last seed in non-empty non-store pit → pick up & sow again
 *   - Capture (Kin): last seed in empty own pit, opposite has seeds → capture both to own store
 *   - Normal: turn passes to other actor
 * After full resolution, checks for game over (next actor has no valid pits).
 */
export function executeMove(state: TurnState, pit: number): TurnState {
  const actor = state.currentTurn
  const { board: newBoard, lastPit } = sow(state.board, pit, actor)
  const events: GameEvent[] = [...state.events]

  let resultState: TurnState

  if (lastPit === ownStore(actor)) {
    // Free turn: last seed lands in own store
    events.push({ type: 'FREE_TURN_TRIGGERED', actor, pit: lastPit })
    resultState = {
      board: newBoard,
      currentTurn: actor,
      events,
      phase: 'turnbased',
    }
  } else if (!isStore(lastPit) && newBoard[lastPit] > 1) {
    // Chain: last seed lands in a non-empty non-store pit
    events.push({ type: 'CHAIN_TRIGGERED', actor, pit: lastPit })
    // Recurse — game over check happens inside the recursive call
    return executeMove(
      { board: newBoard, currentTurn: actor, events, phase: state.phase },
      lastPit
    )
  } else if (
    !isStore(lastPit) &&
    isOwnPit(lastPit, actor) &&
    newBoard[lastPit] === 1 &&
    newBoard[oppositePit(lastPit)] > 0
  ) {
    // Capture (Kin): last seed in empty own pit, opposite pit has seeds
    const opp = oppositePit(lastPit)
    const store = ownStore(actor)
    const capturedBoard = [...newBoard]
    capturedBoard[store] += capturedBoard[lastPit] + capturedBoard[opp]
    capturedBoard[lastPit] = 0
    capturedBoard[opp] = 0
    events.push({ type: 'CAPTURE_TRIGGERED', actor, pit: lastPit })
    resultState = {
      board: capturedBoard,
      currentTurn: otherActor(actor),
      events,
      phase: 'turnbased',
    }
  } else {
    // Normal end: turn passes to other actor
    resultState = {
      board: newBoard,
      currentTurn: otherActor(actor),
      events,
      phase: 'turnbased',
    }
  }

  // Game over check: if next actor has no valid pits, the game ends
  const nextActor = resultState.currentTurn
  if (getValidPits(resultState.board, nextActor).length === 0) {
    resultState = {
      ...resultState,
      events: [...resultState.events, { type: 'GAME_OVER', actor: nextActor }],
      phase: 'gameover',
    }
  }

  return resultState
}
