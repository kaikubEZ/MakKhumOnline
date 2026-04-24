import { GameState, MoveResult, AnimationState, MoveHistoryEntry } from './types';

export class MakKhumGame {
  private board: GameState;
  private currentPlayer: number;
  private isGameOver: boolean;
  private winner: number | null;
  private history: MoveHistoryEntry[];

  constructor(initialState?: GameState, startingPlayer = 0) {
    if (initialState) {
      this.board = [...initialState];
    } else {
      this.board = Array(16).fill(0);
      // Initialize 14 pits with 7 seeds each
      for (let i = 0; i < 7; i++) {
        this.board[i] = 7;
        this.board[i + 8] = 7;
      }
    }
    this.currentPlayer = startingPlayer;
    this.isGameOver = false;
    this.winner = null;
    this.history = [];
    this.checkWinCondition();
  }

  getBoard(): GameState {
    return [...this.board];
  }

  getCurrentPlayer(): number {
    return this.currentPlayer;
  }

  getIsGameOver(): boolean {
    return this.isGameOver;
  }

  getWinner(): number | null {
    return this.winner;
  }

  getHistory(): MoveHistoryEntry[] {
    return [...this.history];
  }

  getValidMoves(player: number): number[] {
    const startIdx = player === 0 ? 0 : 8;
    const moves: number[] = [];
    for (let i = startIdx; i < startIdx + 7; i++) {
      if (this.board[i] > 0) {
        moves.push(i);
      }
    }
    return moves;
  }

  play(pitIndex: number): MoveResult {
    const states: AnimationState[] = [];
    if (this.isGameOver) {
      return { nextTurn: this.currentPlayer, states: [{ board: this.getBoard(), seedsInHand: 0, activePit: null }], messages: ["Game is already over."] };
    }

    // Validate move
    const isValid = this.getValidMoves(this.currentPlayer).includes(pitIndex);
    if (!isValid) {
      throw new Error("Invalid move");
    }

    const messages: string[] = [];
    let currentPit = pitIndex;
    let seeds = this.board[currentPit];
    this.board[currentPit] = 0;

    // Initial pickup state
    states.push({ board: this.getBoard(), seedsInHand: seeds, activePit: currentPit });

    const playerStoreIndex = this.currentPlayer === 0 ? 7 : 15;
    const opponentStoreIndex = this.currentPlayer === 0 ? 15 : 7;
    const initialScore = this.board[playerStoreIndex];

    let isFreeTurn = false;
    let captured = false;

    while (seeds > 0) {
      currentPit = (currentPit + 1) % 16;

      // Skip opponent's store
      if (currentPit === opponentStoreIndex) {
        continue;
      }

      this.board[currentPit]++;
      seeds--;
      states.push({ board: this.getBoard(), seedsInHand: seeds, activePit: currentPit });

      // If it's the last seed
      if (seeds === 0) {
        // Condition 1: Lands in own store -> Free turn
        if (currentPit === playerStoreIndex) {
          isFreeTurn = true;
          messages.push("Landed in store! Free turn.");
          break; // End the sowing loop
        }

        // Condition 2: Lands in empty pit on own side -> Capture (Kin)
        const isOwnSide = (this.currentPlayer === 0 && currentPit >= 0 && currentPit < 7) ||
          (this.currentPlayer === 1 && currentPit >= 8 && currentPit < 15);

        if (isOwnSide && this.board[currentPit] === 1) { // 1 because we just added it
          const oppositePit = 14 - currentPit;
          const capturedSeeds = this.board[oppositePit];

          if (capturedSeeds > 0) {
            // Capture both the last seed and the opposite seeds
            this.board[playerStoreIndex] += (1 + capturedSeeds);
            this.board[currentPit] = 0;
            this.board[oppositePit] = 0;
            captured = true;
            states.push({ board: this.getBoard(), seedsInHand: 0, activePit: currentPit });
            messages.push(`Captured ${capturedSeeds} seeds from the opponent!`);
          }
          break; // End the sowing loop
        }

        // Condition 3: Lands in a non-empty pit (and not a store) -> Chaining
        if (currentPit !== 7 && currentPit !== 15 && this.board[currentPit] > 1) {
          // Pick up all seeds and continue
          seeds = this.board[currentPit];
          this.board[currentPit] = 0;
          states.push({ board: this.getBoard(), seedsInHand: seeds, activePit: currentPit });
          // Loop continues...
        }
      }
    }

    this.checkWinCondition();

    const finalScore = this.board[playerStoreIndex];
    const scoreGained = finalScore - initialScore;

    this.history.push({
      player: this.currentPlayer,
      pitIndex,
      scoreGained,
      captured,
      freeTurn: isFreeTurn,
      messages: [...messages]
    });

    if (!isFreeTurn && !this.isGameOver) {
      this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
    }

    // If game is over, collect remaining seeds to stores
    if (this.isGameOver) {
      this.collectRemainingSeeds();
      states.push({ board: this.getBoard(), seedsInHand: 0, activePit: null });
      messages.push("Game Over!");
    }

    return {
      nextTurn: this.currentPlayer,
      states,
      messages
    };
  }

  private checkWinCondition() {
    const player0Moves = this.getValidMoves(0);
    const player1Moves = this.getValidMoves(1);

    if (player0Moves.length === 0 || player1Moves.length === 0) {
      this.isGameOver = true;
    }
  }

  private collectRemainingSeeds() {
    // Player 0
    let p0Seeds = 0;
    for (let i = 0; i < 7; i++) {
      p0Seeds += this.board[i];
      this.board[i] = 0;
    }
    this.board[7] += p0Seeds;

    // Player 1
    let p1Seeds = 0;
    for (let i = 8; i < 15; i++) {
      p1Seeds += this.board[i];
      this.board[i] = 0;
    }
    this.board[15] += p1Seeds;

    // Determine winner
    if (this.board[7] > this.board[15]) {
      this.winner = 0;
    } else if (this.board[15] > this.board[7]) {
      this.winner = 1;
    } else {
      this.winner = 2; // Draw
    }
  }
}
