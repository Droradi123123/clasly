-- Webinar lead capture: direct INSERT ... SELECT from the client fails because
-- lecture_leads SELECT RLS only allows lecture owners — anon cannot read the
-- inserted row back. This SECURITY DEFINER RPC inserts and returns the new id.

CREATE OR REPLACE FUNCTION public.insert_lecture_lead(
  p_lecture_id uuid,
  p_email text,
  p_name text
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
BEGIN
  v_email := trim(coalesce(p_email, ''));
  v_name := trim(coalesce(p_name, ''));
  IF length(v_email) = 0 OR length(v_name) = 0 THEN
    RAISE EXCEPTION 'Email and name are required'
      USING ERRCODE = '23502';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lectures WHERE id = p_lecture_id) THEN
    RAISE EXCEPTION 'Lecture not found'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lecture_leads (lecture_id, email, name)
  VALUES (p_lecture_id, v_email, v_name)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_lecture_lead(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_lecture_lead(uuid, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.insert_lecture_lead(uuid, text, text) IS
  'Webinar join: anonymous insert for lecture_leads; returns id (bypasses SELECT RLS on RETURNING).';
