-- Product analytics: lightweight event stream (user-level funnel tracking)

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  lecture_id uuid references public.lectures(id) on delete set null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists product_events_user_created_idx
  on public.product_events (user_id, created_at desc);

create index if not exists product_events_event_created_idx
  on public.product_events (event, created_at desc);

alter table public.product_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_events'
      and policyname = 'Users can insert their own events'
  ) then
    create policy "Users can insert their own events"
      on public.product_events
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_events'
      and policyname = 'Users can read their own events'
  ) then
    create policy "Users can read their own events"
      on public.product_events
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

