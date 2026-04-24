import React from 'react';

interface AICompanionProps {
  message: string | null;
  isThinking: boolean;
  onAskHint: () => void;
  canAskHint: boolean;
}

export const AICompanion: React.FC<AICompanionProps> = ({ message, isThinking, onAskHint, canAskHint }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 bg-[#1a0f08]/90 rounded-[24px] shadow-2xl border border-[#3e2311] max-w-2xl mx-auto backdrop-blur-sm">
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-[#2a1a10] to-[#140a05] rounded-full flex items-center justify-center text-3xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] border-2 border-[#5a2c2c] drop-shadow-lg">
          🤖
        </div>
        {isThinking && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#fcd34d] rounded-full animate-ping shadow-[0_0_10px_#fcd34d]"></div>
        )}
      </div>
      
      <div className="flex-1 w-full">
        <div className="bg-[#20100a] text-[#e8dcc5] p-4 sm:p-5 rounded-2xl rounded-tl-none relative min-h-[60px] flex items-center border border-[#3e2311] shadow-inner">
          {isThinking ? (
            <div className="flex gap-2 items-center h-6">
              <div className="w-2.5 h-2.5 bg-[#8b5e3c] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-[#8b5e3c] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-[#8b5e3c] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <p className="text-sm sm:text-base font-medium italic tracking-wide leading-relaxed text-[#f8ead0]">{message || "I'm ready when you are. Your move, human."}</p>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onAskHint}
            disabled={!canAskHint || isThinking}
            className={`text-xs sm:text-sm px-5 py-2.5 rounded-xl font-bold transition-all uppercase tracking-wider border ${
              !canAskHint || isThinking 
                ? 'bg-[#1a0f08] text-[#5a2c2c] border-[#3e2311] cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#d4a017] to-[#8b5e3c] hover:from-[#fcd34d] hover:to-[#a0714e] text-[#140e0c] border-[#fcd34d] shadow-[0_0_15px_rgba(212,160,23,0.2)] hover:scale-105'
            }`}
          >
            💡 Ask for a Hint
          </button>
        </div>
      </div>
    </div>
  );
};
