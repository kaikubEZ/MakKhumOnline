import React, { useRef, useEffect } from 'react';
import { MoveHistoryEntry } from '@/lib/game/types';

interface MoveHistoryProps {
  history: MoveHistoryEntry[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new move is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="bg-[#1a0f08]/90 border border-[#3e2311] rounded-[24px] shadow-2xl p-5 flex flex-col h-full max-h-[500px] lg:max-h-full backdrop-blur-sm">
      <h3 className="text-xl font-extrabold text-[#d4a017] mb-4 tracking-wider uppercase border-b border-[#3e2311] pb-3 flex items-center gap-2">
        <span>📜</span> Match Log
      </h3>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#3e2311] scrollbar-track-transparent"
      >
        {history.length === 0 ? (
          <p className="text-[#a0714e] text-center text-sm italic mt-8 font-medium">The board is set. Make your move.</p>
        ) : (
          history.map((entry, i) => {
            const isHuman = entry.player === 0;
            return (
              <div 
                key={i} 
                className={`p-3.5 rounded-xl border transition-all animate-fade-in-up shadow-sm
                  ${isHuman 
                    ? 'bg-gradient-to-r from-[#2a1a10] to-[#1e1008] border-[#8b5e3c]/50 text-[#e8dcc5]' 
                    : 'bg-gradient-to-r from-[#20100a] to-[#140a05] border-[#5a2c2c]/50 text-[#e7a1a1]'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold tracking-wide">
                    {isHuman ? '👤 You' : '🤖 AI'} 
                    <span className="font-normal opacity-80 text-sm ml-1">played Pit {entry.pitIndex}</span>
                  </span>
                  
                  {entry.scoreGained > 0 && (
                    <span className="font-extrabold text-[#fcd34d] bg-[#d4a017]/20 px-2 py-0.5 rounded text-xs shadow-sm">
                      +{entry.scoreGained} pts
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.captured && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                      Capture!
                    </span>
                  )}
                  {entry.freeTurn && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      Free Turn!
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
