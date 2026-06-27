# Mak Khum — UI/UX Specification

## 1. Purpose

This document defines the user interface, screen structure, interaction behavior, visual feedback, animation requirements, and UX rules for **Mak Khum**, a 1v1 Thai mancala-style board game against an AI opponent.

This file should be used together with:

```txt
GAME_CONCEPT.md
ArtDesignConcept.md

```

The goal of this document is to make the game UI clear enough for implementation before coding begins.

---

## 2. UX Design Goals

Mak Khum should feel like:

> A cozy Thai folk-cartoon strategy board game with a clear wooden board, satisfying seed movement, playful AI rivalry, and readable phase-based gameplay.

The UX must prioritize:

1. **Board readability**

   * Players must instantly understand pit positions, seed counts, stores, and valid moves.

2. **Phase clarity**

   * Racing Phase and Turn-Based Phase must feel visually and functionally different.

3. **Rule feedback**

   * Chain, collision, pause, death, capture, and free turn must be obvious.

4. **Low cognitive overload**

   * The rules are complex, so the UI should explain only what is needed at the current moment.

5. **Playful AI personality**

   * The AI should feel like a funny rival, not just a silent bot.

6. **Mobile-friendly design**

   * The game should work on desktop first, but layout decisions should not block future mobile support.

---

## 3. Core Screen List

The game should contain these main screens:

```txt
Main Menu
Rules Screen / Modal
Settings Modal
Main Game Screen
Pause Menu
Hint Panel / Modal
Game Over Screen
```

---

# 4. Main Menu

## 4.1 Purpose

The Main Menu introduces the game style and lets the player start quickly.

## 4.2 Required Elements

```txt
Mak Khum Logo
Thai subtitle: หมากขุม
Wooden Mak Khum board preview
AI mascot preview
Primary button: Play
Secondary button: Rules
Secondary button: Settings
Optional button: Credits
```

## 4.3 Recommended Layout

```txt
 ------------------------------------------------
|                 MAK KHUM Logo                  |
|                  หมากขุม                       |
|                                                |
|          Decorative Mak Khum Board             |
|                                                |
|               [ Play Game ]                    |
|               [ Rules ]                        |
|               [ Settings ]                     |
|                                                |
|     AI mascot peeking from side / bottom       |
 ------------------------------------------------
```

## 4.4 Interaction

| Action            | Result                                          |
| ----------------- | ----------------------------------------------- |
| Click `Play Game` | Starts a new game and enters Racing Phase setup |
| Click `Rules`     | Opens Rules Screen / Modal                      |
| Click `Settings`  | Opens Settings Modal                            |
| Click `Credits`   | Opens credits panel if implemented              |

---

# 5. Settings Modal

## 5.1 Purpose

Settings allow the player to configure AI API access and basic game preferences.

## 5.2 Required Fields

```txt
OpenRouter API Key input
Save API Key button
Clear API Key button
Model status display
Sound toggle
Animation speed option
Close button
```

## 5.3 API Key UX

The API key should be stored in `localStorage`.

### API Key Field Behavior

| State              | UX                                             |
| ------------------ | ---------------------------------------------- |
| Empty              | Placeholder: `Enter OpenRouter API key`        |
| Saved              | Show masked key, e.g. `sk-or-••••••••1234`     |
| Invalid            | Show warning message                           |
| Saved successfully | Show small success message                     |
| Cleared            | Remove from localStorage and show confirmation |

## 5.4 Safety Message

The modal should include a short note:

```txt
Your API key is stored locally in this browser only.
```

---

# 6. Rules Screen / Modal

## 6.1 Purpose

The rules screen explains the game without overwhelming the player.

## 6.2 Structure

Rules should be split into tabs or sections:

```txt
Basic Board
Racing Phase
Turn-Based Phase
Special Rules
Win Condition
```

## 6.3 Recommended UX

Use short explanations with diagrams instead of long paragraphs.

Example:

```txt
Your pits: 0 1 2 3 4 5 6
Your Store: 7

AI pits: 8 9 10 11 12 13 14
AI Store: 15
```

## 6.4 Must Explain Clearly

* Seeds move in ascending index order
* Opponent store is skipped
* Racing Phase is simultaneous
* Store landing pauses the player
* Empty pit landing kills the player in Racing Phase
* Collision prevents death
* Turn-Based Phase has Free Turn, Capture, and Chain
* Opposite pit formula: `oppositePit = 14 - currentPit`

---

# 7. Main Game Screen

## 7.1 Purpose

The Main Game Screen is where all gameplay happens.

