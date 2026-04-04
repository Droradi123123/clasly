# Optional automated checks (live flow)

Not required for production, but useful for regression:

1. **Playwright** (if added to the repo): open Present + Student, join with two contexts, assert response count on presenter after submit.
2. **Load**: avoid hammering Supabase anon endpoints; use staging project and rate limits.

The repository does not ship a Playwright suite by default; add `tests/e2e/` and CI when ready.
