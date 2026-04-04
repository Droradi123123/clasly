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

### Current channel inventory (per live session)

**Student** (6 channels):
- `lecture-live-{id}` -- postgres_changes on `lectures` (slide index + status)
- `lecture-sync-{id}` -- broadcast: `slide_changed`, `cta_show`, `raffle_winner`
- `game-{id}` -- broadcast: `game_state`
- `student-{studentId}` -- postgres_changes on `students` (points)
- `lecture-presence-{id}` -- presence (online tracking)
- `reactions-{id}` -- broadcast: `emoji_reaction`

**Presenter** (6 channels):
- `lecture-sync-{id}` -- broadcast: `response_changed`, `question_new`
- `students-{id}` -- postgres_changes on `students` (join events)
- `responses-{id}-{slideIdx}` -- postgres_changes on `responses` (current slide)
- `lecture-presence-{id}` -- presence (online count)
- `reactions-{id}` -- broadcast: `emoji_reaction`
- `questions-{id}` -- postgres_changes on `questions`

**Merge candidates** (deferred until measured under load): `lecture-sync` + `reactions` share the same broadcast transport and could be combined; `game` is only used when a game is active and could be lazy-joined. No action taken yet -- measure WebSocket count in Supabase Realtime Inspector first.

## Related: API timeouts and log interpretation

See [SUPABASE_TIMEOUTS_AND_LOGS.md](./SUPABASE_TIMEOUTS_AND_LOGS.md) for `57014` on `PATCH lectures`, Realtime replication errors, and WebSocket `101` health.
