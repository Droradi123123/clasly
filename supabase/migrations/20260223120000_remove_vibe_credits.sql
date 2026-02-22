-- Remove vibe_credits_balance from user_credits (unused, causes confusion)
ALTER TABLE public.user_credits DROP COLUMN IF EXISTS vibe_credits_balance;

-- Remove monthly_vibe_credits from subscription_plans
ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS monthly_vibe_credits;

-- Update handle_new_user_signup to insert only ai_tokens_balance
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;
  INSERT INTO public.user_subscriptions (user_id, plan_id, status) VALUES (new.id, free_plan_id, 'active');
  INSERT INTO public.user_credits (user_id, ai_tokens_balance) VALUES (new.id, 15);
  RETURN new;
END;
$func$;
