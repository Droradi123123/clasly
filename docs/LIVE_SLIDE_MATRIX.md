# Live slide matrix (presenter / students / Supabase)

This document tracks **expected behavior** per slide type for live sessions. Implementation references: [`getResolvedActivitySettings`](../src/types/slides.ts), [`getActivityPhaseState`](../src/lib/activityPhase.ts), [`buildLiveResultsPayload`](../src/lib/responseAggregation.ts).

## Category rules (product)

| Category | Timer | Live results on presenter | Correct answer visibility |
|----------|-------|---------------------------|---------------------------|
| **interactive** (poll, wordcloud, scale, sentiment_meter, agree_spectrum) | No (`hasTimer: false`) | Immediately | N/A (no graded correct answer) |
| **quiz** (quiz, poll_quiz, yesno, ranking, guess_number) | Yes, unless `duration === 0` | After timer ends or “End question” | After results phase |
| **content** | N/A | N/A | N/A |

Educator vs webinar: **same** slide logic; differences are branding/navigation only.

## Per slide type checklist

Use ✓ when verified in Editor + Present + Student + DB path.

| Slide type | Category | Editor activity UI | Present `showResults` / timer | Student submit + phases | `buildLiveResultsPayload` |
|------------|----------|--------------------|--------------------------------|---------------------------|----------------------------|
| title | content | — | — | — | — |
| content | content | — | — | — | — |
| image | content | — | — | — | — |
| split_content | content | — | — | — | — |
| before_after | content | — | — | — | — |
| bullet_points | content | — | — | — | — |
| timeline | content | — | — | — | — |
| bar_chart | content | — | — | — | — |
| poll | interactive | `ensureActivitySettings` | Live | Submit anytime | `poll` |
| wordcloud | interactive | same | Live | Submit | `wordcloud` |
| scale | interactive | same | Live | Submit | `scale` |
| sentiment_meter | interactive | same | Live | Submit | `sentiment_meter` |
| agree_spectrum | interactive | same | Live | Submit | `agree_spectrum` |
| quiz | quiz | Timer + points | Gated by phase | Voting / time-up / results | `quiz` |
| poll_quiz | quiz | same | Gated | same | `poll_quiz` |
| yesno | quiz | same | Gated | same | `yesno` |
| ranking | quiz | same | Gated | same | `ranking` |
| guess_number | quiz | same | Gated | same | `guess_number` |

## Data path and perceived latency (present)

Approximate upper bounds (normal conditions):

| Layer | Notes |
|-------|--------|
| Postgres realtime (`responses`, `lectures`) | Typically sub-second |
| `subscribeResponses` debounce | ~120 ms batching ([`lectureService`](../src/lib/lectureService.ts)) |
| Response poll backup ([`Present.tsx`](../src/pages/Present.tsx)) | 1200 ms interval when on interactive/quiz slide |
| Student list debounce | ~400 ms when many join ([`subscribeStudents`](../src/lib/lectureService.ts)) |
| Broadcast `slide_changed` | Fastest path for slide index + `activity_started_at` |

Phase alignment uses [`getActivityPhaseState`](../src/lib/activityPhase.ts): presenter uses `clockOffsetMs: 0`; students pass skew from `slide_changed` so elapsed time matches the presenter clock.

## Related docs

- [Manual QA protocol](./MANUAL_LIVE_QA.md)
- [Optional E2E / load notes](./E2E_LIVE_OPTIONAL.md)
