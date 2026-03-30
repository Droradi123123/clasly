-- Idempotent: ensure product column + webinar plan rows (no reliance on optional columns like features).
-- Safe if 20260428120000 failed partway or omitted webinar rows.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'education';

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_product_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_product_check CHECK (product IN ('education', 'webinar'));

UPDATE public.subscription_plans
SET product = 'education'
WHERE product IS NULL OR btrim(product) = '';

INSERT INTO public.subscription_plans (
  name,
  price_monthly_usd,
  price_yearly_usd,
  max_slides,
  max_lectures,
  monthly_ai_tokens,
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
