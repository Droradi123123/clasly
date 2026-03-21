-- Ensure builder_conversations table exists and RLS policies work
-- Fixes: table might not exist; has_role('admin') may need explicit cast to app_role

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

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Admins can view all builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can insert own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can update own builder conversations" ON public.builder_conversations;
DROP POLICY IF EXISTS "Users can delete own builder conversations" ON public.builder_conversations;

-- Recreate policies (with explicit app_role cast for admin policy)
CREATE POLICY "Users can view own builder conversations"
ON public.builder_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all builder conversations"
ON public.builder_conversations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert own builder conversations"
ON public.builder_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own builder conversations"
ON public.builder_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own builder conversations"
ON public.builder_conversations FOR DELETE
USING (auth.uid() = user_id);
