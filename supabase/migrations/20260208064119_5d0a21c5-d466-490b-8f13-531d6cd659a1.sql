
-- 1. Create admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. RLS for user_roles - users can see their own, admins can see all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add user_id to lectures table
ALTER TABLE public.lectures ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Add max_lectures to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN max_lectures INTEGER DEFAULT 3;

-- 6. Rename stripe columns to paypal in user_subscriptions
ALTER TABLE public.user_subscriptions RENAME COLUMN stripe_subscription_id TO paypal_subscription_id;
ALTER TABLE public.user_subscriptions RENAME COLUMN stripe_customer_id TO paypal_payer_id;

-- 7. Drop old RLS policies on lectures and create new ones
DROP POLICY IF EXISTS "Allow public insert to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public read access to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public update to lectures" ON public.lectures;

-- New lecture policies - users see only their own, admins see all
CREATE POLICY "Users can view own lectures"
ON public.lectures FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own lectures"
ON public.lectures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lectures"
ON public.lectures FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own lectures"
ON public.lectures FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 8. Add admin policies for user_credits management
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;

CREATE POLICY "Users can view own credits or admin all"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update credits"
ON public.user_credits FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert credits"
ON public.user_credits FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Add admin policies for user_subscriptions management
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view own subscription or admin all"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. Update Free plan max_lectures
UPDATE public.subscription_plans SET max_lectures = 3 WHERE name = 'Free';
UPDATE public.subscription_plans SET max_lectures = 10 WHERE name = 'Standard';
UPDATE public.subscription_plans SET max_lectures = NULL WHERE name = 'Pro'; -- unlimited

-- 11. Enable realtime for user_roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
