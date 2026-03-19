import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { withTimeout } from "@/lib/supabaseFunctions";
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

  // Fetch subscription data with retry and ensureUserCredits for PGRST116
  const FETCH_RETRY_MAX = 2;
  const FETCH_RETRY_DELAY_MS = 800;
  /** Never block Dashboard / AI forever on a hung PostgREST or Edge call */
  const SUBSCRIPTION_FETCH_TIMEOUT_MS = 14_000;
  const ENSURE_CREDITS_TIMEOUT_MS = 22_000;

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

      const loadSubscriptionAndCredits = async () => {
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
            const invokeResult = await withTimeout(
              supabase.functions.invoke("ensure-user-credits", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              }),
              ENSURE_CREDITS_TIMEOUT_MS,
              "ensure-user-credits timed out"
            );
            const { error: ensureErr } = invokeResult;
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
      };

      try {
        await Promise.race([
          loadSubscriptionAndCredits(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("__SUBSCRIPTION_FETCH_TIMEOUT__")),
              SUBSCRIPTION_FETCH_TIMEOUT_MS
            )
          ),
        ]);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "__SUBSCRIPTION_FETCH_TIMEOUT__") {
          console.warn("[useSubscription] Subscription/credits fetch timed out — releasing UI (data may still arrive)");
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error:
              prev.error ??
              new Error("Could not load plan right away. Your lectures still work; try refreshing if credits look wrong."),
          }));
          return;
        }
        const shouldRetry = attempt < FETCH_RETRY_MAX;
        if (shouldRetry) {
          await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS));
          fetchData(attempt + 1);
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
  const isFree = planName === "Free";
  const isStandard = planName === "Standard";
  const isPro = planName === "Pro";

  const canUse = useCallback((feature: FeatureKey): boolean => {
    const allowedFeatures = PLAN_FEATURES[planName] || [];
    return allowedFeatures.includes(feature);
  }, [planName]);

  const hasAITokens = useCallback((amount: number = 1): boolean => {
    // No row yet after client load (e.g. timeout) — allow attempt; Edge Function returns 402 if no credits
    if (!state.isLoading && state.credits == null) {
      return true;
    }
    return (state.credits?.ai_tokens_balance ?? 0) >= amount;
  }, [state.credits, state.isLoading]);

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
    isSubLoading: state.isLoading,
  };
}
