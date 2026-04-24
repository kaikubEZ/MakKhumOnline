import { useState, useCallback, useEffect, useRef } from 'react';
import { MakKhumGame } from '@/lib/game/MakKhumGame';
import { GameState, MoveHistoryEntry, GamePhase, PlayerHand } from '@/lib/game/types';

export function useGame() {
  const [game, setGame] = useState(() => new MakKhumGame());
  const [board, setBoard] = useState<GameState>(game.getBoard());
  const [phase, setPhase] = useState<GamePhase>(game.getPhase());
  const [hands, setHands] = useState<PlayerHand[]>(game.getHands());
  const [currentPlayer, setCurrentPlayer] = useState<number>(game.getCurrentPlayer());
  const [isGameOver, setIsGameOver] = useState<boolean>(game.getIsGameOver());
  const [winner, setWinner] = useState<number | null>(game.getWinner());
  const [lastMessages, setLastMessages] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [seedsInHand, setSeedsInHand] = useState<number>(0);
  const [activePit, setActivePit] = useState<number | null>(null);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);

  const syncState = useCallback(() => {
    setBoard(game.getBoard());
    setHands(game.getHands());
    setPhase(game.getPhase());
    setCurrentPlayer(game.getCurrentPlayer());
    setIsGameOver(game.getIsGameOver());
    setWinner(game.getWinner());
    setHistory(game.getHistory());
  }, [game]);

  useEffect(() => {
    if (phase !== GamePhase.RACING || isGameOver) return;
    
    // Check if we can tick: no pending decisions AND someone is active
    const canTick = (!hands[0].needsDecision && !hands[1].needsDecision) && (hands[0].isActive || hands[1].isActive);
    if (!canTick) return;

    const intervalId = setInterval(() => {
      const messages = game.tick();
      syncState();
      if (messages.length > 0) {
        setLastMessages(prev => [...prev, ...messages].slice(-3));
      }
    }, 400);

    return () => clearInterval(intervalId);
  }, [game, phase, isGameOver, hands, syncState]);

  const playMove = useCallback(async (pitIndex: number, playerIndex: number = 0) => {
    if (isAnimating) return false;
    
    try {
      if (game.getPhase() === GamePhase.RACING) {
        game.selectPit(playerIndex, pitIndex);
        syncState();
        return true;
      }

      // TURN_BASED execution
      const result = game.play(pitIndex);
      setIsAnimating(true);
      
      // Animate through intermediate states
      for (const state of result.states) {
        setBoard(state.board);
        setSeedsInHand(state.seedsInHand);
        setActivePit(state.activePit);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      setCurrentPlayer(result.nextTurn);
      setIsGameOver(game.getIsGameOver());
      setWinner(game.getWinner());
      setLastMessages(result.messages);
      setHistory(game.getHistory());
      setIsAnimating(false);
      setSeedsInHand(0);
      setActivePit(null);
      
      return true;
    } catch (e) {
      console.error(e);
      setIsAnimating(false);
      setSeedsInHand(0);
      setActivePit(null);
      return false;
    }
  }, [game, isAnimating, syncState]);

  const resetGame = useCallback(() => {
    const newGame = new MakKhumGame();
    setGame(newGame);
    setBoard(newGame.getBoard());
    setPhase(newGame.getPhase());
    setHands(newGame.getHands());
    setCurrentPlayer(newGame.getCurrentPlayer());
    setIsGameOver(newGame.getIsGameOver());
    setWinner(newGame.getWinner());
    setLastMessages([]);
    setHistory([]);
    setIsAnimating(false);
    setSeedsInHand(0);
    setActivePit(null);
  }, []);

  return {
    board,
    phase,
    hands,
    currentPlayer,
    isGameOver,
    winner,
    lastMessages,
    playMove,
    resetGame,
    game,
    isAnimating,
    seedsInHand,
    activePit,
    history
  };
}
