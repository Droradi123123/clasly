import { create } from 'zustand';

export type SimulationMode = 'editing' | 'simulating' | 'live';

interface SimulationData {
  quiz?: number[];
  poll?: number[];
  wordcloud?: { text: string; count: number }[];
  yesno?: { yes: number; no: number };
  scale?: { average: number; distribution: number[] };
  guess?: { guesses: number[]; average: number; closestGuess: number };
  ranking?: { rankings: Record<string, number> };
}

interface SimulationState {
  mode: SimulationMode;
  isSimulating: boolean;
  simulationData: SimulationData;
  simulationProgress: number;
  
  // Actions
  setMode: (mode: SimulationMode) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  updateSimulationData: (data: Partial<SimulationData>) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

export const useSimulation = create<SimulationState>((set) => ({
  mode: 'editing',
  isSimulating: false,
  simulationData: {},
  simulationProgress: 0,
  
  setMode: (mode) => set({ mode, isSimulating: mode === 'simulating' }),
  
  startSimulation: () => set({ 
    mode: 'simulating', 
    isSimulating: true, 
    simulationProgress: 0,
    simulationData: {},
  }),
  
  stopSimulation: () => set({ 
    mode: 'editing', 
    isSimulating: false, 
    simulationProgress: 0,
    simulationData: {},
  }),
  
  updateSimulationData: (data) => set((state) => ({
    simulationData: { ...state.simulationData, ...data },
  })),
  
  setProgress: (progress) => set({ simulationProgress: progress }),
  
  reset: () => set({
    mode: 'editing',
    isSimulating: false,
    simulationData: {},
    simulationProgress: 0,
  }),
}));
