import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  GameState,
  GamePlayer,
  Fruit,
  FRUIT_EMOJIS,
  FRUIT_TYPES,
  GAME_DURATION,
  COUNTDOWN_DURATION,
  PLAYER_WIDTH,
  CATCH_THRESHOLD,
} from "@/types/game";

interface FruitCatchGameProps {
  lectureId: string;
  students: { id: string; name: string; emoji: string }[];
  onClose: () => void;
}

export function FruitCatchGame({ lectureId, students, onClose }: FruitCatchGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    countdown: COUNTDOWN_DURATION,
    timeRemaining: GAME_DURATION,
    players: [],
    fruits: [],
  });
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const fruitSpawnRef = useRef<number | null>(null);

  // Initialize players from students
  useEffect(() => {
    const initialPlayers: GamePlayer[] = students.map((s, index) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      x: 50, // Start in center
      score: 0,
    }));
    
    setGameState(prev => ({
      ...prev,
      players: initialPlayers,
    }));
  }, [students]);

  // Setup realtime channel for game
  useEffect(() => {
    const channel = supabase.channel(`game-${lectureId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'player_move' }, ({ payload }) => {
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === payload.playerId
              ? { ...p, x: Math.max(PLAYER_WIDTH / 2, Math.min(100 - PLAYER_WIDTH / 2, payload.x)) }
              : p
          ),
        }));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  // Broadcast game state to all players
  const broadcastGameState = useCallback((state: GameState) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: state,
    });
  }, []);

  // Spawn a new fruit
  const spawnFruit = useCallback(() => {
    const types = [...FRUIT_TYPES];
    // 10% chance for golden fruit
    if (Math.random() < 0.1) {
      types.push('golden');
    }
    const type = types[Math.floor(Math.random() * types.length)] as Fruit['type'];
    
    const newFruit: Fruit = {
      id: `fruit-${Date.now()}-${Math.random()}`,
      x: 5 + Math.random() * 90, // 5-95% to avoid edges
      y: -5,
      type,
      speed: 0.3 + Math.random() * 0.4, // Variable speed
      collected: false,
      collectedBy: [],
    };

    setGameState(prev => ({
      ...prev,
      fruits: [...prev.fruits, newFruit],
    }));
  }, []);

  // Check collisions and update fruits
  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== 'playing') return prev;

      let updatedPlayers = [...prev.players];
      
      // Update fruit positions and check collisions
      const updatedFruits = prev.fruits
        .map(fruit => {
          if (fruit.collected || fruit.y > 105) return fruit;
          
          const newY = fruit.y + fruit.speed;
          
          // Check collision with players at the bottom
          if (newY >= 85 && newY <= 100) {
            const newCollectedBy: string[] = [];
            
            prev.players.forEach(player => {
              const distance = Math.abs(fruit.x - player.x);
              if (distance < CATCH_THRESHOLD && !fruit.collectedBy.includes(player.id)) {
                newCollectedBy.push(player.id);
              }
            });

            if (newCollectedBy.length > 0) {
              // Award points to all players who caught it
              const points = FRUIT_EMOJIS[fruit.type].points;
              updatedPlayers = updatedPlayers.map(p =>
                newCollectedBy.includes(p.id)
                  ? { ...p, score: p.score + points }
                  : p
              );

              return {
                ...fruit,
                y: newY,
                collected: true,
                collectedBy: [...fruit.collectedBy, ...newCollectedBy],
              };
            }
          }

          return { ...fruit, y: newY };
        })
        .filter(fruit => fruit.y <= 105); // Remove fruits that fell off screen

      return {
        ...prev,
        fruits: updatedFruits,
        players: updatedPlayers,
      };
    });
  }, []);

  // Start the game
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'countdown',
      countdown: COUNTDOWN_DURATION,
      timeRemaining: GAME_DURATION,
      fruits: [],
      players: prev.players.map(p => ({ ...p, score: 0, x: 50 })),
    }));

    // Countdown
    let count = COUNTDOWN_DURATION;
    const countdownInterval = setInterval(() => {
      count--;
      setGameState(prev => ({ ...prev, countdown: count }));
      
      if (count <= 0) {
        clearInterval(countdownInterval);
        setGameState(prev => ({ ...prev, status: 'playing' }));
        
        // Start game loop
        gameLoopRef.current = window.setInterval(updateGame, 16); // ~60fps
        
        // Start spawning fruits
        fruitSpawnRef.current = window.setInterval(spawnFruit, 800);
        
        // Game timer
        let timeLeft = GAME_DURATION;
        const timerInterval = setInterval(() => {
          timeLeft--;
          setGameState(prev => ({ ...prev, timeRemaining: timeLeft }));
          
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (fruitSpawnRef.current) clearInterval(fruitSpawnRef.current);
            setGameState(prev => ({ ...prev, status: 'ended' }));
          }
        }, 1000);
      }
    }, 1000);
  }, [updateGame, spawnFruit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (fruitSpawnRef.current) clearInterval(fruitSpawnRef.current);
    };
  }, []);

  // Broadcast state changes
  useEffect(() => {
    broadcastGameState(gameState);
  }, [gameState, broadcastGameState]);

  const topPlayers = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-green-400 z-50 overflow-hidden"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Game Header */}
      <div className="absolute top-4 left-4 right-16 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
            <Clock className="w-5 h-5" />
            <span className="text-2xl font-bold font-mono">
              {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
            <Users className="w-5 h-5" />
            <span className="font-bold">{gameState.players.length}</span>
          </div>
        </div>

        {/* Mini leaderboard during game */}
        {gameState.status === 'playing' && topPlayers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <div className="flex items-center gap-3">
              {topPlayers.slice(0, 3).map((player, index) => (
                <div key={player.id} className="flex items-center gap-1 text-white">
                  <span className="text-lg">{player.emoji}</span>
                  <span className="font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Waiting / Start Screen */}
      <AnimatePresence>
        {gameState.status === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-30"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-8xl mb-8"
            >
              🍎🍊🍌
            </motion.div>
            <h1 className="text-6xl font-display font-bold text-white mb-4 drop-shadow-lg">
              Fruit Catch!
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              {students.length} players ready
            </p>
            <Button
              size="lg"
              className="text-2xl px-12 py-8 bg-white text-green-600 hover:bg-white/90 shadow-xl"
              onClick={startGame}
            >
              Start Game 🎮
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown */}
      <AnimatePresence>
        {gameState.status === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-30 bg-black/30"
          >
            <motion.div
              key={gameState.countdown}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-[200px] font-display font-bold text-white drop-shadow-2xl"
            >
              {gameState.countdown || "GO!"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Area - Fruits and Players */}
      {(gameState.status === 'playing' || gameState.status === 'ended') && (
        <div className="absolute inset-0">
          {/* Ground - Semi-transparent so fruits are visible through it */}
          <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-gradient-to-t from-green-600/80 to-green-500/60 z-10">
            {/* Light grass texture - more subtle */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 w-0.5 bg-green-800 rounded-t"
                  style={{
                    left: `${i * 3.3}%`,
                    height: `${15 + Math.random() * 20}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Players - Above ground, z-20 so fruits fall onto them */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <AnimatePresence>
              {gameState.players.map(player => (
                <motion.div
                  key={player.id}
                  animate={{ left: `${player.x}%`, x: '-50%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute bottom-[8%]"
                >
                  <div className="flex flex-col items-center">
                    {/* Name label above emoji */}
                    <div className="px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-bold whitespace-nowrap mb-1 shadow-lg max-w-[80px] truncate">
                      {player.name}
                    </div>
                    {/* Larger emoji for better visibility */}
                    <div className="text-5xl md:text-6xl drop-shadow-lg">{player.emoji}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Fruits - z-30 so they appear on top of everything and fall onto emojis */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            <AnimatePresence>
              {gameState.fruits.map(fruit => (
                <motion.div
                  key={fruit.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: fruit.collected ? 0 : 1, 
                    scale: fruit.collected ? 1.8 : 1,
                    x: '-50%',
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: fruit.collected ? 0.3 : 0 }}
                  className="absolute text-5xl md:text-6xl drop-shadow-xl"
                  style={{
                    left: `${fruit.x}%`,
                    top: `${fruit.y}%`,
                  }}
                >
                  {FRUIT_EMOJIS[fruit.type].emoji}
                  {fruit.collected && (
                    <motion.span
                      initial={{ y: 0, opacity: 1, scale: 1 }}
                      animate={{ y: -40, opacity: 0, scale: 1.5 }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl font-bold text-yellow-300 drop-shadow-lg"
                    >
                      +{FRUIT_EMOJIS[fruit.type].points}
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* End Game - Final Leaderboard */}
      <AnimatePresence>
        {gameState.status === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="text-center mb-6">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-display font-bold text-foreground">Game Over!</h2>
              </div>

              {/* Top 5 */}
              <div className="space-y-3 mb-6">
                {topPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-300'
                        : index === 2
                        ? 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-400'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-foreground">
                      {index + 1}
                    </div>
                    <span className="text-2xl">{player.emoji}</span>
                    <span className="flex-1 font-medium text-foreground">{player.name}</span>
                    <span className="font-bold text-primary text-lg">{player.score} pts</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={startGame}
                >
                  Play Again 🎮
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
