-- Sync interactive question timer across presenter and students
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS activity_started_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.lectures.activity_started_at IS 'When the current participative slide timer started; NULL when not on an interactive slide or not live.';
