-- Add missing indexes critical for scale performance

-- Dashboard: every user lists their lectures by updated_at
CREATE INDEX IF NOT EXISTS idx_lectures_user_id ON public.lectures(user_id);
CREATE INDEX IF NOT EXISTS idx_lectures_user_updated ON public.lectures(user_id, updated_at DESC);

-- Live presentation: fetch responses per slide (hot path during sessions)
CREATE INDEX IF NOT EXISTS idx_responses_lecture_slide ON public.responses(lecture_id, slide_index);

-- Fix get_lecture_for_join: btrim() prevents the existing lecture_code index from being used
CREATE INDEX IF NOT EXISTS idx_lectures_code_trimmed ON public.lectures(btrim(lecture_code::text));

-- Atomic credit consumption: prevents double-spending race condition.
-- All edge functions should call this instead of read-then-write.
CREATE OR REPLACE FUNCTION public.atomic_consume_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT
) RETURNS INT AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE public.user_credits
  SET ai_tokens_balance = ai_tokens_balance - p_amount,
      ai_tokens_consumed = COALESCE(ai_tokens_consumed, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND ai_tokens_balance >= p_amount
  RETURNING ai_tokens_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  INSERT INTO public.credit_transactions (user_id, credit_type, transaction_type, amount, description)
  VALUES (p_user_id, 'ai_tokens', 'consume', -p_amount, p_description);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
