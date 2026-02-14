import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { ThemeId, getTheme } from "@/types/themes";

interface OptionButtonProps {
  option: string;
  index: number;
  isSelected?: boolean;
  isCorrect?: boolean;
  showResult?: boolean;
  onClick?: () => void;
  onEdit?: (value: string) => void;
  editable?: boolean;
  variant?: 'quiz' | 'poll';
  totalOptions?: number;
  themeId?: ThemeId;
}

// Letter labels for options
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function OptionButton({
  option,
  index,
  isSelected = false,
  isCorrect = false,
  showResult = false,
  onClick,
  onEdit,
  editable = false,
  variant = 'quiz',
  totalOptions = 4,
  themeId = 'neon-cyber',
}: OptionButtonProps) {
  const theme = getTheme(themeId);
  const colorClass = theme.optionColors[index % theme.optionColors.length];
  const label = OPTION_LABELS[index];

  // Get border radius based on theme button style
  const getBorderRadius = () => {
    switch (theme.tokens.buttonStyle) {
      case 'pill': return 'rounded-full';
      case 'rounded': return 'rounded-2xl';
      case 'square': return 'rounded-xl';
      case 'sharp': return 'rounded-none';
      default: return 'rounded-2xl';
    }
  };

  // Get animation config based on theme
  const getAnimationConfig = () => {
    switch (theme.tokens.animationStyle) {
      case 'bouncy':
        return { type: 'spring' as const, stiffness: 300, damping: 12 };
      case 'snappy':
        return { type: 'spring' as const, stiffness: 500, damping: 30 };
      case 'smooth':
        return { type: 'tween' as const, duration: 0.3, ease: 'easeOut' as const };
      default:
        return { type: 'spring' as const, stiffness: 300, damping: 20 };
    }
  };

  // Get shadow based on theme
  const getShadowStyle = () => {
    switch (theme.tokens.shadowStyle) {
      case 'glow':
        return { boxShadow: `0 10px 40px -10px hsl(${theme.tokens.accent} / 0.4)` };
      case 'soft':
        return { boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)' };
      case 'hard':
        return { boxShadow: '6px 6px 0 rgba(0,0,0,0.9)' };
      default:
        return {};
    }
  };

  // Get label badge style based on theme
  const getLabelBadgeStyle = () => {
    switch (themeId) {
      case 'swiss-minimal':
        return 'bg-black text-white border-0 rounded-none';
      case 'soft-pop':
        return 'bg-white/90 text-gray-800 border-0 rounded-full shadow-lg';
      case 'academic-pro':
        return 'bg-yellow-500/90 text-gray-900 border-0 rounded-lg';
      default:
        return 'bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl';
    }
  };

  // Determine visual state
  const getStateClasses = () => {
    if (showResult && isCorrect) {
      return 'ring-4 ring-green-400 !bg-gradient-to-r from-green-500 to-emerald-500';
    }
    if (showResult && isSelected && !isCorrect) {
      return 'ring-4 ring-red-400 !bg-gradient-to-r from-red-500 to-rose-500 opacity-75';
    }
    if (isSelected) {
      return 'ring-4 ring-white/50 scale-[1.02]';
    }
    return '';
  };

  // Swiss minimal has special styling
  const isSwiss = themeId === 'swiss-minimal';
  const isSoftPop = themeId === 'soft-pop';

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        ...getAnimationConfig(),
        delay: index * 0.08,
      }}
      whileHover={editable ? {} : { 
        scale: isSwiss ? 1.02 : 1.05,
        ...getShadowStyle(),
      }}
      whileTap={editable ? {} : { scale: 0.98 }}
      className={`
        relative w-full p-4 md:p-5
        ${getBorderRadius()}
        transition-all duration-200 ease-out
        ${colorClass}
        ${getStateClasses()}
        ${editable ? 'cursor-text' : 'cursor-pointer'}
        ${isSwiss ? 'border-3 border-black' : ''}
        group overflow-hidden
      `}
      style={getShadowStyle()}
    >
      {/* Animated background shimmer - only for non-swiss themes */}
      {!isSwiss && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 3,
            delay: index * 0.5,
            ease: "linear",
          }}
        />
      )}

      {/* Option Label Badge */}
      <motion.div 
        className={`absolute -top-2 -left-2 w-10 h-10 flex items-center justify-center font-bold text-lg ${getLabelBadgeStyle()}`}
        animate={isSoftPop ? { 
          rotate: [0, 5, 0, -5, 0],
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          delay: index * 0.3,
        }}
      >
        {label}
      </motion.div>

      {/* Result indicator */}
      {showResult && (isCorrect || (isSelected && !isCorrect)) && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`absolute -top-2 -right-2 w-10 h-10 flex items-center justify-center shadow-lg ${isSwiss ? 'rounded-none' : 'rounded-full'}`}
          style={{
            backgroundColor: isCorrect ? '#22c55e' : '#ef4444',
          }}
        >
          {isCorrect ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: 3, duration: 0.3 }}
            >
              <Check className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <X className="w-6 h-6 text-white" />
          )}
        </motion.div>
      )}

      {/* Content */}
      <div className="flex items-center justify-center min-h-[3rem] relative z-10">
        {editable ? (
          <input
            type="text"
            value={option}
            onChange={(e) => onEdit?.(e.target.value)}
            className="w-full text-center text-lg md:text-xl font-semibold bg-transparent border-0 outline-none placeholder:text-white/50"
            placeholder={`Option ${label}`}
            style={{ fontFamily: theme.tokens.fontFamily }}
          />
        ) : (
          <motion.span 
            className={`text-lg md:text-xl drop-shadow-md ${isSwiss ? 'font-bold uppercase tracking-wide' : 'font-semibold'}`}
            style={{ 
              fontFamily: theme.tokens.fontFamily,
              fontWeight: theme.tokens.fontWeight,
              letterSpacing: theme.tokens.letterSpacing,
            }}
            animate={isSelected ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {option}
          </motion.span>
        )}
      </div>

      {/* Shine effect - not for swiss */}
      {!isSwiss && (
        <div className={`absolute inset-0 ${getBorderRadius()} overflow-hidden pointer-events-none`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        </div>
      )}

      {/* Hover particles - only for neon and soft-pop */}
      {!editable && (themeId === 'neon-cyber' || themeId === 'soft-pop') && (
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none overflow-hidden ${getBorderRadius()}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-2 h-2 ${themeId === 'soft-pop' ? 'rounded-full bg-white/60' : 'rounded-full bg-white/40'}`}
              style={{
                left: `${20 + i * 12}%`,
                bottom: 0,
              }}
              animate={{
                y: [-10, -40],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}
