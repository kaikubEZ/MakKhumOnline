import React from 'react';

interface PitProps {
  index: number;
  seeds: number;
  isClickable: boolean;
  onClick: (index: number) => void;
  player: number; // 0 or 1
  isActive?: boolean;
}

// Pre-defined random-ish transforms to avoid hydration errors
const SEED_TRANSFORMS = [
  { r: 45, x: 1, y: -1 }, { r: 120, x: -2, y: 1 }, { r: 300, x: 0, y: 2 },
  { r: 15, x: -1, y: -2 }, { r: 210, x: 2, y: 0 }, { r: 85, x: -1, y: 1 },
  { r: 175, x: 1, y: 2 }, { r: 330, x: -2, y: -1 }, { r: 50, x: 2, y: -2 },
  { r: 260, x: 0, y: -1 }, { r: 90, x: 1, y: 1 }, { r: 200, x: -1, y: 0 },
  { r: 315, x: -2, y: 2 }, { r: 70, x: 2, y: 1 }
];

export const Pit: React.FC<PitProps> = ({ index, seeds, isClickable, onClick, player, isActive }) => {
  const seedElements = Array.from({ length: Math.min(seeds, 14) }).map((_, i) => {
    const t = SEED_TRANSFORMS[i % SEED_TRANSFORMS.length];
    return (
      <div
        key={i}
        className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-gradient-to-b from-[#fcd34d] to-[#d4a017] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] m-0.5"
        style={{ transform: `rotate(${t.r}deg) translate(${t.x}px, ${t.y}px)` }}
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        onClick={() => isClickable && onClick(index)}
        className={`w-16 h-16 sm:w-[78px] sm:h-[78px] rounded-full flex flex-wrap justify-center items-center content-center p-2 transition-all duration-200
          bg-gradient-to-b from-[#6b3d20] to-[#3d1f0b]
          shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),inset_0_-2px_4px_rgba(139,94,60,0.15)]
          ${isClickable ? 'cursor-pointer hover:from-[#7a4a2a] hover:to-[#4a2810] ring-2 ring-[#8b5e3c]/40' : ''}
          ${isActive ? 'ring-[3px] ring-[#818cf8] shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_0_14px_rgba(129,140,248,0.5)]' : ''}
        `}
      >
        {seedElements}
        {seeds > 14 && <span className="text-amber-100 text-[10px] font-bold w-full text-center">+{seeds - 14}</span>}
      </div>
      <span className="text-[11px] sm:text-xs font-bold text-[#a0714e] tabular-nums">{seeds}</span>
    </div>
  );
};
