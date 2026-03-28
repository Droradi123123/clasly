-- Batched-friendly response submit: single transaction (insert + points) with advisory lock per lecture+slide
-- to reduce lock contention when many students vote at once.

CREATE OR REPLACE FUNCTION public.submit_student_response(
  p_lecture_id uuid,
  p_student_id uuid,
  p_slide_index integer,
  p_response_data jsonb,
  p_is_correct boolean DEFAULT NULL,
  p_points_earned integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_points integer;
BEGIN
  v_points := COALESCE(p_points_earned, 0);

  PERFORM pg_advisory_xact_lock(
    hashtext(p_lecture_id::text || ':' || p_slide_index::text)::bigint
  );

  INSERT INTO public.responses (
    lecture_id,
    student_id,
    slide_index,
    response_data,
    is_correct,
    points_earned
  )
  VALUES (
    p_lecture_id,
    p_student_id,
    p_slide_index,
    p_response_data,
    p_is_correct,
    v_points
  )
  RETURNING id INTO v_id;

  IF v_points > 0 THEN
    UPDATE public.students
    SET points = COALESCE(points, 0) + v_points
    WHERE id = p_student_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_student_response(uuid, uuid, integer, jsonb, boolean, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_student_response(uuid, uuid, integer, jsonb, boolean, integer) TO authenticated;
