import React from 'react';

interface StoreProps {
  index: number;
  seeds: number;
  player: number; // 0 or 1
  isActive?: boolean;
}

// Pre-defined random-ish transforms to avoid hydration errors
const STORE_SEED_TRANSFORMS = [
  { r: 12, x: 2, y: -3 }, { r: 145, x: -1, y: 4 }, { r: 270, x: 3, y: 1 },
  { r: 55, x: -4, y: -2 }, { r: 190, x: 1, y: -1 }, { r: 310, x: -2, y: 3 },
  { r: 80, x: 4, y: -4 }, { r: 215, x: -3, y: 2 }, { r: 340, x: 2, y: 1 },
  { r: 30, x: -1, y: -3 }, { r: 165, x: 3, y: 4 }, { r: 290, x: -2, y: -1 },
  { r: 105, x: 1, y: 2 }, { r: 240, x: -4, y: -2 }, { r: 355, x: 2, y: 3 },
  { r: 40, x: -3, y: 1 }, { r: 175, x: 4, y: -1 }, { r: 250, x: -1, y: -4 },
  { r: 95, x: 3, y: 2 }, { r: 320, x: -2, y: -2 }
];

export const Store: React.FC<StoreProps> = ({ index, seeds, player, isActive }) => {
  const seedElements = Array.from({ length: Math.min(seeds, 20) }).map((_, i) => {
    const t = STORE_SEED_TRANSFORMS[i % STORE_SEED_TRANSFORMS.length];
    return (
      <div
        key={i}
        className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-gradient-to-b from-[#fcd34d] to-[#d4a017] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] m-0.5"
        style={{ transform: `rotate(${t.r}deg) translate(${t.x}px, ${t.y}px)` }}
      />
    );
  });

  return (
    <div className="flex flex-col items-center justify-center h-full px-1">
      <span className="text-[11px] sm:text-xs font-bold text-[#a0714e] mb-2 uppercase tracking-widest">{player === 0 ? 'You' : 'AI'}</span>
      <div className={`w-[72px] h-44 sm:w-[84px] sm:h-56 rounded-[36px] p-3 flex flex-wrap justify-center items-center content-center transition-all duration-200
        bg-gradient-to-b from-[#6b3d20] to-[#3d1f0b]
        shadow-[inset_0_6px_12px_rgba(0,0,0,0.5),inset_0_-3px_6px_rgba(139,94,60,0.12)]
        ${isActive ? 'ring-[3px] ring-[#818cf8] shadow-[inset_0_6px_12px_rgba(0,0,0,0.5),0_0_14px_rgba(129,140,248,0.5)]' : ''}
      `}>
        {seedElements}
        {seeds > 20 && <span className="text-amber-100 text-[10px] font-bold w-full text-center mt-1">+{seeds - 20}</span>}
      </div>
      <span className="text-sm sm:text-base font-bold mt-2 text-[#a0714e] tabular-nums">{seeds}</span>
    </div>
  );
};
