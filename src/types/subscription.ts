import type { Tables } from "@/integrations/supabase/types";

export type SubscriptionPlan = Tables<"subscription_plans">;
export type UserSubscription = Tables<"user_subscriptions">;
export type UserCredits = Tables<"user_credits">;
export type CreditTransaction = Tables<"credit_transactions">;

export interface SubscriptionWithPlan extends UserSubscription {
  subscription_plans: SubscriptionPlan | null;
}

export interface SubscriptionState {
  subscription: SubscriptionWithPlan | null;
  credits: UserCredits | null;
  plan: SubscriptionPlan | null;
  isLoading: boolean;
  error: Error | null;
}

export interface SubscriptionHelpers {
  isFree: boolean;
  isStandard: boolean;
  isPro: boolean;
  canUse: (feature: FeatureKey) => boolean;
  hasAITokens: (amount?: number) => boolean;
  hasVibeCredits: (amount?: number) => boolean;
  maxSlides: number | null;
  aiTokensRemaining: number;
  vibeCreditsRemaining: number;
  planName: string;
}

export type FeatureKey =
  | "import"
  | "premium_themes"
  | "quiz_slides"
  | "timeline_slides"
  | "agree_disagree_slides"
  | "export_reports"
  | "advanced_analytics"
  | "custom_branding"
  | "api_access";

// Feature matrix - what each plan unlocks
export const PLAN_FEATURES: Record<string, FeatureKey[]> = {
  Free: [],
  Standard: ["quiz_slides", "timeline_slides", "agree_disagree_slides"],
  Pro: [
    "import",
    "premium_themes",
    "quiz_slides",
    "timeline_slides",
    "agree_disagree_slides",
    "export_reports",
    "advanced_analytics",
    "custom_branding",
    "api_access",
  ],
};

// Credit packs for top-up purchases
export interface CreditPack {
  id: string;
  name: string;
  ai_tokens: number;
  vibe_credits: number;
  price_usd: number;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "small",
    name: "Starter Pack",
    ai_tokens: 100,
    vibe_credits: 50,
    price_usd: 3,
  },
  {
    id: "medium",
    name: "Growth Pack",
    ai_tokens: 500,
    vibe_credits: 250,
    price_usd: 12,
    popular: true,
  },
  {
    id: "large",
    name: "Power Pack",
    ai_tokens: 2000,
    vibe_credits: 1000,
    price_usd: 40,
  },
];
