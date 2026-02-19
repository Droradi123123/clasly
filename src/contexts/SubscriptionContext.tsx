import React, { createContext, useContext, ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import type {
  SubscriptionState,
  SubscriptionHelpers,
} from "@/types/subscription";

type SubscriptionContextType = SubscriptionState & SubscriptionHelpers;

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const subscription = useSubscription();

  // Don't block rendering - provide context immediately
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscriptionContext must be used within a SubscriptionProvider"
    );
  }
  return context;
}

// Convenience hook for components that just need to check access
export function useFeatureAccess() {
  const { canUse, isFree, isPro, planName } = useSubscriptionContext();
  return { canUse, isFree, isPro, planName };
}

// Convenience hook for components that need credit info
export function useCredits() {
  const {
    aiTokensRemaining,
    hasAITokens,
    credits,
  } = useSubscriptionContext();
  return {
    aiTokensRemaining,
    hasAITokens,
    credits,
  };
}
