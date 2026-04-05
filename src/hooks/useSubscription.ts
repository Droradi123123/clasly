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
import {
  PLAN_FEATURES,
  normalizePlanNameForFeatures,
  type PlanProduct,
} from "@/types/subscription";

export function useSubscription(): SubscriptionState & SubscriptionHelpers {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    credits: null,
    plan: null,
    isLoading: true,
    error: null,
  });

  // Fetch subscription data with retry and ensureUserCredits for PGRST116
  const FETCH_RETRY_MAX = 2;
  const FETCH_RETRY_DELAY_MS = 800;

  useEffect(() => {
    let cancelled = false;

    const fetchData = async (attempt = 0): Promise<void> => {
      if (authLoading) return;
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
        const [subRes, creditsRes] = await Promise.all([
          supabase
            .from("user_subscriptions")
            .select(`*, subscription_plans (*)`)
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("user_credits")
            .select("*")
            .eq("user_id", user.id)
            .single(),
        ]);

        const { data: subscriptionData, error: subError } = subRes;
        const { data: creditsData, error: creditsError } = creditsRes;

        if (subError && subError.code !== "PGRST116") throw subError;

        if (creditsError && creditsError.code !== "PGRST116") throw creditsError;

        if (creditsError?.code === "PGRST116") {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const { error: ensureErr } = await supabase.functions.invoke("ensure-user-credits", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!ensureErr) {
              const { data: newCredits } = await supabase
                .from("user_credits")
                .select("*")
                .eq("user_id", user.id)
                .single();
              if (cancelled) return;
              setState({
                subscription: subscriptionData as SubscriptionWithPlan | null,
                credits: newCredits as UserCredits | null,
                plan: (subscriptionData as SubscriptionWithPlan | null)?.subscription_plans as SubscriptionPlan | null,
                isLoading: false,
                error: null,
              });
              return;
            }
          }
        }

        if (cancelled) return;

        setState({
          subscription: subscriptionData as SubscriptionWithPlan | null,
          credits: creditsData as UserCredits | null,
          plan: (subscriptionData as SubscriptionWithPlan | null)?.subscription_plans as SubscriptionPlan | null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        const shouldRetry = attempt < FETCH_RETRY_MAX;
        if (shouldRetry) {
          await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS));
          return fetchData(attempt + 1);
        } else {
          console.error("Error fetching subscription:", error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error("Failed to fetch subscription"),
          }));
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
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
  const featureTierName = normalizePlanNameForFeatures(planName);
  const planProduct: PlanProduct =
    state.plan?.product === "webinar" ? "webinar" : "education";
  const isFree = featureTierName === "Free";
  const isStandard = featureTierName === "Standard";
  const isPro = featureTierName === "Pro";

  const isEducationFree = planProduct === "education" && isFree;
  const canAccessWebinarDashboard =
    planProduct === "webinar" || isEducationFree;
  const canAccessEducatorDashboard = planProduct === "education";

  const canUse = useCallback(
    (feature: FeatureKey): boolean => {
      const allowedFeatures = PLAN_FEATURES[featureTierName] || [];
      return allowedFeatures.includes(feature);
    },
    [featureTierName]
  );

  const hasAITokens = useCallback((amount: number = 1): boolean => {
    return (state.credits?.ai_tokens_balance ?? 0) >= amount;
  }, [state.credits?.ai_tokens_balance]);

  return {
    ...state,
    isFree,
    isStandard,
    isPro,
    canUse,
    hasAITokens,
    maxSlides: state.plan?.max_slides ?? 5,
    aiTokensRemaining: state.credits?.ai_tokens_balance ?? 0,
    planName,
    featureTierName,
    planProduct,
    canAccessWebinarDashboard,
    canAccessEducatorDashboard,
    currentPlanId: state.plan?.id ?? null,
    isSubLoading: state.isLoading,
  };
}
