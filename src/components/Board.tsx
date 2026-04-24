import React from 'react';
import { Pit } from './Pit';
import { Store } from './Store';
import { GameState } from '@/lib/game/types';

interface BoardProps {
  board: GameState;
  currentPlayer: number;
  onPitClick: (index: number) => void;
  validMoves: number[];
  activePit?: number | null;
  seedsInHand?: number;
}

export const Board: React.FC<BoardProps> = ({ board, currentPlayer, onPitClick, validMoves, activePit, seedsInHand }) => {
  // Player 0 (Human) pits: 0-6 (bottom row)
  // Player 1 (AI) pits: 8-14 (top row, rendered in reverse order 14 to 8)

  const p0Pits = [];
  for (let i = 0; i < 7; i++) {
    p0Pits.push(
      <Pit
        key={i}
        index={i}
        seeds={board[i]}
        player={0}
        isClickable={currentPlayer === 0 && validMoves.includes(i)}
        onClick={onPitClick}
        isActive={activePit === i}
      />
    );
  }

  const p1Pits = [];
  for (let i = 14; i >= 8; i--) {
    p1Pits.push(
      <Pit
        key={i}
        index={i}
        seeds={board[i]}
        player={1}
        isClickable={false} // Human cannot click AI's pits
        onClick={onPitClick}
        isActive={activePit === i}
      />
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-8 rounded-[50px] p-5 sm:p-8 overflow-x-auto
      bg-gradient-to-br from-[#5c3a1e] via-[#4a2c14] to-[#3b2010]
      shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_2px_1px_rgba(255,255,255,0.08)]
      border border-[#2a1508]/80
    ">
      {/* Wood grain texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 rounded-[50px] pointer-events-none"></div>
      {/* Inner highlight rim */}
      <div className="absolute inset-[3px] rounded-[48px] pointer-events-none border border-[#8b5e3c]/20"></div>

      <div className="flex justify-between items-center relative z-10 gap-3 sm:gap-6 min-w-[800px]">

        {/* Player 1 (AI) Store */}
        <Store index={15} seeds={board[15]} player={1} isActive={activePit === 15} />

        {/* Pits Area */}
        <div className="flex flex-col gap-3 flex-grow px-2 sm:px-4">
          {/* Top Row (Player 1 / AI) */}
          <div className="flex justify-between gap-2">
            {p1Pits}
          </div>

          {/* Middle divider — carved groove effect */}
          <div className="relative h-[3px] w-full my-3 rounded-full bg-[#1e0f06] shadow-[0_1px_0_rgba(139,94,60,0.15)]"></div>

          {/* Bottom Row (Player 0 / Human) */}
          <div className="flex justify-between gap-2">
            {p0Pits}
          </div>
        </div>

        {/* Player 0 (Human) Store */}
        <Store index={7} seeds={board[7]} player={0} isActive={activePit === 7} />

      </div>
    </div>
  );
};
