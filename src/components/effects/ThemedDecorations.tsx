import { motion } from "framer-motion";
import { ThemeId, getTheme, Theme } from "@/types/themes";

interface ThemedDecorationsProps {
  themeId: ThemeId;
}

export function ThemedDecorations({ themeId }: ThemedDecorationsProps) {
  const theme = getTheme(themeId);
  const style = theme.tokens.decorativeStyle;
  const opacity = theme.tokens.decorativeOpacity;

  switch (style) {
    case 'tech-grid':
      return <TechGridDecoration theme={theme} opacity={opacity} />;
    case 'bubbles':
      return <BubblesDecoration theme={theme} opacity={opacity} />;
    case 'lines':
      return <LinesDecoration theme={theme} opacity={opacity} />;
    case 'geometric':
      return <GeometricDecoration theme={theme} opacity={opacity} />;
    case 'waves':
      return <WavesDecoration theme={theme} opacity={opacity} />;
    case 'aurora':
      return <AuroraDecoration theme={theme} opacity={opacity} />;
    default:
      return null;
  }
}

function accentHsl(theme: Theme, alpha = 1): string {
  return `hsl(${theme.tokens.accent} / ${alpha})`;
}
function accentSecondaryHsl(theme: Theme, alpha = 1): string {
  return `hsl(${theme.tokens.accentSecondary} / ${alpha})`;
}

// Modern: grid pattern in theme accent
function TechGridDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const color = accentHsl(theme, 0.2);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${color} 1px, transparent 1px),
            linear-gradient(90deg, ${color} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      <div className="absolute top-4 left-4 w-10 h-10 border-l-2 border-t-2" style={{ borderColor: accentHsl(theme, 0.4) }} />
      <div className="absolute bottom-4 right-4 w-10 h-10 border-r-2 border-b-2" style={{ borderColor: accentSecondaryHsl(theme, 0.4) }} />
    </div>
  );
}

// Energy: floating bubbles in theme colors
function BubblesDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const bubbles = [
    { size: 120, x: 8, y: 12 },
    { size: 90, x: 88, y: 75 },
    { size: 70, x: 82, y: 8 },
    { size: 50, x: 15, y: 80 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      {bubbles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            width: bubbles[i].size,
            height: bubbles[i].size,
            left: `${bubbles[i].x}%`,
            top: `${bubbles[i].y}%`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${accentHsl(theme, 0.35)} 0%, ${accentSecondaryHsl(theme, 0.2)} 100%)`,
          }}
          animate={{ y: [0, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// Academic: elegant lines in gold/accent
function LinesDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const color = accentHsl(theme, 0.5);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="absolute top-6 left-6 w-12 h-[1px]" style={{ backgroundColor: color }} />
      <div className="absolute top-6 right-6 w-12 h-[1px]" style={{ backgroundColor: color }} />
      <div className="absolute bottom-6 left-6 w-8 h-[1px]" style={{ backgroundColor: color }} />
      <div className="absolute bottom-6 right-6 w-8 h-[1px]" style={{ backgroundColor: color }} />
    </div>
  );
}

// Professional: bold geometric in accent
function GeometricDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const color = accentHsl(theme, 0.5);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full border-[6px]" style={{ borderColor: color }} />
      <div className="absolute top-8 left-8 w-14 h-14 bg-white/10" />
      <div className="absolute top-24 left-12 w-2 h-24" style={{ backgroundColor: color }} />
      <div className="absolute bottom-12 right-32 w-16 h-2" style={{ backgroundColor: color }} />
    </div>
  );
}

// Warm: flowing waves in warm accent
function WavesDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const color = accentHsl(theme, 0.25);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: `linear-gradient(to top, ${color}, transparent)`,
        }}
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-1/4 left-0 w-24 h-24 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${accentSecondaryHsl(theme, 0.2)} 0%, transparent 70%)` }}
      />
    </div>
  );
}

// Calm: aurora in teal/cyan
function AuroraDecoration({ theme, opacity }: { theme: Theme; opacity: number }) {
  const accent = accentHsl(theme, 0.35);
  const secondary = accentSecondaryHsl(theme, 0.3);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <motion.div
        className="absolute top-0 left-1/4 w-1/2 h-36 blur-3xl"
        style={{
          background: `linear-gradient(90deg, ${accent}, ${secondary}, ${accent})`,
        }}
        animate={{ x: ['-15%', '15%', '-15%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-1/3 h-24 blur-2xl"
        style={{ background: `linear-gradient(to top, ${accent}, transparent)` }}
      />
    </div>
  );
}
