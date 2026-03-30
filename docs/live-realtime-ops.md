# Live lecture Realtime (Supabase) — operations

When students or presenters see flaky slide sync, disconnects, or the Supabase project shows **Realtime** as unhealthy, use this checklist. Application code uses polling and broadcast fallbacks, but infrastructure limits still matter.

## Supabase Dashboard

1. **Realtime** — Confirm Realtime is enabled for the project and review any status or incident banners for your region.
2. **Project settings → Database** — Check connection limits and whether the instance is under sustained load.
3. **Logs** — Inspect Realtime and API logs around the time of issues (errors, rate limits, timeouts).
4. **Usage / Billing** — Free-tier or low compute can throttle under many concurrent WebSocket connections or channels.

## Symptoms vs layers

- **DB** (postgres changes on `lectures`): used for durable slide index and `activity_started_at`. If this channel fails, the student UI shows the DB indicator as degraded; polling still updates the row on an interval.
- **Live** (broadcast `lecture-sync-{lectureId}`): fastest path for `slide_changed`. If only Live is green, DB replication may be slow; if only DB is green, broadcast may be blocked—check Realtime health and client network.

## Optional follow-up (engineering)

Reducing the number of simultaneous Realtime channels per student (e.g. merging broadcast-only flows into a single sync channel where safe) can lower WebSocket pressure. Any change needs regression testing across presenter, student, games, and reactions.
