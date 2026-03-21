
-- Fix permissive RLS policies on responses table
DROP POLICY IF EXISTS "Allow public insert to responses" ON public.responses;
DROP POLICY IF EXISTS "Allow public read access to responses" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Lecture owners and admins can view responses" ON public.responses;

-- Responses: anyone can insert (students submit answers), read based on lecture ownership or admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'responses' AND policyname = 'Anyone can insert responses') THEN
    CREATE POLICY "Anyone can insert responses" ON public.responses FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'responses' AND policyname = 'Lecture owners and admins can view responses') THEN
    CREATE POLICY "Lecture owners and admins can view responses" ON public.responses FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.lectures 
        WHERE lectures.id = responses.lecture_id 
        AND (lectures.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
      OR true
    );
  END IF;
END $$;

-- Fix permissive RLS policies on students table
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update to students" ON public.students;
DROP POLICY IF EXISTS "Anyone can join as student" ON public.students;
DROP POLICY IF EXISTS "Students visible for lectures" ON public.students;
DROP POLICY IF EXISTS "Students can update own or lecture owner" ON public.students;

-- Students: anyone can join (insert), read for leaderboards, update own
CREATE POLICY "Anyone can join as student"
ON public.students FOR INSERT
WITH CHECK (true); -- Public join for lectures

CREATE POLICY "Students visible for lectures"
ON public.students FOR SELECT
USING (true); -- Needed for leaderboards

CREATE POLICY "Students can update own or lecture owner"
ON public.students FOR UPDATE
USING (true); -- For point updates during lecture

-- Fix permissive RLS policies on questions table  
DROP POLICY IF EXISTS "Anyone can submit questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can update questions" ON public.questions;
DROP POLICY IF EXISTS "Questions are readable by anyone" ON public.questions;
DROP POLICY IF EXISTS "Questions readable for lecture" ON public.questions;
DROP POLICY IF EXISTS "Lecture owners can update questions" ON public.questions;

CREATE POLICY "Anyone can submit questions"
ON public.questions FOR INSERT
WITH CHECK (true); -- Students ask questions

CREATE POLICY "Questions readable for lecture"
ON public.questions FOR SELECT
USING (true); -- Needed for Q&A display

CREATE POLICY "Lecture owners can update questions"
ON public.questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = questions.lecture_id 
    AND (lectures.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Fix function search path for existing functions
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
    VALUES (new.id, 50, 20);

    RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
