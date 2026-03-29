-- Two product lines: education (For Educator) vs webinar (For Webinar), separate paid tiers (webinar ~2x price).

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'education';

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_product_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_product_check CHECK (product IN ('education', 'webinar'));

UPDATE public.subscription_plans SET product = 'education' WHERE product IS NULL OR product = '';

-- Webinar tier rows (double monthly/yearly price vs education; same limits/tokens per tier name)
INSERT INTO public.subscription_plans (
  name,
  price_monthly_usd,
  price_yearly_usd,
  max_slides,
  max_lectures,
  monthly_ai_tokens,
  features,
  product
)
SELECT
  CASE sp.name
    WHEN 'Free' THEN 'Webinar Free'
    WHEN 'Standard' THEN 'Webinar Standard'
    WHEN 'Pro' THEN 'Webinar Pro'
    ELSE sp.name || ' (Webinar)'
  END,
  CASE WHEN sp.price_monthly_usd = 0 THEN 0 ELSE sp.price_monthly_usd * 2 END,
  CASE WHEN sp.price_yearly_usd = 0 THEN 0 ELSE sp.price_yearly_usd * 2 END,
  sp.max_slides,
  sp.max_lectures,
  sp.monthly_ai_tokens,
  sp.features,
  'webinar'
FROM public.subscription_plans sp
WHERE sp.product = 'education'
  AND sp.name IN ('Free', 'Standard', 'Pro')
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_plans w
    WHERE w.product = 'webinar'
      AND w.name =
        CASE sp.name
          WHEN 'Free' THEN 'Webinar Free'
          WHEN 'Standard' THEN 'Webinar Standard'
          WHEN 'Pro' THEN 'Webinar Pro'
        END
  );

-- New signups: always attach education Free (not webinar product).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE name = 'Free'
    AND product = 'education'
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (
      name, price_monthly_usd, price_yearly_usd,
      max_slides, monthly_ai_tokens, product
    ) VALUES ('Free', 0, 0, 5, 50, 'education')
    RETURNING id INTO free_plan_id;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (new.id, free_plan_id, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, ai_tokens_balance, last_refill_date)
  VALUES (new.id, 15, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;
