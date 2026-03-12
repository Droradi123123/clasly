import { motion } from "framer-motion";

interface BouncingDotsProps {
  count?: number;
  color?: string;
  size?: number;
}

export function BouncingDots({ count = 5, color = "#ffffff", size = 12 }: BouncingDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

interface WaveDotsProps {
  count?: number;
  values: number[];
  maxValue: number;
  colors?: string[];
}

export function WaveDots({ count = 4, values, maxValue, colors }: WaveDotsProps) {
  const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const dotColors = colors || defaultColors;

  return (
    <div className="flex items-end justify-center gap-3 h-32">
      {values.slice(0, count).map((value, i) => {
        const height = (value / maxValue) * 100;
        return (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ 
              height: `${height}%`,
              y: [0, -5, 0],
            }}
            transition={{
              height: { duration: 0.8, delay: i * 0.1 },
              y: { duration: 1.5, repeat: Infinity, delay: i * 0.2 },
            }}
            className="w-8 rounded-full"
            style={{ backgroundColor: dotColors[i % dotColors.length] }}
          />
        );
      })}
    </div>
  );
}
