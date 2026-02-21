-- Update plan credits: Free 15 (signup), Standard 100/mo, Pro 250/mo
-- Free users get 15 one-time credits on signup

-- 1. Update handle_new_user_signup to give 15 credits
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
    VALUES (new.id, 15, 0);

    RETURN new;
END;
$function$;

-- 2. Plan monthly tokens: Free=0, Standard=100, Pro=250
UPDATE public.subscription_plans SET monthly_ai_tokens = 0 WHERE name = 'Free';
UPDATE public.subscription_plans SET monthly_ai_tokens = 100 WHERE name = 'Standard';
UPDATE public.subscription_plans SET monthly_ai_tokens = 250 WHERE name = 'Pro';
