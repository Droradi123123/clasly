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
  maxSlides: number | null;
  aiTokensRemaining: number;
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
  Standard: ["import", "quiz_slides", "timeline_slides", "agree_disagree_slides"],
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

// Slide types locked for Free plan (2-3 best per category)
export const PREMIUM_SLIDE_TYPES: string[] = [
  "split_content", "timeline", "bar_chart",  // content
  "poll", "wordcloud", "agree_spectrum",      // interactive
  "quiz", "ranking", "guess_number",          // quiz
];

// Credit packs for top-up purchases – AI credits only (single credit type)
export interface CreditPack {
  id: string;
  name: string;
  ai_tokens: number;
  price_usd: number;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "small", name: "Starter Pack", ai_tokens: 100, price_usd: 3 },
  { id: "medium", name: "Growth Pack", ai_tokens: 500, price_usd: 12, popular: true },
  { id: "large", name: "Power Pack", ai_tokens: 2000, price_usd: 40 },
];
