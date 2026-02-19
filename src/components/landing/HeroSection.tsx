import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import HowItWorks from "@/components/landing/HowItWorks";

interface HeroSectionProps {
  onGenerate: (prompt: string) => void;
  onSeeExample: () => void;
}

// Confetti Particle Component
function ConfettiParticle({ x, delay, color }: { x: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ 
        y: [0, -80, -40], 
        opacity: [1, 1, 0], 
        scale: [1, 1.2, 0.5],
        rotate: [0, 180, 360],
        x: [0, (Math.random() - 0.5) * 60]
      }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
    />
  );
}

// Flying Emoji Component - Flies from phone to desktop screen
function FlyingEmoji({ 
  emoji, 
  id, 
  onComplete,
  phoneRef,
  desktopRef
}: { 
  emoji: string; 
  id: number; 
  onComplete: (id: number) => void;
  phoneRef?: React.RefObject<HTMLDivElement>;
  desktopRef?: React.RefObject<HTMLDivElement>;
}) {
  // Calculate the distance to fly from phone to desktop
  const endX = -600 - Math.random() * 200; // Fly far to the left (towards desktop)
  const curve = -100 - Math.random() * 100; // Arc upward
  
  return (
    <motion.div
      className="absolute text-2xl md:text-3xl z-50 pointer-events-none"
      style={{ right: "50%", bottom: "40%" }}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{ 
        x: [0, endX * 0.3, endX],
        y: [0, curve, curve * 0.5],
        opacity: [1, 1, 0.8, 0],
        scale: [1, 1.4, 1.2, 0.6],
        rotate: [0, -20, -10, 0]
      }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
    >
      {emoji}
    </motion.div>
  );
}

