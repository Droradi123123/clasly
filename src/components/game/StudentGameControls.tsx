import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GameState, FRUIT_EMOJIS } from "@/types/game";

interface StudentGameControlsProps {
  lectureId: string;
  studentId: string;
  studentName: string;
  studentEmoji: string;
}

export function StudentGameControls({
  lectureId,
  studentId,
  studentName,
  studentEmoji,
}: StudentGameControlsProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerX, setPlayerX] = useState(50);
  const [myScore, setMyScore] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const moveIntervalRef = useRef<number | null>(null);

  // Subscribe to game state
  useEffect(() => {
    const channel = supabase.channel(`game-${lectureId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        setGameState(payload as GameState);
        // Update my score from state
        const me = (payload as GameState).players.find(p => p.id === studentId);
        if (me) {
          setMyScore(me.score);
          setPlayerX(me.x);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [lectureId, studentId]);

  // Send movement
  const sendMove = useCallback((newX: number) => {
    const clampedX = Math.max(5, Math.min(95, newX));
    setPlayerX(clampedX);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_move',
      payload: { playerId: studentId, x: clampedX },
    });
  }, [studentId]);

  // Movement handlers with continuous movement
  const startMoving = useCallback((direction: 'left' | 'right') => {
    // Immediate move
    const delta = direction === 'left' ? -5 : 5;
    sendMove(playerX + delta);
    
    // Continue moving while held
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = window.setInterval(() => {
      setPlayerX(prev => {
        const newX = prev + delta;
        const clampedX = Math.max(5, Math.min(95, newX));
        channelRef.current?.send({
          type: 'broadcast',
          event: 'player_move',
          payload: { playerId: studentId, x: clampedX },
        });
        return clampedX;
      });
    }, 50);
  }, [playerX, sendMove, studentId]);

  const stopMoving = useCallback(() => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState?.status !== 'playing') return;
      if (e.key === 'ArrowLeft') startMoving('left');
      if (e.key === 'ArrowRight') startMoving('right');
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        stopMoving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState?.status, startMoving, stopMoving]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 to-green-400 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white"
        >
          <div className="text-6xl mb-4">🎮</div>
          <p className="text-xl">Connecting to game...</p>
        </motion.div>
      </div>
    );
  }

  const topPlayers = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 5);
  const myRank = [...gameState.players].sort((a, b) => b.score - a.score).findIndex(p => p.id === studentId) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-green-400 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
          <span className="text-2xl">{studentEmoji}</span>
          <span className="font-bold">{studentName}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">
              {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-yellow-400/80 text-yellow-900">
            <Trophy className="w-4 h-4" />
            <span className="font-bold">{myScore}</span>
          </div>
        </div>
      </div>

      {/* Waiting Screen */}
      <AnimatePresence>
        {gameState.status === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-4 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-7xl mb-6"
            >
              🍎
            </motion.div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">
              Fruit Catch!
            </h2>
            <p className="text-lg text-white/80">
              Waiting for host to start...
            </p>
            <div className="mt-8 flex items-center gap-2 text-white/70">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{gameState.players.length} players ready</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown */}
      <AnimatePresence>
        {gameState.status === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <motion.div
              key={gameState.countdown}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-[120px] font-display font-bold text-white drop-shadow-2xl"
            >
              {gameState.countdown || "GO!"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Playing */}
      <AnimatePresence>
        {gameState.status === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Mini game view - show player position indicator */}
            <div className="flex-1 flex items-center justify-center relative px-4">
              <div className="w-full max-w-sm">
                {/* Position indicator */}
                <div className="relative h-16 bg-white/20 rounded-full backdrop-blur-sm overflow-hidden">
                  <motion.div
                    animate={{ left: `${playerX}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  >
                    <div className="text-4xl">{studentEmoji}</div>
                  </motion.div>
                  
                  {/* Edge indicators */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl opacity-50">⬅️</div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl opacity-50">➡️</div>
                </div>
                
                <p className="text-center text-white/80 mt-4 text-sm">
                  Watch the main screen to catch fruits!
                </p>
              </div>
            </div>

            {/* Control Buttons - Extra large and clear */}
            <div className="p-4 grid grid-cols-2 gap-6">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onTouchStart={() => startMoving('left')}
                onTouchEnd={stopMoving}
                onMouseDown={() => startMoving('left')}
                onMouseUp={stopMoving}
                onMouseLeave={stopMoving}
                className="h-40 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl flex items-center justify-center active:from-blue-600 active:to-blue-700 transition-all select-none border-4 border-white/30"
              >
                <div className="flex flex-col items-center">
                  <ChevronLeft className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={3} />
                  <span className="text-white font-bold text-lg mt-1">LEFT</span>
                </div>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.92 }}
                onTouchStart={() => startMoving('right')}
                onTouchEnd={stopMoving}
                onMouseDown={() => startMoving('right')}
                onMouseUp={stopMoving}
                onMouseLeave={stopMoving}
                className="h-40 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 shadow-xl flex items-center justify-center active:from-green-600 active:to-green-700 transition-all select-none border-4 border-white/30"
              >
                <div className="flex flex-col items-center">
                  <ChevronRight className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={3} />
                  <span className="text-white font-bold text-lg mt-1">RIGHT</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Ended */}
      <AnimatePresence>
        {gameState.status === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-6xl mb-4"
            >
              {myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎮'}
            </motion.div>
            
            <h2 className="text-3xl font-display font-bold text-white mb-2">
              Game Over!
            </h2>
            
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white mb-1">{myScore}</p>
              <p className="text-white/80">points • Rank #{myRank}</p>
            </div>

            {/* Top 5 */}
            <div className="w-full max-w-sm space-y-2">
              {topPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    player.id === studentId
                      ? 'bg-yellow-400/80 ring-2 ring-yellow-300'
                      : 'bg-white/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    player.id === studentId ? 'bg-yellow-600 text-white' : 'bg-white/30 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-2xl">{player.emoji}</span>
                  <span className={`flex-1 font-medium ${
                    player.id === studentId ? 'text-yellow-900' : 'text-white'
                  }`}>{player.name}</span>
                  <span className={`font-bold ${
                    player.id === studentId ? 'text-yellow-900' : 'text-white'
                  }`}>{player.score}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
