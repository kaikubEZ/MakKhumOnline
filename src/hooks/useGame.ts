import { useState, useCallback } from 'react';
import { MakKhumGame } from '@/lib/game/MakKhumGame';
import { GameState, MoveHistoryEntry } from '@/lib/game/types';

export function useGame() {
  const [game, setGame] = useState(() => new MakKhumGame());
  const [board, setBoard] = useState<GameState>(game.getBoard());
  const [currentPlayer, setCurrentPlayer] = useState<number>(game.getCurrentPlayer());
  const [isGameOver, setIsGameOver] = useState<boolean>(game.getIsGameOver());
  const [winner, setWinner] = useState<number | null>(game.getWinner());
  const [lastMessages, setLastMessages] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [seedsInHand, setSeedsInHand] = useState<number>(0);
  const [activePit, setActivePit] = useState<number | null>(null);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  
  const playMove = useCallback(async (pitIndex: number) => {
    if (isAnimating) return false;
    
    try {
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
  }, [game, isAnimating]);

  const resetGame = useCallback(() => {
    const newGame = new MakKhumGame();
    setGame(newGame);
    setBoard(newGame.getBoard());
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
