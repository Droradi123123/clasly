import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type {
  SubscriptionState,
  SubscriptionHelpers,
  SubscriptionWithPlan,
  FeatureKey,
  SubscriptionPlan,
  UserCredits,
} from "@/types/subscription";
import { PLAN_FEATURES } from "@/types/subscription";

export function useSubscription(): SubscriptionState & SubscriptionHelpers {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    credits: null,
    plan: null,
    isLoading: true,
    error: null,
  });

  // Fetch subscription data
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // No user = no subscription
      if (!user) {
        setState({
          subscription: null,
          credits: null,
          plan: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        // Fetch subscription with plan details
        const { data: subscriptionData, error: subError } = await supabase
          .from("user_subscriptions")
          .select(`*, subscription_plans (*)`)
          .eq("user_id", user.id)
          .single();

        if (subError && subError.code !== "PGRST116") {
          throw subError;
        }

        // Fetch user credits
        const { data: creditsData, error: creditsError } = await supabase
          .from("user_credits")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (creditsError && creditsError.code !== "PGRST116") {
          throw creditsError;
        }

        if (cancelled) return;

        const subscription = subscriptionData as SubscriptionWithPlan | null;
        const plan = subscription?.subscription_plans as SubscriptionPlan | null;

        setState({
          subscription,
          credits: creditsData as UserCredits | null,
          plan,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching subscription:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Failed to fetch subscription"),
        }));
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  // Subscribe to realtime updates on user_credits
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_credits_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setState((prev) => ({
              ...prev,
              credits: payload.new as UserCredits,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Compute helper values
  const planName = state.plan?.name || "Free";
  const isFree = planName === "Free";
  const isStandard = planName === "Standard";
  const isPro = planName === "Pro";

  const canUse = useCallback((feature: FeatureKey): boolean => {
    const allowedFeatures = PLAN_FEATURES[planName] || [];
    return allowedFeatures.includes(feature);
  }, [planName]);

  const hasAITokens = useCallback((amount: number = 1): boolean => {
    return (state.credits?.ai_tokens_balance ?? 0) >= amount;
  }, [state.credits?.ai_tokens_balance]);

  const hasVibeCredits = useCallback((amount: number = 1): boolean => {
    return (state.credits?.vibe_credits_balance ?? 0) >= amount;
  }, [state.credits?.vibe_credits_balance]);

  return {
    ...state,
    isFree,
    isStandard,
    isPro,
    canUse,
    hasAITokens,
    hasVibeCredits,
    maxSlides: state.plan?.max_slides ?? 5,
    aiTokensRemaining: state.credits?.ai_tokens_balance ?? 0,
    vibeCreditsRemaining: state.credits?.vibe_credits_balance ?? 0,
    planName,
  };
}