The board must always be the visual center.

## 7.2 Desktop Layout

Recommended desktop layout:

```txt
 ---------------------------------------------------------------------
| Logo                  Phase Banner                Settings | Hint   |
|                                                                     |
| AI Card + Avatar      AI Trash Talk Bubble          Game Status     |
|                                                                     |
|                                                                     |
|                         Mak Khum Board                              |
|                                                                     |
|                                                                     |
| Player Card           Rule / Action Helper          Round / Phase   |
|                                                                     |
|              Pause | Resume | Surrender | Optional Controls         |
 ---------------------------------------------------------------------
```

## 7.3 Main Screen Components

| Component         | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| Logo              | Game identity                                         |
| Phase Banner      | Shows Racing Phase or Turn-Based Phase                |
| AI Card           | AI name, avatar, store score, status                  |
| Player Card       | Player avatar, store score, status                    |
| Game Status Panel | Current phase, current player, seed total, turn state |
| Mak Khum Board    | Main interactive gameplay area                        |
| Action Helper     | Explains what the player should do next               |
| Hint Button       | Requests AI hint                                      |
| Settings Button   | Opens Settings Modal                                  |
| Pause Button      | Pauses game                                           |
| Surrender Button  | Ends current game early                               |

---

# 8. Board UI Specification

## 8.1 Board Layout

The board has 16 pits.

```txt
AI Store [15] | AI pits [14][13][12][11][10][9][8] | Player Store [7]

               Player pits [0][1][2][3][4][5][6]
```

## 8.2 Recommended Visual Layout

```txt
         [14] [13] [12] [11] [10] [9] [8]
 [15]                                           [7]
          [0]  [1]  [2]  [3]  [4] [5] [6]
```

## 8.3 Pit Display Requirements

Each pit must show:

```txt
Pit number
Seed count
Seeds visual
Current state highlight
```

## 8.4 Store Display Requirements

Each store must show:

```txt
Owner label
Pit index
Seed count
Decorative larger pit shape
Score emphasis
```

Example labels:

```txt
AI Store
Player Store
```

## 8.5 Pit States

| State                    | Visual Treatment                      |
| ------------------------ | ------------------------------------- |
| Normal                   | Wooden pit with seeds                 |
| Empty                    | Darker pit, no seed visuals           |
| Selectable               | Soft glowing outline                  |
| Hovered                  | Slight scale-up or brighter outline   |
| Active source pit        | Strong glow and hand marker           |
| Currently receiving seed | Sparkle / drop animation              |
| Chain pit                | Flash + `CHAIN!` popup                |
| Collision pit            | White/gold flash + `COLLISION!` popup |
| Death pit                | Red flash + `DIED!` popup             |
| Capture pit              | Blue/gold capture highlight           |
| Opposite capture pit     | Linked line to landing pit            |
| Disabled                 | Dimmed and not clickable              |

---

# 9. Player and AI Cards

## 9.1 Player Card

The Player Card should show:

```txt
Player avatar
Name: YOU
Store score
Current status
Optional current hand count
```

### Player Status Values

```txt
Waiting
Selecting Pit
Moving
Paused
Died
Thinking
Won
Lost
```

## 9.2 AI Card

The AI Card should show:

```txt
AI avatar
AI name
Store score
Current status
Thinking indicator
Trash talk bubble
```

### Suggested AI Name

```txt
Silly Maka
KhumBot
Nong Khum
Siam Maka
```

## 9.3 AI Thinking State

When waiting for AI response:

```txt
AI is thinking...
```

Use animated dots or small glowing indicator.

If API fails:

```txt
AI used fallback move.
```

Do not expose technical error details in the main game UI unless the player opens details.

---

# 10. Phase Banner

## 10.1 Racing Phase Banner

Text:

```txt
RACING PHASE
Seeds are moving around the board!
```

Visual:

```txt
Red / gold banner
Energetic glow
Motion accents
```

## 10.2 Turn-Based Phase Banner

Text:

```txt
TURN-BASED PHASE
Choose your move carefully.
```

Visual:

```txt
Blue / gold banner
Calmer glow
Strategy mood
```

## 10.3 Game Over Banner

Text depends on result:

```txt
YOU WIN!
AI WINS!
DRAW!
```

---

# 11. Racing Phase UX

## 11.1 Purpose

Racing Phase is simultaneous and real-time. The UI must show both players moving at the same time.

## 11.2 Racing Phase Start

At the beginning of Racing Phase:

```txt
Both players choose one starting pit from their own side.
```

### Player UX

