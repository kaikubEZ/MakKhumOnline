# Mak Khum — Game Concept & Rules

## What it is

**Mak Khum** (หมากขุม) is a traditional Thai mancala-style board game. Two players compete to collect the most seeds into their Store. This implementation is 1v1 vs an AI opponent powered by the Gemini API.

---

## Board Layout

```
AI Store [15] | AI pits: [14][13][12][11][10][9][8] |
               | Your pits: [0][1][2][3][4][5][6]   | Your Store [7]
```

- **16 pits total** — index 0–15
- **Player 0 (You):** pits 0–6 (playfield) + pit 7 (Store)
- **Player 1 (AI):** pits 8–14 (playfield) + pit 15 (Store)
- **Starting seeds:** 7 seeds in each of the 14 playfield pits (98 seeds total)
- Seeds flow in **ascending index order**: 0 → 1 → 2 → … → 15 → 0 (wrapping). On this board layout that corresponds to counter-clockwise: along your row left-to-right, through your Store, along the AI row left-to-right, through the AI Store, then back to pit 0.
- Each player **skips the opponent's Store** when sowing

---

## Phase 1 — Racing Phase (Simultaneous)

Both players act **at the same time**, ticked every 400ms. Only **active** (non-paused) players advance each tick; a paused player is frozen and skips ticks until they select a new pit.

### Flow
1. Each player picks a starting pit from their side → seeds picked up into hand
2. Each tick: all active players drop one seed into the next pit (skipping opponent's store)
3. When a player's last seed drops:

| Landing condition | Result |
|---|---|
| Lands in **own Store** | Player **pauses** — frozen until they pick any non-empty pit on their own side to continue |
| Lands in an **empty pit** | Player **dies** — hand goes inactive (`hasDiedOnce = true`) |
| Lands in a **non-empty pit** | **Chain** — pick up all seeds there and keep moving |

### Collision Rule
If both players drop into the same pit in the same tick, the pit receives **2 seeds** (one from each player) and is therefore non-empty — neither player triggers "empty pit death". Both chain naturally.

### Phase End
When **both players have died once**, the Racing Phase ends and the game transitions to **Turn-Based Phase**.

---

## Phase 2 — Turn-Based Phase

Standard mancala alternating turns.

**On your turn:** pick any non-empty pit on your side → sow seeds one-by-one in ascending index order, skipping the opponent's Store (pit 15).

### Special outcomes when the last seed drops

| Outcome | Condition | Result |
|---|---|---|
| **Free Turn** | Last seed lands in **your Store (pit 7)** | You play again immediately |
| **Capture (Kin)** | Last seed lands in an **empty pit on your side** AND the directly opposite pit has seeds | Your last seed + all opposite seeds move to your Store |
| **Chain** | Last seed lands in a **non-empty pit that is not a Store** (not pit 7 or pit 15) | Pick up all seeds there and continue sowing |

> Note: landing in the opponent's Store (pit 15) cannot occur during normal sowing because it is always skipped.

### Opposite pit formula
```
oppositePit = 14 - currentPit
```

---

## Win Condition

Game ends when **either player has no valid moves** (all playfield pits on their side are empty).

1. Each player's remaining seeds in their playfield pits are swept into **their own Store** (your seeds → pit 7; AI seeds → pit 15)
2. **Player with the most seeds in their Store wins**
3. Equal seeds = **Draw**

---

## AI System

- Uses **OpenRouter API** with a openrouter/owl-alpha
- AI plays both phases: selects starting pit in Racing, selects moves in Turn-Based
- AI generates **trash talk** after moves (~70% frequency)
- Player can request **hints** on their turn
- API key is user-configurable via Settings modal (stored in `localStorage`)

### Model failover order
```
openrouter/owl-alpha
→ nvidia/nemotron-3-ultra-550b-a55b:free
→ poolside/laguna-m.1:free
→ nvidia/nemotron-3-super-120b-a12b:free
→ openai/gpt-oss-120b:free
→ poolside/laguna-xs.2:free
→ cohere/north-mini-code:free
→ google/gemma-4-31b-it:free
→ openai/gpt-oss-20b:free
```

---

## Rules to Preserve in Redesign

- Two-phase structure: Racing → Turn-Based
- Simultaneous real-time Racing Phase with chain/death/store-pause mechanics
- Paused players are frozen; other active players continue sowing every 400ms
- Collision immunity: both players landing on same pit same tick deposits 2 seeds — pit is non-empty, no death for either
- Store-pause re-pick: must choose any non-empty pit on own side only
- Turn-Based: free turn, capture (Kin), and chaining on last seed (chaining never triggers in either Store)
- Opponent's Store is always skipped during sowing
- `oppositePit = 14 - currentPit` capture formula
- Win by seed count after sweeping each side's remaining seeds into their own Store
