# Manual live QA (educator + webinar)

Run the same flow for **lecture_mode = education** and **lecture_mode = webinar** (create two test decks or duplicate).

## Setup

- One presenter machine (Present).
- Two or three student phones (or tabs) on `/student/:code?studentId=…`.
- Optional: throttle network in DevTools to simulate slow mobile.

## Per-session checklist

1. **Start lecture** from editor → Present.
2. For **each participative slide type** in your test deck:
   - Navigate to the slide; confirm students see the correct input (options, word cloud, scale, etc.).
   - **Interactive**: answers should update on presenter **without** waiting for a countdown end.
   - **Quiz**: during countdown, presenter should **not** show full breakdown/correct answer until time ends or **End question**.
   - Submit from each phone; presenter counts and bars update (allow ~1–2 s for debounce/poll).
3. **End question** on a quiz slide mid-timer; all devices should move to results phase together.
4. **Long option text**: use a 2–3 line option string; presenter view should show full text (no harmful truncation).

## Supabase stability checks (add to each session)

5. **Editor save**: open browser console Network tab; save a 10+ slide deck. Confirm no `500` responses on `PATCH /rest/v1/lectures`. If a 500 appears, check that the retry succeeded (console log `[lectureService]`).
6. **Rapid saves**: change theme 3 times quickly, then Cmd+S. Confirm saves serialize (no overlapping PATCH requests in Network tab).
7. **ConversationalBuilder**: send two chat edits in quick succession; confirm draft sync fires once (~2.2s debounce) rather than twice.
8. **Present slide navigation**: advance 5 slides rapidly. Confirm no `500` errors in console; broadcast reaches student within ~1s.
9. **Student join under load** (optional): open 5+ student tabs joining the same code simultaneously. Confirm all join successfully (retry handles transient 500/timeout).

## Success criteria

- Phase (voting vs results) matches between Present and phones.
- No clipped critical labels on Present for poll/quiz/ranking bars.
- No persistent desync of `activity_started_at` after navigation (if desync, check Supabase Realtime and console).
- No unrecovered `500` errors on `PATCH lectures` during normal usage (retries should mask transient timeouts).
- Supabase Logs (API tab) shows no sustained `57014` errors after the session.
