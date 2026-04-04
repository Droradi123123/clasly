# Supabase: timeouts, logs, and what the app can do

This note ties **production logs** to **client behavior** and **dashboard actions**. It does not replace Supabase status pages or support.

## PATCH `lectures` returns 500 with `PostgREST; error=57014`

PostgreSQL **`57014`** means the statement was **canceled** (often **statement timeout** or admin cancel). Your API logs showed **multi-second** `origin_time` (9-40s) before failure -- the work (updating a large `slides` JSONB row, triggers, RLS, replication) exceeded limits under load.

**App-side (Clasly) -- implemented:**

- [`updateLecture`](../src/lib/lectureService.ts) treats `57014`, `57P01`, and timeout-like messages as **retryable** with up to 4 retries and exponential backoff (base 600ms).
- Concurrent `updateLecture` calls for the same lecture are **serialized** (no parallel PATCHes racing).
- Editor `saveToDatabase` skips sending `slides` in the PATCH when only settings changed (compares JSON hash).
- ConversationalBuilder draft sync debounce: 2200ms (avoids rapid-fire writes during chat).

**Platform-side:**

- Supabase **compute** size: small instances time out sooner on heavy JSON writes. **Action:** check compute tier in Dashboard -> Project Settings -> Database and upgrade if CPU regularly exceeds 70% during live sessions.
- **Collation mismatch** warning: run in SQL Editor:

```sql
ALTER DATABASE postgres REFRESH COLLATION VERSION;
```

Only safe when the project is not under heavy load; consider off-peak or maintenance window. This resolves the `database has a collation version mismatch` warning from logs.

- **Statement timeout:** Supabase hosted Postgres has a default statement timeout. If large JSONB updates consistently time out, consider increasing via Dashboard -> Database -> Extensions or a support request.

## Realtime: `ErrorOnRpcCall` / `PoolingReplicationError` / `query_canceled`

These come from **Supabase Realtime** services (Elixir), not from your Vite app. They often appear during **replication slot** work, **CDC**, or **cross-region** RPC. Transient errors are normal at scale; sustained errors warrant checking **Realtime** health and **project region** in the dashboard.

The web client already uses **broadcast + postgres_changes + polling** fallbacks ([`live-realtime-ops.md`](live-realtime-ops.md)).

## WebSocket `101` to `/realtime/v1/websocket`

A **101 Switching Protocols** response means the **Realtime WebSocket upgrade succeeded**. This is healthy.

## Recommended checklist when users report "Supabase crashes"

1. Correlate **API logs** (PATCH/POST) with **57014** and response times.
2. Check **Database** CPU and **connection** usage in the Supabase dashboard.
3. Confirm **statement_timeout** (default on hosted Postgres) vs deck size / concurrent editors.
4. Review **Realtime** incidents for the project region.
5. If collation warning present: run `ALTER DATABASE postgres REFRESH COLLATION VERSION;` (off-peak).
6. Compare API error rate before/after code changes using Supabase Logs -> API tab (filter `status_code >= 500`).
