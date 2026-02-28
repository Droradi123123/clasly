-- Fix: "function gen_random_bytes(integer) does not exist" - trigger runs without
-- "extensions" in search_path. Generate referral code using only built-in functions.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
  ref_code text;
BEGIN
  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (
      name, description, price_monthly_usd, price_yearly_usd,
      max_slides, monthly_ai_tokens
    ) VALUES ('Free', 'For trying Clasly', 0, 0, 5, 50)
    RETURNING id INTO free_plan_id;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (new.id, free_plan_id, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, ai_tokens_balance, last_refill_date)
  VALUES (new.id, 15, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Referral code: 8 hex chars using only built-ins (no gen_random_bytes / pgcrypto)
  ref_code := substr(md5(random()::text || new.id::text || clock_timestamp()::text), 1, 8);
  INSERT INTO public.user_referral_codes (user_id, code)
  VALUES (new.id, ref_code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;
