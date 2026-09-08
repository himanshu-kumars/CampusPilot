-- CampusPilot Phase 4: Internship tracker.
--
-- NOTE on XP: Phase 4 XP/levels/badges are DERIVED from the existing
-- `activity_events` log (see lib/xp.ts) — no new table needed, and past
-- activity counts retroactively and honestly.
--
-- Run after: 07_DATABASE_SCHEMA.sql, 002_phase2.sql, 003_phase3.sql.

create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null check (char_length(company) between 1 and 120),
  role text not null check (char_length(role) between 1 and 120),
  status text not null default 'wishlist'
    check (status in ('wishlist', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected')),
  deadline date null,
  link text null check (char_length(link) <= 500),
  location text null check (char_length(location) <= 120),
  stipend text null check (char_length(stipend) <= 60),
  notes text null check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists internships_user_id_idx on public.internships (user_id);
create index if not exists internships_user_status_idx on public.internships (user_id, status);

alter table public.internships enable row level security;

drop policy if exists "Users manage own internships" on public.internships;
create policy "Users manage own internships"
  on public.internships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
