-- Reliable join by code + Realtime postgres_changes for students (anon must pass SELECT RLS on lectures).
-- Fixes "lecture not found" when older DBs only had owner-only SELECT, or has_role(NULL) broke policy evaluation.

-- SECURITY DEFINER: join lookup bypasses RLS (code acts as capability)
CREATE OR REPLACE FUNCTION public.get_lecture_for_join(p_lecture_code text)
RETURNS SETOF public.lectures
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.lectures
  WHERE btrim(lecture_code::text) = btrim(p_lecture_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_lecture_for_join(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lecture_for_join(text) TO anon, authenticated;

-- Replace overlapping / restrictive SELECT policies with one permissive policy (OR semantics, but single policy avoids surprises)
DROP POLICY IF EXISTS "Allow public read access to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can view own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Students can view active lectures" ON public.lectures;
DROP POLICY IF EXISTS "Public can read active lectures" ON public.lectures;
DROP POLICY IF EXISTS "Anyone can read lectures for join and sync" ON public.lectures;
DROP POLICY IF EXISTS "lectures_select_for_join_and_realtime" ON public.lectures;

CREATE POLICY "lectures_select_for_join_and_realtime" ON public.lectures
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE remain owner-only (recreate if missing — idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lectures' AND policyname = 'Users can insert own lectures'
  ) THEN
    CREATE POLICY "Users can insert own lectures" ON public.lectures FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lectures' AND policyname = 'Users can update own lectures'
  ) THEN
    CREATE POLICY "Users can update own lectures" ON public.lectures FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lectures' AND policyname = 'Users can delete own lectures'
  ) THEN
    CREATE POLICY "Users can delete own lectures" ON public.lectures FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON FUNCTION public.get_lecture_for_join(text) IS 'Public join: fetch lecture row by 6-digit code; used when table SELECT is blocked.';
