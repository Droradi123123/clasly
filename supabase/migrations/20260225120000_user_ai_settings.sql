-- user_ai_settings: per-user AI personalization (Pro/Standard only in UI)
CREATE TABLE IF NOT EXISTS public.user_ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  who_am_i TEXT,
  what_i_lecture TEXT,
  teaching_style TEXT,
  additional_context TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Users can view and update only their own row
CREATE POLICY "Users can view own ai settings"
  ON public.user_ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai settings"
  ON public.user_ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai settings"
  ON public.user_ai_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
