'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { Board } from '@/components/Board';
import { AICompanion } from '@/components/AICompanion';
import { SettingsModal } from '@/components/SettingsModal';

import { MoveHistory } from '@/components/MoveHistory';

export default function Home() {
  const { board, currentPlayer, isGameOver, winner, playMove, game, resetGame, lastMessages, isAnimating, seedsInHand, activePit, history } = useGame();
  
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  // Use refs to prevent multiple simultaneous AI calls
  const aiActionInProgress = useRef(false);

  useEffect(() => {
    // Load API key from local storage on mount
    const storedKey = localStorage.getItem('geminiApiKey');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  const callAI = async (action: 'move' | 'trash_talk' | 'hint') => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          boardState: board,
          currentPlayer,
          apiKeyOverride: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Unknown API Error', details: await response.text() };
        }
        console.error('API Error details:', errorData);
        throw new Error(errorData.error || 'Failed to fetch AI');
      }

      const data = await response.json();
      return data.result;
    } catch (error: any) {
      console.error("AI call failed:", error);
      return null;
    }
  };

  // Handle AI turn
  useEffect(() => {
    const handleAITurn = async () => {
      if (currentPlayer !== 1 || isGameOver || aiActionInProgress.current) return;
      
      aiActionInProgress.current = true;
      setIsAiThinking(true);
      
      // Artificial delay for better UX and rate limit prevention (2s cooldown)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiMoveStr = await callAI('move');
      setIsAiThinking(false);
      
      if (aiMoveStr) {
        const moveIndex = parseInt(aiMoveStr, 10);
        // Fallback validation just in case AI hallucinates
        const validMoves = game.getValidMoves(1);
        const finalMove = validMoves.includes(moveIndex) ? moveIndex : validMoves[0];
        
        await playMove(finalMove);
        
        // Sometimes trash talk after a move
        if (Math.random() > 0.3) {
          triggerTrashTalk();
        }
      }
      
      aiActionInProgress.current = false;
    };

    if (currentPlayer === 1 && !isGameOver && !aiActionInProgress.current) {
      handleAITurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, isGameOver, history.length]);

  // Handle Trash Talk
  const triggerTrashTalk = useCallback(async () => {
    if (isGameOver) return;
    setIsAiThinking(true);
    const msg = await callAI('trash_talk');
    if (msg) setAiMessage(msg);
    setIsAiThinking(false);
  }, [board, currentPlayer, isGameOver, apiKey]);

  // Initial Trash Talk
  useEffect(() => {
    if (board.every(val => val === 7 || val === 0) && board[7] === 0 && board[15] === 0) {
       // Game just started
       setAiMessage("Let's see what you've got, human. Prepare to lose.");
    }
  }, []);

  const handleAskHint = async () => {
    if (currentPlayer !== 0 || isGameOver || aiActionInProgress.current) return;
    
    aiActionInProgress.current = true;
    setIsAiThinking(true);
    const hint = await callAI('hint');
    if (hint) setAiMessage(`💡 Hint: ${hint}`);
    setIsAiThinking(false);
    aiActionInProgress.current = false;
  };

  const handlePitClick = async (index: number) => {
    if (currentPlayer !== 0 || isGameOver || aiActionInProgress.current || isAnimating) return;
    
    const validMoves = game.getValidMoves(0);
    if (!validMoves.includes(index)) return;

    setAiMessage(null); // Clear message when player moves
    await playMove(index);
  };

  return (
    <main className="min-h-screen bg-[#140e0c] text-[#e8dcc5] p-4 sm:p-8 font-sans relative">
      {/* Background radial gradient for spotlight effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#3a2212]/20 via-[#140e0c]/80 to-[#0a0705] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#fcd34d] via-[#d4a017] to-[#8b5e3c] drop-shadow-sm tracking-wide">
              Mak Khum
            </h1>
            <p className="text-[#a0714e] text-sm mt-2 tracking-wide uppercase font-semibold">Premium Edition</p>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-full bg-[#2a1a10] border border-[#3e2311] hover:bg-[#3b2010] hover:border-[#8b5e3c] transition-all text-[#a0714e] hover:text-[#d4a017] shadow-lg"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="mb-4 flex justify-center items-center gap-4 min-h-[40px]">
              {isGameOver ? (
                <div className="inline-block px-8 py-2.5 rounded-full bg-gradient-to-r from-[#d4a017] to-[#8b5e3c] text-[#140e0c] font-bold text-lg shadow-[0_0_20px_rgba(212,160,23,0.3)] animate-pulse border border-[#fcd34d]">
                  Game Over! {winner === 0 ? 'You Win! 🎉' : winner === 1 ? 'AI Wins! 🤖' : 'It\'s a Draw! 🤝'}
                </div>
              ) : (
                 <div className={`inline-block px-8 py-2.5 rounded-full font-bold text-sm tracking-widest uppercase shadow-lg transition-colors border
                   ${currentPlayer === 0 
                     ? 'bg-gradient-to-r from-[#6b3d20] to-[#3d1f0b] text-[#fcd34d] border-[#8b5e3c]' 
                     : 'bg-gradient-to-r from-[#2a1a10] to-[#1a0f08] text-[#e7a1a1] border-[#5a2c2c]'
                   }`}>
                   {currentPlayer === 0 ? 'Your Turn' : "AI's Turn"}
                 </div>
              )}
              
              {/* Seeds In Hand Indicator */}
              {seedsInHand !== undefined && seedsInHand > 0 && !isGameOver && (
                <div className={`font-bold px-5 py-2.5 rounded-full shadow-lg border flex items-center gap-2 transition-colors duration-300 text-sm tracking-wide
                  ${currentPlayer === 0 
                    ? 'bg-[#3d1f0b] text-[#fcd34d] border-[#8b5e3c]' 
                    : 'bg-[#1a0f08] text-[#e7a1a1] border-[#5a2c2c]'
                  }
                `}>
                  <span className="text-xl drop-shadow-md">✋</span> 
                  <span>{seedsInHand} in hand</span>
                </div>
              )}
            </div>

            {lastMessages.length > 0 && !isGameOver && (
              <div className="text-center mb-4 min-h-[24px]">
                <p className="text-amber-400 font-medium animate-fade-in-up">
                  {lastMessages[lastMessages.length - 1]}
                </p>
              </div>
            )}

            <Board 
              board={board} 
              currentPlayer={currentPlayer} 
              onPitClick={handlePitClick} 
              validMoves={game.getValidMoves(0)}
              activePit={activePit}
              seedsInHand={seedsInHand}
            />

            {isGameOver && (
              <div className="mt-12 text-center">
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-gradient-to-r from-[#d4a017] to-[#8b5e3c] text-[#140e0c] hover:from-[#fcd34d] hover:to-[#a0714e] font-bold rounded-xl shadow-lg transition-all hover:scale-105 border border-[#fcd34d]"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-[500px]">
            <div className="flex-1">
              <MoveHistory history={history} />
            </div>
            <div className="shrink-0">
              <AICompanion 
                message={aiMessage} 
                isThinking={isAiThinking} 
                onAskHint={handleAskHint} 
                canAskHint={currentPlayer === 0 && !isGameOver} 
              />
            </div>
          </div>
        </div>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={handleSaveApiKey} 
        />
        
      </div>
    </main>
  );
}