* Player pits `0–6` with seeds are highlighted.
* Empty pits are disabled.
* AI chooses a valid pit automatically.
* Once both choices are ready, seed movement starts.

### Helper Text

```txt
Choose a non-empty pit to start racing.
```

---

## 11.3 Active Movement UX

During Racing Phase:

* Player seed movement uses blue trail.
* AI seed movement uses orange/red trail.
* Seeds move step-by-step every tick.
* Tick interval is 400ms according to game logic.
* UI animation must never change the actual logic timing.

### Important Rule

The animation can be smooth, but the game state must update according to the real tick system.

```txt
Logic tick = source of truth
Animation = visual feedback only
```

---

## 11.4 Store Pause UX

When a player lands in their own store:

```txt
Player pauses and must select a new non-empty pit on their own side.
```

### Visual Feedback

```txt
Store glows gold
Player marker freezes
Status changes to PAUSED
Valid own pits glow
```

### Helper Text for Player

```txt
You landed in your Store. Choose another non-empty pit to continue.
```

### If AI Pauses

```txt
AI is choosing another pit...
```

---

## 11.5 Empty Pit Death UX

When a player lands in an empty pit during Racing Phase:

```txt
That player dies once and becomes inactive.
```

### Visual Feedback

```txt
Landing pit flashes red
DIED! popup appears
Player status becomes Died
Seed trail stops
```

### Helper Text

For player death:

```txt
You landed in an empty pit. Your racing hand is dead.
```

For AI death:

```txt
AI landed in an empty pit.
```

---

## 11.6 Chain UX

When a player lands in a non-empty pit:

```txt
The player picks up all seeds in that pit and continues moving.
```

### Visual Feedback

```txt
Pit flashes
Seeds bounce upward
CHAIN! popup appears
Movement continues
```

---

## 11.7 Collision UX

When both players drop into the same pit in the same tick:

```txt
The pit receives 2 seeds.
Neither player dies from empty pit landing.
```

### Visual Feedback

```txt
Blue and red trails meet
Pit flashes white/gold
COLLISION! popup appears
Seed count increases by 2
Both players continue resolving naturally
```

### Helper Text

```txt
Collision! Both seeds landed together, so nobody dies here.
```

---

## 11.8 Racing Phase End UX

Racing Phase ends when:

```txt
Both players have died once.
```

### Transition

Show short phase transition overlay:

```txt
Racing Phase Complete
Entering Turn-Based Phase
```

Then switch to Turn-Based Phase UI.

Recommended duration:

```txt
1.0s to 1.5s
```

---

# 12. Turn-Based Phase UX

## 12.1 Purpose

Turn-Based Phase is slower and more strategic.

The UI should feel calmer than Racing Phase.

## 12.2 Start of Turn

At the start of the player’s turn:

```txt
Highlight all valid non-empty player pits.
```

Helper text:

```txt
Choose a non-empty pit on your side.
```

At the start of AI turn:

```txt
AI is thinking...
```

The player should not be able to click pits during AI turn.

---

## 12.3 Move Preview

When hovering over or selecting a pit, the UI should optionally preview:

```txt
Sowing path
Final landing pit
Possible special outcome
```

Example preview text:

```txt
This move may give you a Free Turn.
```

or

```txt
This move may trigger Capture.
```

Preview does not need to be perfect in MVP, but should be accurate if included.

---

## 12.4 Free Turn UX

When the last seed lands in the player’s own store:

```txt
Player gets another turn.
```

### Visual Feedback

```txt
Store glows gold
FREE TURN! popup appears
Valid pits remain highlighted
```

Helper text:

```txt
Free Turn! Choose another pit.
```

---

## 12.5 Capture / Kin UX

When the last seed lands in an empty pit on the player’s side and the opposite pit has seeds:

```txt
The last seed and opposite seeds move to the player’s store.
```

### Visual Feedback

```txt
Landing pit glows
Opposite pit glows
A line connects both pits
Seeds fly from both pits into store
KIN! or CAPTURE! popup appears
Store seed count increases
```

Recommended popup text:

```txt
KIN!
```

or

```txt
CAPTURE!
```

Since this is a Thai game, `KIN!` gives stronger identity.

---

## 12.6 Chain UX

When the last seed lands in a non-empty non-store pit:

```txt
The player picks up seeds from that pit and continues sowing.
```

### Visual Feedback

```txt
CHAIN! popup
Pit flashes
Seeds continue moving
```

Important:

```txt
Chaining never triggers in either Store.
```

---

## 12.7 End Turn UX

