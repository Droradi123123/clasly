-- Q&A questions for live lectures
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL,
  student_id UUID NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_lecture_id_created_at
  ON public.questions (lecture_id, created_at DESC);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Public-facing feature (students join without auth); allow read/submit/mark-answered.
CREATE POLICY "Questions are readable by anyone"
  ON public.questions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit questions"
  ON public.questions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update questions"
  ON public.questions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;