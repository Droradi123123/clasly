-- =============================================================================
-- MANUAL SCHEMA SETUP - Run this in Supabase SQL Editor
-- Idempotent: safe to run multiple times (skips if already exists)
-- =============================================================================

-- 1. app_role enum (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. lectures: user_id column
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. subscription_plans: max_lectures column
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_lectures INTEGER DEFAULT 3;

-- 7. user_subscriptions: rename stripe -> paypal (if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.user_subscriptions RENAME COLUMN stripe_subscription_id TO paypal_subscription_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.user_subscriptions RENAME COLUMN stripe_customer_id TO paypal_payer_id;
  END IF;
END $$;

-- 8. user_credits: usage columns
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS ai_tokens_consumed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS slides_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS presentations_created INTEGER NOT NULL DEFAULT 0;

-- 9. lectures RLS policies
DROP POLICY IF EXISTS "Allow public insert to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public read access to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public update to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can view own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can insert own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can update own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can delete own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Students can view active lectures" ON public.lectures;
DROP POLICY IF EXISTS "Public can read active lectures" ON public.lectures;
DROP POLICY IF EXISTS "Anyone can read lectures for join and sync" ON public.lectures;

CREATE POLICY "Anyone can read lectures for join and sync" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Users can insert own lectures" ON public.lectures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lectures" ON public.lectures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lectures" ON public.lectures FOR DELETE USING (auth.uid() = user_id);

-- 10. user_credits RLS
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can view own credits or admin all" ON public.user_credits;
DROP POLICY IF EXISTS "Admins can update credits" ON public.user_credits;
DROP POLICY IF EXISTS "Admins can insert credits" ON public.user_credits;
CREATE POLICY "Users can view own credits or admin all" ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update credits" ON public.user_credits FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert credits" ON public.user_credits FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 11. user_subscriptions RLS
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription or admin all" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription or admin all" ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update subscriptions" ON public.user_subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fix signup: allow new user to insert own row on first signup
DROP POLICY IF EXISTS "Users can insert own credits on signup" ON public.user_credits;
CREATE POLICY "Users can insert own credits on signup" ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.user_credits uc WHERE uc.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own subscription on signup" ON public.user_subscriptions;
CREATE POLICY "Users can insert own subscription on signup" ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = auth.uid()));

-- 12. subscription_plans limits
UPDATE public.subscription_plans SET max_lectures = 3 WHERE name = 'Free';
UPDATE public.subscription_plans SET max_lectures = 10 WHERE name = 'Standard';
UPDATE public.subscription_plans SET max_lectures = NULL WHERE name = 'Pro';

-- 13. Realtime publication - ADD only if not already member (fixes "already member" error)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_credits') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;
END $$;

-- 14. responses RLS
DROP POLICY IF EXISTS "Allow public insert to responses" ON public.responses;
DROP POLICY IF EXISTS "Allow public read access to responses" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Lecture owners and admins can view responses" ON public.responses;
CREATE POLICY "Anyone can insert responses" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Lecture owners and admins can view responses" ON public.responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.lectures WHERE lectures.id = responses.lecture_id AND (lectures.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)))
    OR true
  );

-- 15. students RLS
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update to students" ON public.students;
DROP POLICY IF EXISTS "Anyone can join as student" ON public.students;
DROP POLICY IF EXISTS "Students visible for lectures" ON public.students;
DROP POLICY IF EXISTS "Students can update own or lecture owner" ON public.students;
CREATE POLICY "Anyone can join as student" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students visible for lectures" ON public.students FOR SELECT USING (true);
CREATE POLICY "Students can update own or lecture owner" ON public.students FOR UPDATE USING (true);

-- 16. questions RLS
DROP POLICY IF EXISTS "Anyone can submit questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can update questions" ON public.questions;
DROP POLICY IF EXISTS "Questions are readable by anyone" ON public.questions;
DROP POLICY IF EXISTS "Questions readable for lecture" ON public.questions;
DROP POLICY IF EXISTS "Lecture owners can update questions" ON public.questions;
CREATE POLICY "Anyone can submit questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Questions readable for lecture" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Lecture owners can update questions" ON public.questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.lectures WHERE lectures.id = questions.lecture_id AND (lectures.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))));

-- 16b. Remove vibe_credits (unused, causes confusion)
ALTER TABLE public.user_credits DROP COLUMN IF EXISTS vibe_credits_balance;
ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS monthly_vibe_credits;

-- 17. handle_new_user_signup - final version (15 credits, Free plan)
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

-- 18. Plan limits: Free=0/mo, Standard=100/mo, Pro=250/mo
UPDATE public.subscription_plans SET monthly_ai_tokens = 0 WHERE name = 'Free';
UPDATE public.subscription_plans SET monthly_ai_tokens = 100 WHERE name = 'Standard';
UPDATE public.subscription_plans SET monthly_ai_tokens = 250 WHERE name = 'Pro';

-- 19. builder_conversations table
CREATE TABLE IF NOT EXISTS public.builder_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  original_prompt TEXT,
  target_audience TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_builder_conversations_user_id ON public.builder_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_conversations_lecture_id ON public.builder_conversations(lecture_id);
CREATE INDEX IF NOT EXISTS idx_builder_conversations_created_at ON public.builder_conversations(created_at DESC);
ALTER TABLE public.builder_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Admins can view all builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can insert own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can update own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can delete own builder conversations" ON public.builder_conversations;

CREATE POLICY "Users can view own builder conversations" ON public.builder_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all builder conversations" ON public.builder_conversations FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users can insert own builder conversations" ON public.builder_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own builder conversations" ON public.builder_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own builder conversations" ON public.builder_conversations FOR DELETE USING (auth.uid() = user_id);

-- 20. update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $func$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $func$;

-- =============================================================================
-- DONE.
--
-- 1. Add yourself as admin (replace YOUR_USER_UUID with your user id from Auth):
--    INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR_USER_UUID', 'admin') ON CONFLICT (user_id, role) DO NOTHING;
--
-- 2. After this, avoid "supabase db push" (migrations are applied manually).
--    If you need to run db push later, consider excluding these migrations or
--    marking them applied in your project's migration history.
-- =============================================================================
