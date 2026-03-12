import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface DemoConfettiProps {
  isActive: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#FF9FF3",
  "#54A0FF",
  "#5F27CD",
  "#00D2D3",
  "#FF9F43",
];

export function DemoConfetti({ isActive, containerRef }: DemoConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.3 + Math.random() * 0.4,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-2xl">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                left: `${piece.x}%`,
                top: -10,
                rotate: 0,
                scale: piece.scale,
              }}
              animate={{
                top: "110%",
                rotate: piece.rotation + 720,
                left: `${piece.x + (Math.random() - 0.5) * 20}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute"
              style={{
                width: 6 + Math.random() * 6,
                height: 6 + Math.random() * 6,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
