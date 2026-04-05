-- Edge Functions invoke this RPC with the service role JWT; ensure PostgREST can execute it.
GRANT EXECUTE ON FUNCTION public.atomic_consume_credits(UUID, INT, TEXT) TO service_role;
