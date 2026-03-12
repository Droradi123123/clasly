import { motion } from "framer-motion";

interface PulsingGlowProps {
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function PulsingGlow({ color = "rgba(99, 102, 241, 0.4)", intensity = 'medium' }: PulsingGlowProps) {
  const sizes = {
    low: { scale: [1, 1.1, 1], blur: 40 },
    medium: { scale: [1, 1.2, 1], blur: 60 },
    high: { scale: [1, 1.3, 1], blur: 80 },
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top glow */}
      <motion.div
        animate={{ 
          scale: sizes[intensity].scale,
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
        style={{ 
          backgroundColor: color,
          filter: `blur(${sizes[intensity].blur}px)`,
        }}
      />

      {/* Bottom glow */}
      <motion.div
        animate={{ 
          scale: sizes[intensity].scale,
          opacity: [0.4, 0.2, 0.4],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full"
        style={{ 
          backgroundColor: color,
          filter: `blur(${sizes[intensity].blur}px)`,
        }}
      />

      {/* Center accent */}
      <motion.div
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{ 
          backgroundColor: color,
          filter: `blur(${sizes[intensity].blur}px)`,
        }}
      />
    </div>
  );
}