// Desktop Screen Illustration Component
function DesktopIllustration({ showConfetti, flyingEmojis, compact }: { showConfetti: boolean; flyingEmojis: { id: number; emoji: string }[]; compact?: boolean }) {
  const confettiColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: compact ? -20 : -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: compact ? 0.1 : 0.4 }}
      className="relative"
    >
      {/* Desktop Monitor */}
      <div className={`${compact ? "w-44 sm:w-52 p-1.5 rounded-lg" : "w-64 md:w-80 p-2 rounded-xl"} bg-slate-800 shadow-2xl`}>
        {/* Screen Bezel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden">
          {/* Browser Chrome */}
          <div className="bg-slate-700 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-slate-600 rounded text-[8px] text-slate-400 px-2 py-0.5 text-center truncate">
              yourpresentation.live
            </div>
          </div>
          
          {/* Presentation Slide Content */}
          <div className={`relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden ${compact ? "p-2 min-h-[100px]" : "p-4 md:p-6 min-h-[140px] md:min-h-[180px]"}`}>
            {/* Confetti Layer */}
            <AnimatePresence>
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <ConfettiParticle
                      key={i}
                      x={Math.random() * 100}
                      delay={Math.random() * 0.3}
                      color={confettiColors[i % confettiColors.length]}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
            
            {/* Flying Emojis that landed here */}
            <AnimatePresence>
              {flyingEmojis.map(({ id, emoji }) => (
                <motion.div
                  key={id}
                  className="absolute text-xl"
                  style={{ 
                    left: `${20 + Math.random() * 60}%`, 
                    top: `${20 + Math.random() * 50}%` 
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0.5] }}
                  transition={{ duration: 1.5 }}
                >
                  {emoji}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Slide Header */}
            <div className={`text-center relative z-10 ${compact ? "mb-2" : "mb-4"}`}>
              <div className={`inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 mb-1 ${compact ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[10px] mb-2"}`}>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </div>
              <h3 className={`text-white font-bold leading-tight ${compact ? "text-[10px]" : "text-sm md:text-base"}`}>
                What is the capital of France?
              </h3>
            </div>
            
            {/* Quiz Options Grid */}
            <div className={`grid grid-cols-2 relative z-10 ${compact ? "gap-1" : "gap-2"}`}>
              {[
                { letter: "A", text: "London", color: "bg-red-500" },
                { letter: "B", text: "Paris", color: "bg-blue-500", correct: true },
                { letter: "C", text: "Berlin", color: "bg-yellow-500" },
                { letter: "D", text: "Madrid", color: "bg-green-500" },
              ].map((option) => (
                <motion.div
                  key={option.letter}
                  animate={showConfetti && option.correct ? { 
                    scale: [1, 1.1, 1],
                    boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 20px 5px rgba(255,255,255,0.5)", "0 0 0 0 rgba(255,255,255,0)"]
                  } : {}}
                  transition={{ duration: 0.6 }}
                  className={`${option.color} ${compact ? "rounded-md px-1.5 py-1 gap-1" : "rounded-lg px-2 py-1.5 gap-1.5"} flex items-center shadow-md ${option.correct && showConfetti ? 'ring-2 ring-white' : ''}`}
                >
                  <span className={`${compact ? "w-3 h-3 text-[6px]" : "w-4 h-4 text-[8px]"} bg-white/30 rounded-full flex items-center justify-center font-bold text-white`}>
                    {option.letter}
                  </span>
                  <span className={`text-white font-medium ${compact ? "text-[8px]" : "text-[10px]"}`}>{option.text}</span>
                  {option.correct && showConfetti && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Live Counter */}
            <div className={`flex justify-center relative z-10 ${compact ? "mt-1.5" : "mt-3"}`}>
              <div className={`bg-white/20 backdrop-blur-sm rounded-full text-white/90 ${compact ? "px-2 py-0.5 text-[7px]" : "px-3 py-1 text-[9px]"}`}>
                👥 24 participants
              </div>
            </div>
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="flex justify-center mt-1">
          <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>
      
      {/* Monitor Base */}
      <div className="flex justify-center -mt-0.5">
        <div className="w-8 h-5 bg-slate-700 rounded-b-sm" />
      </div>
      <div className="flex justify-center">
        <div className="w-20 h-1.5 bg-slate-600 rounded-full" />
      </div>
    </motion.div>
  );
}

// Phone Screen Illustration Component  
function PhoneIllustration({ 
  onParisClick, 
  onEmojiClick,
  showConfetti,
  compact
}: { 
  onParisClick: () => void; 
  onEmojiClick: (emoji: string) => void;
  showConfetti: boolean;
  compact?: boolean;
}) {
  const confettiColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: compact ? 20 : 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: compact ? 0.15 : 0.5 }}
      className="relative"
    >
      {/* Phone Frame */}
      <div className={`${compact ? "w-28 sm:w-32 rounded-[1.5rem] p-1" : "w-36 md:w-44 rounded-[2rem] p-1.5"} bg-slate-800 shadow-2xl`}>
        {/* Screen */}
        <div className="bg-slate-900 rounded-[1.75rem] overflow-hidden">
          {/* Dynamic Island */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-16 h-4 bg-black rounded-full" />
          </div>
          
          {/* App Content */}
          <div className={`relative bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden ${compact ? "px-2 py-2 min-h-[140px]" : "px-3 py-3 min-h-[200px] md:min-h-[240px]"}`}>
            {/* Confetti Layer */}
            <AnimatePresence>
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <ConfettiParticle
                      key={i}
                      x={Math.random() * 100}
                      delay={Math.random() * 0.3}
                      color={confettiColors[i % confettiColors.length]}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
            
            {/* Header */}
            <div className={`text-center relative z-10 ${compact ? "mb-2" : "mb-3"}`}>
              <div className={`inline-flex items-center gap-1 bg-primary/20 rounded-full text-primary ${compact ? "px-1.5 py-0.5 text-[6px] mb-0.5" : "px-2 py-0.5 text-[8px] mb-1"}`}>
                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                Connected
              </div>
              <p className={`text-white/70 ${compact ? "text-[7px]" : "text-[9px]"}`}>Tap your answer!</p>
            </div>
            
            {/* Voting Buttons */}
            <div className={`relative z-10 ${compact ? "space-y-1" : "space-y-2"}`}>
              {[
                { letter: "A", text: "London", color: "from-red-500 to-red-600" },
                { letter: "B", text: "Paris", color: "from-blue-500 to-blue-600", correct: true },
                { letter: "C", text: "Berlin", color: "from-yellow-500 to-yellow-600" },
                { letter: "D", text: "Madrid", color: "from-green-500 to-green-600" },
              ].map((option) => (
                <motion.button
                  key={option.letter}
                  onClick={option.correct ? onParisClick : undefined}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  animate={showConfetti && option.correct ? { 
                    scale: [1, 1.08, 1],
                  } : {}}
                  className={`w-full bg-gradient-to-r ${option.color} ${compact ? "rounded-lg px-2 py-1.5 gap-1" : "rounded-xl px-3 py-2.5 gap-2"} flex items-center shadow-lg cursor-pointer transition-transform ${option.correct && showConfetti ? 'ring-2 ring-white' : ''}`}
                >
                  <span className={`bg-white/30 rounded-full flex items-center justify-center font-bold text-white ${compact ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[10px]"}`}>
                    {option.letter}
                  </span>
                  <span className={`text-white font-semibold ${compact ? "text-[9px]" : "text-xs"}`}>{option.text}</span>
                  {option.correct && showConfetti && (
                    <span className="ml-auto text-sm">✓</span>
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* Emoji Reactions */}
            <div className={`flex justify-center gap-2 relative z-10 ${compact ? "mt-1.5 gap-1" : "mt-3"}`}>
              {["🎉", "👍", "❤️", "😮"].map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => onEmojiClick(emoji)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className={`bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors ${compact ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm"}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Home Indicator */}
          <div className="flex justify-center py-2">
            <div className="w-20 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Sync Connector Animation - Curves ABOVE the text, very thin
function SyncConnector() {
  return (
    <div className="absolute -top-16 left-0 right-0 h-[120px] pointer-events-none z-30 hidden lg:block">
      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        {/* Thin curved connection line - arcs high above */}
        <motion.path
          d="M 10 28 Q 50 2, 90 28"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.15"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />
        
        {/* Animated sync pulse traveling along the path */}
        <motion.circle
          r="0.5"
          fill="hsl(var(--primary))"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.5,
            delay: 1.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            begin="1.5s"
            path="M 10 28 Q 50 2, 90 28"
          />
        </motion.circle>
        
        {/* Second pulse going the other direction */}
        <motion.circle
          r="0.4"
          fill="hsl(var(--primary))"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.8, 0] }}
          transition={{
            duration: 1.5,
            delay: 2.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            begin="2.5s"
            path="M 90 28 Q 50 2, 10 28"
          />
        </motion.circle>
      </svg>
    </div>
  );
}

export default function HeroSection({ onGenerate, onSeeExample }: HeroSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string }[]>([]);
  const [landedEmojis, setLandedEmojis] = useState<{ id: number; emoji: string }[]>([]);
  const [emojiIdCounter, setEmojiIdCounter] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    if (user) {
      // User is logged in, go directly to builder
      navigate(`/builder?prompt=${encodeURIComponent(prompt.trim())}&audience=general`);
    } else {
      // Store prompt and show auth modal
      setPendingPrompt(prompt.trim());
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Navigate to builder with prompt
    navigate(`/builder?prompt=${encodeURIComponent(pendingPrompt)}&audience=general`);
  };

  const handleParisClick = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);
  }, []);

  const handleEmojiClick = useCallback((emoji: string) => {
    const newId = emojiIdCounter;
    setEmojiIdCounter(prev => prev + 1);
    setFlyingEmojis(prev => [...prev, { id: newId, emoji }]);
    
    // Add to landed emojis after a delay
    setTimeout(() => {
      setLandedEmojis(prev => [...prev, { id: newId, emoji }]);
      // Remove landed emoji after animation
      setTimeout(() => {
        setLandedEmojis(prev => prev.filter(e => e.id !== newId));
      }, 1500);
    }, 1200);
  }, [emojiIdCounter]);

  const handleEmojiComplete = useCallback((id: number) => {
    setFlyingEmojis(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col lg:items-center lg:justify-center px-4 sm:px-4 py-12 sm:py-16 md:py-24 bg-background overflow-hidden pt-20 sm:pt-24 lg:pt-28 scroll-mt-20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Soft glow behind the input */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[800px] h-[500px] bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-7xl w-full flex flex-col">
        {/* MOBILE: Simple vertical flow - headline → subheadline → input → illustrations */}
        {/* DESKTOP: Original layout with illustrations on sides */}
        
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-4 mb-4 sm:mb-6 lg:mb-10">
          <SyncConnector />
          
          {/* Left Illustration - Desktop only */}
          <div className="hidden lg:block flex-shrink-0 relative z-20">
            <DesktopIllustration showConfetti={showConfetti} flyingEmojis={landedEmojis} />
          </div>

          {/* Text + Input - on mobile: headline → subheadline → input (monday vibe style) */}
          <div className="text-center max-w-2xl w-full px-1 sm:px-4 lg:px-8 relative z-10 flex flex-col items-center">
            {/* Headline - much larger on mobile, ensure visible */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-4xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-display font-bold text-foreground mb-4 sm:mb-5 leading-[1.12] tracking-tight"
            >
              Turn your words into{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                interactive lectures.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6 sm:mb-8"
            >
              AI builds the full experience in seconds: an interactive deck for the main screen{" "}
              <span className="font-semibold text-foreground/80">and</span>{" "}
              a live interface for every phone in the room.
            </motion.p>
          </div>

          {/* Right Illustration - Desktop only */}
          <div className="hidden lg:block flex-shrink-0 relative z-20">
            <PhoneIllustration 
              onParisClick={handleParisClick} 
              onEmojiClick={handleEmojiClick}
              showConfetti={showConfetti}
            />
            <AnimatePresence>
              {flyingEmojis.map(({ id, emoji }) => (
                <FlyingEmoji 
                  key={id} 
                  id={id} 
                  emoji={emoji} 
                  onComplete={handleEmojiComplete} 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Large AI Input Box - Immediately after text (monday vibe style) */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-3xl mx-auto w-full mb-0"
        >
          {/* Gradient border effect */}
          <div className="absolute -inset-[2px] rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 opacity-60 blur-sm" />
          
          {/* Main container */}
          <div className="relative bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Textarea - The Canvas */}
            <div className="p-4 sm:p-6 pb-3 sm:pb-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your topic and we'll build your presentation…

Example: Create a trivia quiz about world capitals with multiple choice and word cloud."
                className="min-h-[140px] sm:min-h-[180px] md:min-h-[200px] w-full border-0 bg-transparent resize-none text-sm sm:text-base md:text-lg placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-muted/30">
              {/* Left hints - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-primary/70" />
                  <span>Powered by AI</span>
                </div>
              </div>

              {/* Right CTA - full width on mobile */}
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="h-11 sm:h-12 px-6 sm:px-8 rounded-xl text-sm sm:text-base font-semibold gap-2 w-full sm:w-auto sm:ml-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                Build it
                <Zap className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions - immediately under text box (desktop & mobile) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-1"
        >
          <span className="text-xs sm:text-sm text-muted-foreground mr-1 sm:mr-2 shrink-0">Try:</span>
          {[
            "Lecture on photosynthesis with quiz",
            "Class feedback poll",
            "Course recap with Q&A",
          ].map((template) => (
            <button
              key={template}
              onClick={() => setPrompt(`Create an interactive ${template.toLowerCase()} for my students`)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-muted/60 text-xs sm:text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border"
            >
              {template}
            </button>
          ))}
        </motion.div>

        {/* How it works - steps flow (desktop & mobile) */}
        <div className="mt-8 sm:mt-10 lg:mt-12 w-full">
          <HowItWorks />
        </div>

        {/* Mobile-only: Desktop + Phone illustrations AFTER How it works, side by side */}
        <div className="lg:hidden flex flex-col items-center gap-6 mt-8 sm:mt-10">
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-6 w-full max-w-sm sm:max-w-md mx-auto">
            <DesktopIllustration showConfetti={showConfetti} flyingEmojis={landedEmojis} compact />
            <PhoneIllustration 
              onParisClick={handleParisClick} 
              onEmojiClick={handleEmojiClick}
              showConfetti={showConfetti}
              compact
            />
          </div>
        </div>

        {/* Hints below */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-5 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary/60" />
            <span>Ready in seconds</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary/60" />
            <span>No setup required</span>
          </div>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        promptText={pendingPrompt}
        redirectTo="builder"
      />
    </section>
  );
}
