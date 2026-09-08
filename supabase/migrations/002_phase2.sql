-- CampusPilot Phase 2 tables
-- Run AFTER 07_DATABASE_SCHEMA.sql in the Supabase SQL Editor.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  file_name text,
  content_text text not null,
  summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists practice_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid references exams(id) on delete set null,
  note_id uuid references notes(id) on delete set null,
  title text not null,
  difficulty text not null default 'mixed' check (difficulty in ('easy','medium','hard','mixed')),
  questions jsonb not null,
  best_score integer,
  attempts integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists viva_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid references exams(id) on delete set null,
  topic text not null,
  transcript jsonb not null default '[]'::jsonb,
  score integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notification_dismissals (
  user_id uuid not null references profiles(id) on delete cascade,
  alert_key text not null,
  dismissed_at timestamptz default now(),
  primary key (user_id, alert_key)
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  label text not null,
  created_at timestamptz default now()
);

create index if not exists activity_events_user_time_idx
  on activity_events(user_id, created_at desc);

alter table notes enable row level security;
alter table practice_sets enable row level security;
alter table viva_sessions enable row level security;
alter table notification_dismissals enable row level security;
alter table activity_events enable row level security;

create policy "notes_owner_all" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "practice_sets_owner_all" on practice_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "viva_sessions_owner_all" on viva_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_dismissals_owner_all" on notification_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity_events_owner_all" on activity_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
