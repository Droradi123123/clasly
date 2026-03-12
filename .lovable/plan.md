Master Prompt: Clasly PLG Implementation (2-Phase Execution)

🛑 CRITICAL CONTEXT - READ FIRST:

Database Status: The database layer is ALREADY DONE.

Do Not: Do not create SQL migrations. Do not create tables.

Existing Tables: subscription_plans (seeded with Free/Standard/Pro), user_subscriptions, user_credits, credit_transactions are already in Supabase with RLS policies enabled.

Goal: Your job is to build the Backend Logic (Edge Functions) and the Frontend UI/Enforcement to connect to this existing database.

Phase 1: Logic, Stripe & State Management

Goal: Connect the app to Stripe and manage the user's subscription state globally.

1. Supabase Edge Functions (Stripe Integration) Create the following TypeScript functions in supabase/functions/:

create-checkout-session:

Receives plan_id and interval ('month'/'year').

Creates a Stripe Checkout Session (mode: 'subscription').

Returns the checkout URL.

create-credits-checkout:

Receives pack_id (Small/Medium/Large).

Creates a Stripe Checkout Session (mode: 'payment') for one-time token top-ups.

stripe-webhook:

Listens for checkout.session.completed -> Insert/Update user_subscriptions.

Listens for invoice.paid -> Refill user_credits based on plan limits.

Listens for customer.subscription.updated -> Sync status.

2. Frontend State (Hooks & Context)

src/types/subscription.ts: Define interfaces matching the existing DB schema.

src/hooks/useSubscription.ts:

Fetch user_subscriptions (joined with plan) and user_credits.

Return helpers: isFree, isPro, isLoading, credits (object with ai/vibe balances), and checkCapabilty(featureKey).

src/contexts/SubscriptionContext.tsx:

Wrap the app.

Subscribe to Realtime changes on user_credits so the token balance updates instantly in the UI when changed in the DB.

Phase 2: UI Implementation & Feature Gating

Goal: Visualize the plans, block restricted features, and show upgrade prompts.

1. Pages & Management

src/pages/Pricing.tsx:

Redesign to show 3 columns (Free, Standard, Pro).

Fetch plan details from the subscription_plans table.

Add Monthly/Yearly toggle. Connect buttons to create-checkout-session.

src/pages/Billing.tsx (New):

Show current plan details and next billing date.

Show Credit Usage Bars (e.g., "AI Tokens: 450/500").

Add a "Top Up" section for buying extra credits (connects to create-credits-checkout).

src/components/billing/UpgradeModal.tsx:

A generic, beautiful modal triggered when a user hits a limit.

Shows "You've reached your limit" message + Plan Comparison + Upgrade Button.

2. Enforcing Limits (The "Gating")

Slide Limit (Editor.tsx):

In addSlide(): Check if (isFree && slides.length >= 5).

If true: Stop action, show UpgradeModal.

AI Generation (useConversationalBuilder.ts):

Check credits.ai_tokens > 0.

If 0: Show "Out of Credits" modal.

If > 0: Proceed and deduct optimistically.

Feature Locks:

Import: In ImportDialog, check plan features. If locked, show lock icon + upgrade CTA.

Premium Themes: In ThemeSelector, overlay a lock icon on premium themes for Free users.

3. Dashboard Polish

Add a badge in the Navbar: "Free Plan" or "Pro".

Add a "Credits Remaining: X" indicator visible in the Editor.