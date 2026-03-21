-- Fix: "Database error saving new user" - RLS only allowed admins to insert
-- Allow new users to insert their own row on signup (trigger handle_new_user_signup)
-- Only when they don't already have a row (prevents abuse)

-- user_credits: allow insert for own user_id when no row exists yet
CREATE POLICY "Users can insert own credits on signup"
ON public.user_credits FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_credits uc WHERE uc.user_id = auth.uid())
);

-- user_subscriptions: allow insert for own user_id when no row exists yet
CREATE POLICY "Users can insert own subscription on signup"
ON public.user_subscriptions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = auth.uid())
);
