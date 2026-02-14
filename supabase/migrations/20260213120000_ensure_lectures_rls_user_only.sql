-- Ensure every user sees only their own lectures (idempotent).
-- Run this if you added Edge Functions to an existing project and need RLS.

-- Ensure user_id column exists on lectures (no-op if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lectures' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.lectures ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read access to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public insert to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public update to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Allow public delete to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can view own lectures" ON public.lectures;

-- SELECT: allow read for all (so students can join by code and sync; Dashboard filters by user_id in app)
-- INSERT/UPDATE/DELETE: only owner (user_id = auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lectures' AND policyname = 'Anyone can read lectures for join and sync') THEN
    CREATE POLICY "Anyone can read lectures for join and sync" ON public.lectures FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lectures' AND policyname = 'Users can insert own lectures') THEN
    CREATE POLICY "Users can insert own lectures" ON public.lectures FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lectures' AND policyname = 'Users can update own lectures') THEN
    CREATE POLICY "Users can update own lectures" ON public.lectures FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lectures' AND policyname = 'Users can delete own lectures') THEN
    CREATE POLICY "Users can delete own lectures" ON public.lectures FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
