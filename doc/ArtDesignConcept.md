# Mak Khum — Art Direction & UI Design

## 1. Core Art Style

**Style Name:** Thai Folk-Cartoon Board Game UI

Mak Khum should look like a cozy traditional Thai board game redesigned as a modern digital strategy game. The visual style should feel warm, playful, readable, and culturally Thai without becoming too realistic or overly historical.

### Keywords

* Cozy Thai folk cartoon
* 2.5D board game UI
* Hand-painted wooden board
* Warm fantasy-but-not-RPG atmosphere
* Thai decorative patterns
* Cute competitive strategy
* Playful AI opponent
* Clear seed movement and pit readability

### Mood

The game should feel like:

> A traditional Thai Mak Khum board placed on a wooden table, upgraded with modern game UI, glowing seed trails, cute avatars, and playful AI trash talk.

---

## 2. Visual Identity

## 2.1 Overall Vibe

Mak Khum is not a medieval RPG battle game.
The board itself is the main character.

The design should focus on:

* The wooden Mak Khum board
* Seed movement
* Player vs AI rivalry
* Racing Phase chaos
* Turn-Based Phase strategy
* Thai cultural atmosphere

Avoid making it look like a generic fantasy combat game.

---

## 2.2 Color Palette

### Main Colors

| Purpose     | Color Direction                |
| ----------- | ------------------------------ |
| Board       | Warm carved wood brown         |
| UI frame    | Gold / dark wood               |
| Player side | Blue / teal                    |
| AI side     | Red / orange / gold            |
| Seeds       | Cream, pearl, tamarind brown   |
| Background  | Warm Thai wooden house / table |
| Text panels | Parchment cream                |

### Suggested Feel

* Warm
* Handmade
* Premium but playful
* Traditional but modern

---

## 3. Board Design

## 3.1 Board as Main Focus

The Mak Khum board should take up the center of the screen.

Recommended layout:

```txt
AI Avatar + AI Info

AI Store [15] | [14][13][12][11][10][9][8] | Player Store [7]

              Mak Khum Board Center

Your Info     | [0][1][2][3][4][5][6] |
```

### Board Requirements

* 16 total pits
* 14 playfield pits
* 2 stores
* Clear pit numbers
* Large readable seed count
* Each side visually separated
* Player side uses blue accents
* AI side uses red/gold accents

---

## 3.2 Pit Design

Each pit should look like a carved wooden bowl.

### Pit States

| State            | Visual Treatment                 |
| ---------------- | -------------------------------- |
| Normal           | Wooden pit with seeds            |
| Selectable       | Soft blue glow                   |
| AI selectable    | Soft red/orange glow             |
| Active movement  | Animated glowing trail           |
| Last seed landed | Small impact sparkle             |
| Empty danger     | Darker pit / subtle warning      |
| Capture target   | Linked highlight to opposite pit |
| Chain            | Comic-style “CHAIN!” popup       |
| Collision        | Comic-style “COLLISION!” popup   |

---

## 4. Seed Design

Seeds should be satisfying to watch.

### Seed Visual Options

* Tamarind seeds
* Small shells
* Cream stone beads
* Pearl-like game pieces

### Seed Animation

During sowing:

* Seeds move one by one
* Movement follows board path
* Player trail = blue glow
* AI trail = orange/red glow
* Collision creates double sparkle
* Store drop creates golden shine

---

## 5. Phase Design

# 5.1 Racing Phase

The Racing Phase should feel fast, chaotic, and exciting.

### Visual Feel

> Two players are racing around the board at the same time.

### UI Elements

* Big top banner: `RACING PHASE`
* Subtitle: `Seeds are moving around the board!`
* Active seed trails for both players
* Player and AI movement indicators
* Status labels:

  * `CHAIN!`
  * `PAUSED`
  * `DIED!`
  * `COLLISION!`

### Racing Phase Rules to Show Visually

| Rule                       | Visual Feedback                                      |
| -------------------------- | ---------------------------------------------------- |
| Both players move together | Two glowing trails moving at once                    |
| 400ms tick                 | Step-by-step seed movement                           |
| Store pause                | Player marker freezes, “PAUSED” label appears        |
| Empty pit death            | Pit flashes red/dark, “DIED!” appears                |
| Collision immunity         | Blue and red trails hit same pit, “COLLISION!” popup |
| Chain                      | Seeds explode upward slightly, then continue moving  |

---

# 5.2 Turn-Based Phase

The Turn-Based Phase should feel calmer and more strategic.

### Visual Feel

> The game changes from chaotic racing into a thinking strategy duel.

### UI Elements

* Big top banner: `TURN-BASED PHASE`
* Current player indicator
* Valid pit highlights
* Move preview path
* Hint button
* End turn / continue status
* AI trash talk bubble

### Turn-Based Effects

| Outcome       | Visual Feedback                                 |
| ------------- | ----------------------------------------------- |
| Free Turn     | Store glows gold, “FREE TURN!” popup            |
| Capture / Kin | Opposite pit link animation, seeds fly to store |
| Chain         | “CHAIN!” popup, movement continues              |
| No valid move | Side dims, game end sequence starts             |

---

## 6. Character & Avatar Design

## 6.1 Player Avatar

The player should look friendly and relatable.

### Possible Design

* Cute Thai student
* Young strategist
* Casual gamer
* Blue outfit or blue UI frame

### Expression States

* Normal
* Thinking
* Happy
* Shocked
* Winning
* Losing

---

## 6.2 AI Opponent

The AI should be playful, smug, and memorable.

### Recommended Concept

A mischievous Thai-inspired AI mascot.

Possible designs:

