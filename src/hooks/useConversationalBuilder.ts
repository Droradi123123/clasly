import { create } from 'zustand';
import { Slide } from '@/types/slides';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AICommand {
  action: 'update_slide' | 'insert_slide' | 'delete_slide' | 'update_theme' | 'regenerate_image' | 'update_all';
  slideIndex?: number;
  field?: string;
  newValue?: any;
  slides?: Slide[];
}

interface ConversationalBuilderState {
  // Sandbox slides (not committed to DB yet)
  sandboxSlides: Slide[];
  
  // Chat state
  messages: ChatMessage[];
  isGenerating: boolean;
  
  // Preview state
  currentPreviewIndex: number;
  
  // Original prompt
  originalPrompt: string;
  targetAudience: string;
  
  // Theme
  generatedTheme: any;
  
  // Actions
  setSandboxSlides: (slides: Slide[]) => void;
  updateSlide: (index: number, updates: Partial<Slide>) => void;
  insertSlide: (index: number, slide: Slide) => void;
  deleteSlide: (index: number) => void;
  setCurrentPreviewIndex: (index: number) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  setIsGenerating: (value: boolean) => void;
  setOriginalPrompt: (prompt: string, audience: string) => void;
  setGeneratedTheme: (theme: any) => void;
  reset: () => void;
  
  // Execute AI command
  executeCommand: (command: AICommand) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useConversationalBuilder = create<ConversationalBuilderState>((set, get) => ({
  sandboxSlides: [],
  messages: [],
  isGenerating: false,
  currentPreviewIndex: 0,
  originalPrompt: '',
  targetAudience: 'general',
  generatedTheme: null,
  
  setSandboxSlides: (slides) => set({ sandboxSlides: slides }),
  
  updateSlide: (index, updates) => set((state) => {
    const newSlides = [...state.sandboxSlides];
    if (newSlides[index]) {
      newSlides[index] = { ...newSlides[index], ...updates };
    }
    return { sandboxSlides: newSlides };
  }),
  
  insertSlide: (index, slide) => set((state) => {
    const newSlides = [...state.sandboxSlides];
    newSlides.splice(index, 0, slide);
    // Reorder all slides
    return { 
      sandboxSlides: newSlides.map((s, i) => ({ ...s, order: i })) 
    };
  }),
  
  deleteSlide: (index) => set((state) => {
    const newSlides = state.sandboxSlides.filter((_, i) => i !== index);
    return { 
      sandboxSlides: newSlides.map((s, i) => ({ ...s, order: i })),
      currentPreviewIndex: Math.min(state.currentPreviewIndex, newSlides.length - 1)
    };
  }),
  
  setCurrentPreviewIndex: (index) => set({ currentPreviewIndex: index }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    }]
  })),
  
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content,
        isLoading: false,
      };
    }
    return { messages };
  }),
  
  setIsGenerating: (value) => set({ isGenerating: value }),
  
  setOriginalPrompt: (prompt, audience) => set({ 
    originalPrompt: prompt,
    targetAudience: audience,
  }),
  
  setGeneratedTheme: (theme) => set({ generatedTheme: theme }),
  
  reset: () => set({
    sandboxSlides: [],
    messages: [],
    isGenerating: false,
    currentPreviewIndex: 0,
    originalPrompt: '',
    targetAudience: 'general',
    generatedTheme: null,
  }),
  
  executeCommand: (command) => {
    const state = get();
    
    switch (command.action) {
      case 'update_slide':
        if (command.slideIndex !== undefined && command.field && command.newValue !== undefined) {
          const slide = state.sandboxSlides[command.slideIndex];
          if (slide) {
            const updates: Partial<Slide> = {};
            if (command.field === 'content') {
              updates.content = { ...slide.content, ...command.newValue };
            } else if (command.field === 'design') {
              updates.design = { ...slide.design, ...command.newValue };
            } else if (command.field === 'type') {
              updates.type = command.newValue;
            }
            state.updateSlide(command.slideIndex, updates);
          }
        }
        break;
        
      case 'insert_slide':
        if (command.slideIndex !== undefined && command.newValue) {
          state.insertSlide(command.slideIndex, command.newValue);
        }
        break;
        
      case 'delete_slide':
        if (command.slideIndex !== undefined) {
          state.deleteSlide(command.slideIndex);
        }
        break;
        
      case 'update_all':
        if (command.slides) {
          set({ sandboxSlides: command.slides });
        }
        break;
        
      default:
        console.warn('Unknown command action:', command.action);
    }
  },
}));
