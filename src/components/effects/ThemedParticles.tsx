import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ThemeId } from "@/types/themes";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rotation: number;
}

interface ThemedParticlesProps {
  themeId: ThemeId;
  count?: number;
}

// Theme-specific particle configurations
const PARTICLE_CONFIGS: Record<ThemeId, {
  shape: 'circle' | 'square' | 'diamond' | 'bubble';
  colors: string[];
  sizeRange: [number, number];
  blur: boolean;
  glow: boolean;
}> = {
  'neon-cyber': {
    shape: 'square',
    colors: ['#00FF94', '#00D4FF', '#FF00EA', '#FFE500'],
    sizeRange: [4, 12],
    blur: false,
    glow: true,
  },
  'soft-pop': {
    shape: 'bubble',
    colors: ['#F97316', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'],
    sizeRange: [8, 24],
    blur: true,
    glow: false,
  },
  'academic-pro': {
    shape: 'circle',
    colors: ['#EAB308', '#FACC15', '#1e3a5f', '#3b82f6'],
    sizeRange: [3, 8],
    blur: false,
    glow: false,
  },
  'swiss-minimal': {
    shape: 'square',
    colors: ['#000000', '#FF0000', '#0000FF'],
    sizeRange: [6, 16],
    blur: false,
    glow: false,
  },
  'sunset-warmth': {
    shape: 'circle',
    colors: ['#F97316', '#FB923C', '#FBBF24', '#F59E0B'],
    sizeRange: [4, 14],
    blur: true,
    glow: true,
  },
  'ocean-breeze': {
    shape: 'bubble',
    colors: ['#22D3EE', '#14B8A6', '#0EA5E9', '#06B6D4'],
    sizeRange: [6, 18],
    blur: true,
    glow: true,
  },
};

export function ThemedParticles({
  themeId,
  count = 25,
}: ThemedParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const config = PARTICLE_CONFIGS[themeId] || PARTICLE_CONFIGS['academic-pro'];

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.3,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);
  }, [themeId, count, config.sizeRange]);

  const getShapeStyles = (particle: Particle): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: particle.size,
      height: particle.size,
      backgroundColor: config.colors[particle.id % config.colors.length],
      opacity: particle.opacity,
    };

    switch (config.shape) {
      case 'square':
        return {
          ...baseStyles,
          borderRadius: '2px',
          transform: `rotate(${particle.rotation}deg)`,
        };
      case 'diamond':
        return {
          ...baseStyles,
          borderRadius: '2px',
          transform: `rotate(45deg)`,
        };
      case 'bubble':
        return {
          ...baseStyles,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${config.colors[particle.id % config.colors.length]}66, ${config.colors[particle.id % config.colors.length]}22)`,
        };
      default:
        return {
          ...baseStyles,
          borderRadius: '50%',
        };
    }
  };

  const getBlurClass = () => config.blur ? 'blur-[1px]' : '';
  
  const getGlowStyle = (particle: Particle): React.CSSProperties => {
    if (!config.glow) return {};
    const color = config.colors[particle.id % config.colors.length];
    return {
      boxShadow: `0 0 ${particle.size}px ${color}66, 0 0 ${particle.size * 2}px ${color}33`,
    };
  };

  // Animation variants based on theme
  const getAnimationVariants = (particle: Particle) => {
    switch (themeId) {
      case 'neon-cyber':
        return {
          y: [0, -40, 0, 40, 0],
          x: [0, 20, 0, -20, 0],
          opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity, particle.opacity * 0.5, particle.opacity],
          rotate: [particle.rotation, particle.rotation + 180, particle.rotation + 360],
        };
      case 'soft-pop':
        return {
          y: [0, -20, 0, -10, 0],
          x: [0, 10, 0, -10, 0],
          scale: [1, 1.3, 1, 0.9, 1],
          opacity: [particle.opacity, particle.opacity * 1.2, particle.opacity, particle.opacity * 0.8, particle.opacity],
        };
      case 'academic-pro':
        return {
          y: [0, -15, 0],
          opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
        };
      case 'swiss-minimal':
        return {
          y: [0, -50, 0],
          x: [0, 0, 0],
          rotate: [0, 90, 180, 270, 360],
        };
      case 'sunset-warmth':
        return {
          y: [0, -25, 0, 25, 0],
          x: [0, 15, 0, -15, 0],
          opacity: [particle.opacity, particle.opacity * 1.3, particle.opacity],
        };
      case 'ocean-breeze':
        return {
          y: [0, -30, 0],
          x: [0, 20, 0, -20, 0],
          scale: [1, 1.1, 1],
          opacity: [particle.opacity, particle.opacity * 1.2, particle.opacity],
        };
      default:
        return {
          y: [0, -30, 0, 30, 0],
          x: [0, 20, 0, -20, 0],
        };
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute ${getBlurClass()}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            ...getShapeStyles(particle),
            ...getGlowStyle(particle),
          }}
          animate={getAnimationVariants(particle)}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}