The turn ends when no free turn or chain continues.

### Player turn ends

```txt
Turn changes to AI
Player pits dim
AI status becomes Thinking
```

### AI turn ends

```txt
Turn changes to Player
Valid player pits glow
```

---

# 13. Hint UX

## 13.1 Purpose

The player can request a hint during their turn.

## 13.2 Hint Button Rules

The Hint button should be enabled only when:

```txt
It is the player’s turn
Game is not animating
Game is not over
```

## 13.3 Hint Loading State

When clicked:

```txt
Getting hint...
```

Show loading indicator.

## 13.4 Hint Result Format

The hint should be short and actionable.

Example:

```txt
Try pit 3. It may create a chain and improve your store count.
```

## 13.5 Hint Failure

If AI hint fails:

```txt
Hint unavailable. Try looking for a move that reaches your Store or captures opposite seeds.
```

---

# 14. AI Trash Talk UX

## 14.1 Purpose

Trash talk makes the AI opponent feel alive.

## 14.2 Display Location

AI trash talk appears in a speech bubble near the AI avatar.

## 14.3 Timing

Trash talk may appear:

```txt
After AI move
After collision
After AI capture
After player mistake
At game over
```

## 14.4 Tone

Trash talk should be funny and playful, not toxic.

Examples:

```txt
Nice move... but mine is better!
That pit was bait.
My seeds are smarter than yours.
Careful, I am calculating chaos.
You almost had me. Almost.
```

---

# 15. Action Helper Panel

## 15.1 Purpose

The helper panel tells the player what to do next.

It should change based on game state.

## 15.2 Example Messages

| State             | Message                                                       |
| ----------------- | ------------------------------------------------------------- |
| Racing setup      | `Choose a pit to start racing.`                               |
| Player paused     | `You landed in your Store. Choose another pit to continue.`   |
| AI thinking       | `AI is thinking...`                                           |
| Player turn       | `Choose a non-empty pit on your side.`                        |
| Animation playing | `Seeds are moving...`                                         |
| Free turn         | `Free Turn! Choose again.`                                    |
| Capture           | `Kin! Seeds captured into your Store.`                        |
| Game over         | `Game finished. Remaining seeds have been swept into Stores.` |

---

# 16. Animation Requirements

## 16.1 General Principles

Animations must improve clarity, not hide the game state.

All animations should be:

```txt
Fast
Readable
Non-blocking where possible
Consistent with logic
```

## 16.2 Seed Drop Animation

Each seed drop should show:

```txt
Seed moving to target pit
Small bounce or sparkle on landing
Seed count update
```

## 16.3 Animation Timing

Recommended values:

| Animation           | Duration         |
| ------------------- | ---------------- |
| Seed move           | 200ms to 300ms   |
| Pit flash           | 300ms            |
| Popup text          | 600ms to 900ms   |
| Phase transition    | 1000ms to 1500ms |
| Capture seed flight | 500ms to 800ms   |

Important:

```txt
Racing Phase logic tick remains 400ms.
Animation must not desync from actual game state.
```

---

# 17. Responsive Design

## 17.1 Desktop

Desktop is the primary target.

Recommended minimum:

```txt
1280 x 720
```

Board should be large and centered.

## 17.2 Tablet

Tablet layout should preserve the board horizontally.

Adjustments:

```txt
Smaller side panels
Bottom helper panel
Compact buttons
```

## 17.3 Mobile

Mobile support is optional for MVP but should be considered.

Possible mobile layout:

```txt
Vertical layout
Top: Phase + score
Middle: Board
Bottom: Action buttons + helper
AI trash talk as collapsible bubble
```

If mobile board becomes unreadable, allow horizontal orientation recommendation:

```txt
Please rotate your device for best experience.
```

---

# 18. Accessibility

## 18.1 Readability

* Pit numbers must be readable.
* Seed counts must not rely only on visual seed quantity.
* Important text must have strong contrast.
* Buttons must have clear labels.

## 18.2 Color Independence

Do not rely only on color.

Example:

```txt
Player side = blue + label "YOU"
AI side = red + label "AI"
```

## 18.3 Reduced Motion

If possible, include reduced motion mode.

Reduced motion should:

```txt
Minimize seed travel animation
Keep state updates clear
Still show popups and highlights
```

---

# 19. Error and Edge States

## 19.1 Invalid Click

If the player clicks an invalid pit:

```txt
Small shake animation
Helper text explains why
```

Example:

```txt
Choose a non-empty pit on your side.
```

## 19.2 AI API Error

If AI API fails:

