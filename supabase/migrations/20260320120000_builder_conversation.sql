-- Chat builder: persist all turns (initial prompt, follow-ups, assistant replies)
CREATE TABLE IF NOT EXISTS public.builder_conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_conversation_user_session_created
  ON public.builder_conversation (user_id, session_id, created_at DESC);

ALTER TABLE public.builder_conversation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "builder_conversation_select_own" ON public.builder_conversation;
DROP POLICY IF EXISTS "builder_conversation_insert_own" ON public.builder_conversation;

CREATE POLICY "builder_conversation_select_own"
  ON public.builder_conversation FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "builder_conversation_insert_own"
  ON public.builder_conversation FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.builder_conversation IS 'AI builder chat log: one row per message; group by session_id';
