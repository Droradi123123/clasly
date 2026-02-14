-- 1. Add usage tracking columns to user_credits
ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS ai_tokens_consumed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS slides_created INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS presentations_created INTEGER NOT NULL DEFAULT 0;

-- 2. Fix RLS on lectures - students need to read active lectures by code
DROP POLICY IF EXISTS "Students can view active lectures" ON public.lectures;
DROP POLICY IF EXISTS "Public can read active lectures" ON public.lectures;

-- Students need to read lectures when joining via lecture_code
CREATE POLICY "Students can view active lectures"
ON public.lectures FOR SELECT
USING (
  (auth.uid() = user_id) -- Owner sees their own
  OR has_role(auth.uid(), 'admin') -- Admin sees all
  OR (status IN ('active', 'draft')) -- Students need to see for joining
);

-- Drop and recreate user view policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own lectures" ON public.lectures;