import { motion } from "framer-motion";
import { ThemeId, getTheme } from "@/types/themes";

interface ThemedDecorationsProps {
  themeId: ThemeId;
}

export function ThemedDecorations({ themeId }: ThemedDecorationsProps) {
  const theme = getTheme(themeId);
  const style = theme.tokens.decorativeStyle;
  const opacity = theme.tokens.decorativeOpacity;

  switch (style) {
    case 'tech-grid':
      return <TechGridDecoration opacity={opacity} />;
    case 'bubbles':
      return <BubblesDecoration opacity={opacity} />;
    case 'lines':
      return <LinesDecoration opacity={opacity} />;
    case 'geometric':
      return <GeometricDecoration opacity={opacity} />;
    case 'waves':
      return <WavesDecoration opacity={opacity} />;
    case 'aurora':
      return <AuroraDecoration opacity={opacity} />;
    default:
      return null;
  }
}

// Neon Cyber: Simple grid pattern
function TechGridDecoration({ opacity }: { opacity: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {/* Grid pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 148, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 148, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-500/30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-green-500/30" />
    </div>
  );
}

// Soft Pop: Minimal floating bubbles
function BubblesDecoration({ opacity }: { opacity: number }) {
  const bubbles = [
    { size: 100, x: 5, y: 15, color: 'from-pink-300/40 to-rose-300/40' },
    { size: 80, x: 90, y: 70, color: 'from-amber-200/40 to-orange-300/40' },
    { size: 60, x: 85, y: 10, color: 'from-violet-200/40 to-purple-300/40' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {bubbles.map((bubble, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br ${bubble.color} blur-2xl`}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            y: [0, -10, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Academic Pro: Subtle elegant lines
function LinesDecoration({ opacity }: { opacity: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {/* Top decorative bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-[2px] bg-yellow-500/30" />
      <div className="absolute top-4 right-4 w-8 h-[2px] bg-yellow-500/30" />
    </div>
  );
}

// Swiss Minimal: Bold simple geometric
function GeometricDecoration({ opacity }: { opacity: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {/* Large circle accent */}
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full border-[8px] border-red-500/50" />
      
      {/* Black square */}
      <div className="absolute top-6 left-6 w-12 h-12 bg-white/10" />
    </div>
  );
}

// Sunset Warmth: Flowing waves
function WavesDecoration({ opacity }: { opacity: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {/* Gradient wave overlay */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to top, rgba(249, 115, 22, 0.2), transparent)',
        }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-xl" />
    </div>
  );
}

// Ocean Breeze: Aurora-like effect
function AuroraDecoration({ opacity }: { opacity: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {/* Aurora gradient */}
      <motion.div
        className="absolute top-0 left-1/4 w-1/2 h-32 blur-3xl"
        style={{
          background: 'linear-gradient(90deg, rgba(34, 211, 238, 0.3), rgba(45, 212, 191, 0.3), rgba(34, 211, 238, 0.3))',
        }}
        animate={{
          x: ['-10%', '10%', '-10%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Bottom glow */}
      <div className="absolute bottom-0 left-1/3 w-1/3 h-20 bg-gradient-to-t from-cyan-500/20 to-transparent blur-2xl" />
    </div>
  );
}
