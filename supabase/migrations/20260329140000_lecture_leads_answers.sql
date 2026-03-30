-- Store full dynamic registration field values; keep email/name as denormalized copies for sorting/filtering.

ALTER TABLE public.lecture_leads
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.lecture_leads.answers IS
  'Per-field values keyed by webinar registration field id (from lecture.settings.webinarRegistration.fields).';

-- Replace RPC: optional answers JSON; allow empty email/name when answers carry data.
CREATE OR REPLACE FUNCTION public.insert_lecture_lead(
  p_lecture_id uuid,
  p_email text,
  p_name text,
  p_answers jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_name text;
  v_answers jsonb;
BEGIN
  v_email := trim(coalesce(p_email, ''));
  v_name := trim(coalesce(p_name, ''));
  v_answers := coalesce(nullif(p_answers, 'null'::jsonb), '{}'::jsonb);

  IF length(v_email) = 0 AND length(v_name) = 0 AND v_answers = '{}'::jsonb THEN
    RAISE EXCEPTION 'Provide at least one registration field'
      USING ERRCODE = '23502';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lectures WHERE id = p_lecture_id) THEN
    RAISE EXCEPTION 'Lecture not found'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lecture_leads (lecture_id, email, name, answers)
  VALUES (p_lecture_id, v_email, v_name, v_answers)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_lecture_lead(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_lecture_lead(uuid, text, text, jsonb) TO anon, authenticated;

COMMENT ON FUNCTION public.insert_lecture_lead(uuid, text, text, jsonb) IS
  'Webinar join: insert lead with optional structured answers; returns id.';

-- Drop old 3-arg overload if it exists (Postgres keeps both names unless dropped).
DROP FUNCTION IF EXISTS public.insert_lecture_lead(uuid, text, text);
