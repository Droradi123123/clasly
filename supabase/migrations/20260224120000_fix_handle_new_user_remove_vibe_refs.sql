-- Fix: handle_new_user (trigger on auth.users) and handle_plan_change still referenced
-- monthly_vibe_credits and vibe_credits_balance. Replace with versions that only use ai_tokens.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
  free_plan_ai_tokens int;
BEGIN
  SELECT id, monthly_ai_tokens INTO free_plan_id, free_plan_ai_tokens
  FROM public.subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (
      name, description, price_monthly_usd, price_yearly_usd,
      max_slides, monthly_ai_tokens
    ) VALUES ('Free', 'For trying Clasly', 0, 0, 5, 50)
    RETURNING id, monthly_ai_tokens INTO free_plan_id, free_plan_ai_tokens;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (new.id, free_plan_id, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, ai_tokens_balance, last_refill_date)
  VALUES (new.id, COALESCE(free_plan_ai_tokens, 15), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_plan_ai_tokens int;
BEGIN
  IF old.plan_id IS DISTINCT FROM new.plan_id THEN
    SELECT monthly_ai_tokens INTO new_plan_ai_tokens
    FROM public.subscription_plans
    WHERE id = new.plan_id;

    UPDATE public.user_credits
    SET ai_tokens_balance = COALESCE(new_plan_ai_tokens, 0),
        ai_tokens_consumed = 0,
        last_refill_date = now(),
        updated_at = now()
    WHERE user_id = new.user_id;

    INSERT INTO public.credit_transactions (
      user_id, credit_type, transaction_type, amount, description
    ) VALUES (
      new.user_id, 'ai_tokens', 'refill',
      COALESCE(new_plan_ai_tokens, 0),
      'Plan changed - credits refilled'
    );
  END IF;
  RETURN new;
END;
$$;
