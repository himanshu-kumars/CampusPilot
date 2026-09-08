-- CampusPilot Phase 3 tables
-- Run AFTER 002_phase2.sql in the Supabase SQL Editor.

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz default now(),
  check (end_time > start_time)
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  label text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  code text not null unique,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_id uuid not null references study_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references study_groups(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  title text not null,
  details text,
  due_date timestamptz,
  status text not null default 'pending' check (status in ('pending','completed')),
  completed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists timetable_user_day_idx on timetable_entries(user_id, day_of_week, start_time);
create index if not exists group_tasks_group_idx on group_tasks(group_id, status);

alter table timetable_entries enable row level security;
alter table share_links enable row level security;
alter table study_groups enable row level security;
alter table group_members enable row level security;
alter table group_tasks enable row level security;

create policy "timetable_owner_all" on timetable_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "share_links_owner_all" on share_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Groups are visible to owners and members.
create policy "study_groups_member_select" on study_groups
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from group_members m
      where m.group_id = study_groups.id and m.user_id = auth.uid()
    )
  );

create policy "study_groups_owner_insert" on study_groups
  for insert with check (auth.uid() = owner_id);

create policy "study_groups_owner_update" on study_groups
  for update using (auth.uid() = owner_id);

create policy "study_groups_owner_delete" on study_groups
  for delete using (auth.uid() = owner_id);

-- Members: read self or owner; join only via join_group(); leave self or owner removes.
create policy "group_members_select" on group_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from study_groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

create policy "group_members_delete" on group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from study_groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- Tasks: any group member (or owner) can read/create/update; creator or owner deletes.
create policy "group_tasks_member_select" on group_tasks
  for select using (
    exists (
      select 1 from group_members m
      where m.group_id = group_tasks.group_id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from study_groups g
      where g.id = group_tasks.group_id and g.owner_id = auth.uid()
    )
  );

create policy "group_tasks_member_insert" on group_tasks
  for insert with check (
    auth.uid() = created_by
    and (
      exists (
        select 1 from group_members m
        where m.group_id = group_tasks.group_id and m.user_id = auth.uid()
      )
      or exists (
        select 1 from study_groups g
        where g.id = group_tasks.group_id and g.owner_id = auth.uid()
      )
    )
  );

create policy "group_tasks_member_update" on group_tasks
  for update using (
    exists (
      select 1 from group_members m
      where m.group_id = group_tasks.group_id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from study_groups g
      where g.id = group_tasks.group_id and g.owner_id = auth.uid()
    )
  );

create policy "group_tasks_delete" on group_tasks
  for delete using (
    auth.uid() = created_by
    or exists (
      select 1 from study_groups g
      where g.id = group_tasks.group_id and g.owner_id = auth.uid()
    )
  );

-- Join a group with an invite code (code check enforced server-side).
create or replace function join_group(p_code text, p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  g_id uuid;
begin
  select id into g_id from study_groups where code = upper(trim(p_code));
  if g_id is null then
    raise exception 'Invalid invite code.';
  end if;
  insert into group_members (group_id, user_id, display_name)
  values (g_id, auth.uid(), left(trim(p_name), 80))
  on conflict (group_id, user_id) do nothing;
  return g_id;
end;
$$;

-- List members of a group the caller belongs to.
create or replace function list_group_members(p_group_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from group_members m where m.group_id = p_group_id and m.user_id = auth.uid()
  ) and not exists (
    select 1 from study_groups g where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    raise exception 'Not a member of this group.';
  end if;
  return query
    select m.user_id, m.display_name, m.joined_at
    from group_members m
    where m.group_id = p_group_id
    order by m.joined_at;
end;
$$;

-- Public mentor report for a valid, unexpired share token.
-- Returns a curated read-only snapshot (no notes, no AI chats, no credentials).
create or replace function get_share_report(p_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  link_row share_links%rowtype;
  result jsonb;
begin
  select * into link_row from share_links where token = p_token;
  if link_row.id is null then
    raise exception 'Not found';
  end if;
  if link_row.expires_at is not null and link_row.expires_at < now() then
    raise exception 'Expired';
  end if;
  select jsonb_build_object(
    'name', (select full_name from profiles where id = link_row.user_id),
    'label', link_row.label,
    'subjects', (
      select coalesce(jsonb_agg(
        jsonb_build_object('name', name, 'attended', attended, 'total', total, 'target', target_attendance)
        order by name
      ), '[]'::jsonb)
      from subjects where user_id = link_row.user_id
    ),
    'assignments', (
      select coalesce(jsonb_agg(
        jsonb_build_object('title', title, 'deadline', deadline, 'priority', priority, 'status', status)
        order by deadline
      ), '[]'::jsonb)
      from (select * from assignments where user_id = link_row.user_id and status <> 'completed' order by deadline limit 20) a
    ),
    'exams', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'date', exam_date,
          'prep', preparation_percent,
          'subject', (select name from subjects s where s.id = e.subject_id)
        )
        order by exam_date
      ), '[]'::jsonb)
      from (select * from exams where user_id = link_row.user_id order by exam_date limit 10) e
    )
  ) into result;
  return result;
end;
$$;
