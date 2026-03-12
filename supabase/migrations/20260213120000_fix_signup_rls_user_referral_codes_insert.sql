-- Fix: "Database error saving new user" - handle_new_user inserts into user_referral_codes
-- but there was no RLS policy allowing INSERT. Allow new user to insert own row on signup only once.

DROP POLICY IF EXISTS "Users can insert own referral code on signup" ON public.user_referral_codes;
CREATE POLICY "Users can insert own referral code on signup"
ON public.user_referral_codes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_referral_codes urc WHERE urc.user_id = auth.uid())
);
