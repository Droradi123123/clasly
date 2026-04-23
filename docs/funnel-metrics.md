## Clasly funnel metrics (DB-backed)

These queries are meant to answer:

- **Signup → Create lecture** (`public.lectures`)
- **Create → Present** (`public.lectures.status` transitions to `active/ended`)
- **Present → Engagement** (`public.students`, `public.responses`)
- **Paying** (`public.user_subscriptions` + `public.subscription_plans`)

### Saved DB views (recommended)

Created in Supabase as:

- `analytics.user_funnel` — one row per user with first timestamps for each milestone
- `analytics.funnel_summary` — a single row with totals + percentages

Query:

```sql
select * from analytics.funnel_summary;
```

### Useful drilldowns

#### Users who created but never presented

```sql
select user_id, signed_up_at, first_lecture_at, lectures_count
from analytics.user_funnel
where first_lecture_at is not null and first_present_at is null
order by first_lecture_at desc;
```

#### Time to first lecture / first present

```sql
select
  percentile_cont(0.5) within group (order by (first_lecture_at - signed_up_at)) as p50_to_create,
  percentile_cont(0.5) within group (order by (first_present_at - signed_up_at)) as p50_to_present
from analytics.user_funnel
where first_lecture_at is not null and first_present_at is not null;
```

#### Retention proxy: created a second lecture later

```sql
with per_user as (
  select user_id,
         min(created_at) as first_at,
         max(created_at) as last_at,
         count(*) as lectures
  from public.lectures
  where user_id is not null
  group by user_id
)
select
  count(*) as creators,
  count(*) filter (where lectures >= 2) as creators_2plus,
  round(100.0 * count(*) filter (where lectures >= 2) / nullif(count(*),0), 1) as pct_2plus
from per_user;
```

