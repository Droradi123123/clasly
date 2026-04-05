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

**Student** (4 channels — down from 6 after optimization):
- `lecture-live-{id}` -- postgres_changes on `lectures` (slide index + status)
- `lecture-sync-{id}` -- broadcast: `slide_changed`, `cta_show`, `raffle_winner`, `emoji_reaction`, `game_active`
- `student-{studentId}` -- postgres_changes on `students` (points)
- `lecture-presence-{id}` -- presence (online tracking)

*Eliminated:* `reactions-{id}` merged into `lecture-sync`; `game-{id}` lazy-joined only when game starts (via `StudentGameControls`).

**Presenter** (5 channels — down from 6):
- `lecture-sync-{id}` -- broadcast: `response_changed`, `question_new`, `emoji_reaction`, `game_active`
- `students-{id}` -- postgres_changes on `students` (join events)
- `responses-{id}` -- postgres_changes on `responses` (all slides; stable, no churn per slide)
- `lecture-presence-{id}` -- presence (online count)
- `questions-{id}` -- postgres_changes on `questions`

*Eliminated:* `reactions-{id}` merged into `lecture-sync`; `responses-{id}-{slideIdx}` replaced with stable `responses-{id}` (no recreation per slide change).

## Connection recovery and cleanup

- Supabase client uses `reconnectAfterMs` with exponential backoff (500ms → 15s) for WebSocket drops.
- `eventsPerSecond` reduced to 10 (from 32) to lower server-side Realtime pressure.
- Both `Present` and `Student` call `removeAllChannels()` on unmount to prevent orphaned channels from consuming Realtime slots after navigation.

## Related: API timeouts and log interpretation

See [SUPABASE_TIMEOUTS_AND_LOGS.md](./SUPABASE_TIMEOUTS_AND_LOGS.md) for `57014` on `PATCH lectures`, Realtime replication errors, and WebSocket `101` health.
