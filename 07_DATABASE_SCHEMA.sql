-- CampusPilot MVP Database Schema
-- Run in Supabase SQL Editor after creating a project.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  college text,
  semester text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  target_attendance integer not null default 75 check (target_attendance between 1 and 100),
  attended integer not null default 0 check (attended >= 0),
  total integer not null default 0 check (total >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (attended <= total)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz not null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  exam_date timestamptz not null,
  preparation_percent integer not null default 0 check (preparation_percent between 0 and 100),
  syllabus text,
  weak_topics text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  input_snapshot jsonb not null,
  plan jsonb not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table assignments enable row level security;
alter table exams enable row level security;
alter table study_plans enable row level security;

create policy "profiles_owner_select" on profiles
for select using (auth.uid() = id);

create policy "profiles_owner_insert" on profiles
for insert with check (auth.uid() = id);

create policy "profiles_owner_update" on profiles
for update using (auth.uid() = id);

create policy "subjects_owner_all" on subjects
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assignments_owner_all" on assignments
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "exams_owner_all" on exams
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "study_plans_owner_all" on study_plans
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);
