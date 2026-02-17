-- PLG: Free tier 10 credits on signup (one-time), no monthly refill. Standard 50/mo, Pro 150/mo.

-- 1. New users get 10 AI credits (one-time), 0 vibe
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;

    INSERT INTO public.user_subscriptions (user_id, plan_id, status)
    VALUES (new.id, free_plan_id, 'active');

    INSERT INTO public.user_credits (user_id, ai_tokens_balance, vibe_credits_balance)
    VALUES (new.id, 10, 0);

    RETURN new;
END;
$function$;

-- 2. Plan limits: Free = 0 monthly refill, Standard = 50, Pro = 150
UPDATE public.subscription_plans SET monthly_ai_tokens = 0 WHERE name = 'Free';
UPDATE public.subscription_plans SET monthly_ai_tokens = 50 WHERE name = 'Standard';
UPDATE public.subscription_plans SET monthly_ai_tokens = 150 WHERE name = 'Pro';
