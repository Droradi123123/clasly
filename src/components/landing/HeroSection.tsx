import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";

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
function DesktopIllustration({ showConfetti, flyingEmojis }: { showConfetti: boolean; flyingEmojis: { id: number; emoji: string }[] }) {
  const confettiColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="relative"
    >
      {/* Desktop Monitor */}
      <div className="w-64 md:w-80 bg-slate-800 rounded-xl p-2 shadow-2xl">
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
          <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 md:p-6 min-h-[140px] md:min-h-[180px] overflow-hidden">
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
            <div className="text-center mb-4 relative z-10">
              <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-white/90 mb-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </div>
              <h3 className="text-white font-bold text-sm md:text-base leading-tight">
                What is the capital of France?
              </h3>
            </div>
            
            {/* Quiz Options Grid */}
            <div className="grid grid-cols-2 gap-2 relative z-10">
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
                  className={`${option.color} rounded-lg px-2 py-1.5 flex items-center gap-1.5 shadow-md ${option.correct && showConfetti ? 'ring-2 ring-white' : ''}`}
                >
                  <span className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                    {option.letter}
                  </span>
                  <span className="text-white text-[10px] font-medium">{option.text}</span>
                  {option.correct && showConfetti && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Live Counter */}
            <div className="mt-3 flex justify-center relative z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[9px] text-white/90">
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
  showConfetti 
}: { 
  onParisClick: () => void; 
  onEmojiClick: (emoji: string) => void;
  showConfetti: boolean;
}) {
  const confettiColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="relative"
    >
      {/* Phone Frame */}
      <div className="w-36 md:w-44 bg-slate-800 rounded-[2rem] p-1.5 shadow-2xl">
        {/* Screen */}
        <div className="bg-slate-900 rounded-[1.75rem] overflow-hidden">
          {/* Dynamic Island */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-16 h-4 bg-black rounded-full" />
          </div>
          
          {/* App Content */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-3 py-3 min-h-[200px] md:min-h-[240px] overflow-hidden">
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
            <div className="text-center mb-3 relative z-10">
              <div className="inline-flex items-center gap-1 bg-primary/20 rounded-full px-2 py-0.5 text-[8px] text-primary mb-1">
                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                Connected
              </div>
              <p className="text-white/70 text-[9px]">Tap your answer!</p>
            </div>
            
            {/* Voting Buttons */}
            <div className="space-y-2 relative z-10">
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
                  className={`w-full bg-gradient-to-r ${option.color} rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-lg cursor-pointer transition-transform ${option.correct && showConfetti ? 'ring-2 ring-white' : ''}`}
                >
                  <span className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {option.letter}
                  </span>
                  <span className="text-white text-xs font-semibold">{option.text}</span>
                  {option.correct && showConfetti && (
                    <span className="ml-auto text-sm">✓</span>
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* Emoji Reactions */}
            <div className="mt-3 flex justify-center gap-2 relative z-10">
              {["🎉", "👍", "❤️", "😮"].map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => onEmojiClick(emoji)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
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
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-16 md:py-24 bg-background overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Soft glow behind the input */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[800px] h-[500px] bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Top Section with Illustrations and Text */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4 mb-10">
          {/* Sync Connector - ABOVE everything */}
          <SyncConnector />
          
          {/* Left Illustration - Desktop */}
          <div className="hidden lg:block flex-shrink-0 relative z-20">
            <DesktopIllustration showConfetti={showConfetti} flyingEmojis={landedEmojis} />
          </div>

          {/* Center Text Content */}
          <div className="text-center max-w-2xl px-4 lg:px-8 relative z-10">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-5 leading-[1.1] tracking-tight"
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
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto"
            >
              AI builds the full experience in seconds: an interactive deck for the main screen{" "}
              <span className="font-semibold text-foreground/80">and</span>{" "}
              a live interface for every phone in the room.
            </motion.p>
            
            {/* Mobile Illustrations - Show on smaller screens */}
            <div className="flex lg:hidden items-center justify-center gap-6 mt-8 relative">
              <div className="scale-75">
                <DesktopIllustration showConfetti={showConfetti} flyingEmojis={landedEmojis} />
              </div>
              <div className="scale-75">
                <PhoneIllustration 
                  onParisClick={handleParisClick} 
                  onEmojiClick={handleEmojiClick}
                  showConfetti={showConfetti}
                />
              </div>
            </div>
          </div>

          {/* Right Illustration - Phone */}
          <div className="hidden lg:block flex-shrink-0 relative z-20">
            <PhoneIllustration 
              onParisClick={handleParisClick} 
              onEmojiClick={handleEmojiClick}
              showConfetti={showConfetti}
            />
            
            {/* Flying Emojis Container */}
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

        {/* Large AI Input Box - The Star (UNCHANGED) */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Gradient border effect */}
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 opacity-60 blur-sm" />
          
          {/* Main container */}
          <div className="relative bg-card rounded-3xl border border-border shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Textarea - The Canvas */}
            <div className="p-6 pb-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your topic, audience, and goal…

Example: Create a fun trivia quiz about world capitals for my geography class. Include multiple choice questions and a word cloud for student feedback."
                className="min-h-[180px] md:min-h-[200px] w-full border-0 bg-transparent resize-none text-base md:text-lg placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-muted/30">
              {/* Left hints */}
              <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-primary/70" />
                  <span>Powered by AI</span>
                </div>
              </div>

              {/* Right CTA */}
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="h-12 px-8 rounded-xl text-base font-semibold gap-2 ml-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                Build it
                <Zap className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Hints below */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
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

        {/* Quick templates */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-sm text-muted-foreground mr-2">Try:</span>
          {[
            "Team ice-breaker quiz",
            "Product launch poll",
            "Classroom Q&A",
          ].map((template) => (
            <button
              key={template}
              onClick={() => setPrompt(`Create a ${template.toLowerCase()} with interactive questions that engage participants`)}
              className="px-4 py-2 rounded-full bg-muted/60 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border"
            >
              {template}
            </button>
          ))}
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
