import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const SEGMENT_COLORS = [
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#06b6d4",
];

type Props = {
  names: string[];
  onSpinComplete: (winner: string) => void;
};

/**
 * Full-screen wheel of fortune: suspenseful spin, then calls onSpinComplete with the chosen name.
 */
export function RaffleWheelOverlay({ names, onSpinComplete }: Props) {
  const n = names.length;
  const [winnerIndex] = useState(() => Math.floor(Math.random() * Math.max(1, n)));
  const segmentDeg = 360 / n;
  const spinRounds = 6;

  const targetRotation = useMemo(() => {
    const centerDeg = winnerIndex * segmentDeg + segmentDeg / 2;
    return 360 * spinRounds + (360 - centerDeg);
  }, [winnerIndex, segmentDeg]);

  const gradient = useMemo(() => {
    const stops = names.map((_, i) => {
      const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      const a = i * segmentDeg;
      const b = (i + 1) * segmentDeg;
      return `${c} ${a}deg ${b}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [names, segmentDeg]);

  const poolPreview = useMemo(() => {
    const joined = names.join(" · ");
    return joined.length > 120 ? `${joined.slice(0, 117)}…` : joined;
  }, [names]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md px-4 pointer-events-auto">
      <p className="text-amber-200 text-sm font-semibold uppercase tracking-[0.2em] mb-3 animate-pulse">
        Wheel of fortune
      </p>
      <div className="relative w-[min(88vw,440px)] aspect-square max-h-[min(65vh,440px)]">
        <div
          className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1 drop-shadow-lg"
          aria-hidden
        >
          <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[26px] border-l-transparent border-r-transparent border-t-amber-400" />
        </div>
        <motion.div
          className="absolute inset-[8%] rounded-full shadow-2xl border-4 border-white/25 ring-2 ring-amber-400/30"
          style={{
            background: gradient,
            transformOrigin: "50% 50%",
          }}
          initial={{ rotate: 0 }}
          animate={{ rotate: targetRotation }}
          transition={{
            duration: 5.2,
            ease: [0.12, 0.72, 0.12, 1],
          }}
          onAnimationComplete={() => onSpinComplete(names[winnerIndex]!)}
        />
        <div className="absolute left-1/2 top-1/2 z-10 h-[20%] w-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 border-4 border-amber-400/40 shadow-inner flex items-center justify-center">
          <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest">Spin</span>
        </div>
      </div>
      <p className="mt-5 text-primary-foreground/85 text-xs sm:text-sm max-w-lg text-center leading-relaxed px-2">
        <span className="font-semibold text-amber-100/95">{n}</span> in the draw
      </p>
      <p
        className="mt-1 text-primary-foreground/55 text-[11px] sm:text-xs max-w-xl text-center line-clamp-3"
        title={names.join(", ")}
      >
        {poolPreview}
      </p>
    </div>
  );
}