* Cute monkey king style
* Small Thai mask-inspired AI spirit
* Yaksha-style robot
* Floating golden AI face
* Temple-fair trickster mascot

### Personality

* Smug
* Funny
* Competitive
* Slightly annoying
* Not scary

### AI Trash Talk Examples

```txt
Nice move... but mine is better!
That pit was bait.
You saw nothing.
My seeds are smarter than yours.
Careful, I am calculating chaos.
```

---

## 7. UI Layout

## 7.1 Main Screen Layout

```txt
 ---------------------------------------------------------
| Logo              Phase Banner             Settings Hint |
|                                                         |
| AI Info + Avatar          AI Trash Talk       Game Status |
|                                                         |
|                  Mak Khum Board                         |
|                                                         |
| Player Info       Rules / Tooltip        Phase / Round   |
|                                                         |
| Pause / Resume / Surrender / Hint Buttons               |
 ---------------------------------------------------------
```

---

## 7.2 Main UI Components

### Top Area

* Game logo
* Current phase banner
* Settings button
* Hint button

### Left Area

* AI opponent card
* Player card
* Score / store count

### Center Area

* Mak Khum board
* Seed movement
* Pit highlights
* Chain/collision/capture effects

### Right Area

* Game status panel
* Current turn
* Phase
* Seed count
* Round / move count

### Bottom Area

* Rule explanation card
* Action buttons
* Current selected pit
* Hint result / AI message

---

## 8. Typography

### Font Direction

Use fonts that are:

* Rounded
* Readable
* Cartoon-friendly
* Bold for headings
* Clean for numbers

### Text Style

| Text Type    | Style                         |
| ------------ | ----------------------------- |
| Logo         | Thai decorative, bold, golden |
| Phase banner | Big, bold, high contrast      |
| Pit numbers  | Simple and readable           |
| Rule text    | Clean sans-serif              |
| Popups       | Comic-style bold text         |

---

## 9. Animation Direction

## 9.1 Seed Movement

Seeds should move clearly around the board.

### Requirements

* One seed drop per tick
* Trail follows board direction
* Store skip is visually obvious
* Last seed has impact feedback
* Chain pickup has clear animation

---

## 9.2 Important Effects

### Chain

* Pit glows
* Seeds bounce slightly
* “CHAIN!” popup appears
* Movement continues

### Collision

* Blue and red trails meet
* Pit flashes white/gold
* “COLLISION!” popup appears
* Pit receives 2 seeds

### Store Pause

* Store glows
* Player marker freezes
* “PAUSED” label appears
* Own valid pits glow

### Capture / Kin

* Last seed lands on empty own pit
* Opposite pit is highlighted
* Line connects current pit to opposite pit
* Captured seeds fly into own store
* “KIN!” or “CAPTURE!” popup appears

### Death

* Empty pit flashes red/dark
* Small smoke or dust effect
* “DIED!” popup appears
* Player hand becomes inactive

---

## 10. Background Design

The background should support the board, not distract from it.

### Good Background Ideas

* Wooden Thai house table
* Riverside Thai house
* Temple fair table
* Thai classroom club room
* Warm evening market
* Traditional woven mat

### Props

* Thai ceramic pot
* Banana leaves
* Jasmine flowers
* Small golden ornament
* Woven basket
* Wooden table texture

Avoid clutter near the board.

---

## 11. Screen States

## 11.1 Main Menu

Visual direction:

* Mak Khum board in center
* Warm Thai background
* AI mascot peeking from side
* Buttons:

  * `Play`
  * `Rules`
  * `Settings`
  * `Credits`

---

## 11.2 Racing Phase Screen

Key visual elements:

* `RACING PHASE` banner
* Both trails moving
* Live player/AI status
* Collision and chain popups
* Pause/death indicators

---

## 11.3 Turn-Based Phase Screen

Key visual elements:

* `TURN-BASED PHASE` banner
* Current player highlight
* Valid pit glow
* Move preview
* Hint button
* AI trash talk bubble

---

## 11.4 Game Over Screen

Key visual elements:

* Final board state
* Seeds sweeping into stores
* Winner announcement
* Final score
* AI reaction
* Buttons:

  * `Play Again`
  * `Main Menu`
  * `View Rules`

---

## 12. Design Rules to Preserve

The redesign must visually support these rules:

* Two-phase structure: Racing → Turn-Based
* Simultaneous real-time Racing Phase
* Both players can move at the same time
* Paused players freeze while the other continues
* Collision deposits 2 seeds and prevents empty pit death
* Landing in own Store during Racing causes pause
* Landing in empty pit during Racing causes death
* Landing in non-empty pit causes chain
* Turn-Based Phase supports:

  * Free Turn
  * Capture / Kin
  * Chain
* Opponent Store is skipped
* Opposite pit formula: `oppositePit = 14 - currentPit`
* Game ends when either side has no valid moves
* Remaining seeds sweep into each player’s own Store

---

## 13. What to Avoid

Avoid:

* Generic medieval RPG design
* Swords, monsters, and battle-party UI
* Dark fantasy atmosphere
* Hyper-realistic Thai historical art
* Too many background details
* Small unreadable pit numbers
* Overly neon cyberpunk design
* UI that hides the board
* Effects that make seed count unclear

---

## 14. Final Art Direction Summary

Mak Khum should look like:

> A cozy Thai folk-cartoon strategy board game with a carved wooden Mak Khum board, glowing seed trails, playful AI trash talk, Thai decorative UI frames, and clear phase-based gameplay feedback.

The board must always be the center of attention.
The Racing Phase should feel chaotic and alive.
The Turn-Based Phase should feel calm and strategic.
The AI should feel funny, smug, and memorable.