```txt
AI used fallback move.
```

Detailed error may be available in Settings or developer console, but not required in main UI.

## 19.3 No API Key

If no API key is configured:

```txt
AI will use local fallback logic.
```

The game should still be playable.

## 19.4 Game Paused

When game is paused:

```txt
Dark overlay
Resume button
Settings button
Main Menu button
```

---

# 20. Game Over UX

## 20.1 Trigger

Game ends when either player has no valid moves.

## 20.2 Visual Sequence

1. Stop interactions
2. Sweep remaining seeds into each player’s own Store
3. Count final scores
4. Show result banner

## 20.3 Game Over Modal

Required elements:

```txt
Result: YOU WIN / AI WINS / DRAW
Your final score
AI final score
AI reaction
Play Again button
Main Menu button
View Rules button
```

## 20.4 Example Layout

```txt
 -----------------------------
|          YOU WIN!           |
|                             |
|      Your Store: 52         |
|      AI Store: 46           |
|                             |
|  AI: "Okay... lucky game."  |
|                             |
|   [ Play Again ] [ Menu ]   |
 -----------------------------
```

---

# 21. MVP UI Scope

The MVP must include:

```txt
Main Menu
Settings Modal
Rules Modal
Main Game Screen
Playable board
Racing Phase UI
Turn-Based Phase UI
Game Over screen
Basic AI status
Basic hint button
Basic trash talk bubble
```

## 21.1 MVP Can Be Simple For

```txt
Advanced animations
Mobile layout
Sound effects
Credits screen
Perfect move preview
Advanced avatar expressions
```

## 21.2 MVP Cannot Skip

```txt
Clear pit numbers
Clear seed counts
Valid pit highlighting
Phase banner
Pause/death/chain/collision feedback
Turn indicator
Game over score
```

---

# 22. UI Acceptance Criteria

## 22.1 Board Acceptance Criteria

* Player can clearly identify pits `0–6`.
* AI pits `8–14` are visible and readable.
* Player Store `7` and AI Store `15` are visually distinct.
* Every pit displays an accurate seed count.
* Empty pits are visually distinguishable from non-empty pits.

## 22.2 Racing Phase Acceptance Criteria

* Player can select only valid own pits.
* Both player and AI movement can be visually tracked.
* Store pause is clearly shown.
* Empty pit death is clearly shown.
* Collision is clearly shown.
* Chain is clearly shown.
* Racing Phase transition to Turn-Based Phase is clear.

## 22.3 Turn-Based Phase Acceptance Criteria

* Current player is always obvious.
* Player can only select valid pits.
* Free Turn feedback is clear.
* Capture / Kin feedback is clear.
* Chain feedback is clear.
* AI thinking state is visible.
* Player cannot interact during AI turn or active animation.

## 22.4 Settings Acceptance Criteria

* Player can enter and save API key.
* Player can clear API key.
* Game works even without API key.
* API key status is understandable.

## 22.5 Game Over Acceptance Criteria

* Remaining seeds are swept into stores.
* Final score is shown.
* Winner/draw result is shown.
* Player can restart the game.

---

# 23. Implementation Notes

## 23.1 State Should Drive UI

The UI should render from game state, not from animation assumptions.

Recommended state categories:

```txt
phase
currentTurn
boardSeeds
playerStatus
aiStatus
selectedPit
activeAnimations
lastEvent
gameResult
```

## 23.2 Recommended Event Types

The UI should react to game events such as:

```txt
PIT_SELECTED
SEED_DROPPED
CHAIN_TRIGGERED
COLLISION_TRIGGERED
PLAYER_PAUSED
PLAYER_DIED
FREE_TURN_TRIGGERED
CAPTURE_TRIGGERED
TURN_CHANGED
PHASE_CHANGED
GAME_OVER
```

## 23.3 UI Event Log

For debugging, it is useful to keep a small internal event log.

Example:

```txt
Tick 12: Player dropped seed into pit 4
Tick 12: AI dropped seed into pit 4
Tick 12: Collision triggered
```

This does not need to be visible to normal players.

---

# 24. Final UX Summary

Mak Khum’s UI should make a complex two-phase board game feel easy to understand.

The board must be the hero.
Racing Phase must feel alive and chaotic.
Turn-Based Phase must feel calm and strategic.
The AI must feel playful and memorable.
Every special rule must produce clear visual feedback.

The player should never wonder:

```txt
Whose turn is it?
Which pit can I click?
Where did the seed go?
Why did Chain happen?
Why did Collision prevent death?
Why did Capture happen?
Who is winning?
```
