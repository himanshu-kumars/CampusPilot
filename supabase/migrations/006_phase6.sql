-- CampusPilot Phase 6: marketplace, fee tracker, feedback replies.
--
-- Run after: 07_DATABASE_SCHEMA.sql, 002_phase2.sql, 003_phase3.sql,
-- 004_phase4.sql, 005_phase5.sql.

/* --------------------------- Marketplace --------------------------- */

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text null check (char_length(description) <= 1000),
  price numeric(10, 2) not null default 0 check (price >= 0),
  category text not null default 'other'
    check (category in ('books', 'notes', 'electronics', 'furniture', 'services', 'tickets', 'other')),
  condition text null
    check (condition in ('new', 'like_new', 'good', 'fair')),
  contact text not null check (char_length(contact) between 1 and 120),
  status text not null default 'active'
    check (status in ('active', 'reserved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_user_idx on public.listings (user_id);

alter table public.listings enable row level security;

-- Any logged-in student can browse; only owners manage their rows.
drop policy if exists "Students browse listings" on public.listings;
create policy "Students browse listings"
  on public.listings for select
  to authenticated
  using (true);

drop policy if exists "Owners manage own listings" on public.listings;
create policy "Owners manage own listings"
  on public.listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* ----------------------------- Fee tracker ----------------------------- */

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date null,
  category text not null default 'other'
    check (category in ('tuition', 'hostel', 'mess', 'transport', 'exam', 'library', 'other')),
  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid')),
  notes text null check (char_length(notes) <= 1000),
  receipt_text text null check (char_length(receipt_text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fees_user_idx on public.fees (user_id);
create index if not exists fees_user_status_idx on public.fees (user_id, status);

alter table public.fees enable row level security;

drop policy if exists "Users manage own fees" on public.fees;
create policy "Users manage own fees"
  on public.fees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* --------------------------- Feedback replies --------------------------- */

alter table public.share_feedback
  add column if not exists reply text null check (char_length(reply) <= 1000),
  add column if not exists replied_at timestamptz null;

drop policy if exists "Owners reply on own link feedback" on public.share_feedback;
create policy "Owners reply on own link feedback"
  on public.share_feedback for update
  using (
    share_link_id in (select id from public.share_links where user_id = auth.uid())
  )
  with check (
    share_link_id in (select id from public.share_links where user_id = auth.uid())
  );

-- Public thread read for a valid token (mentors see notes + student replies).
create or replace function public.get_share_feedback(p_token text)
returns table (
  author_name text,
  message text,
  reply text,
  created_at timestamptz,
  replied_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  select id into v_link_id
  from public.share_links
  where token = p_token
    and (expires_at is null or expires_at > now());

  if v_link_id is null then
    raise exception 'Share link is invalid or expired.';
  end if;

  return query
  select f.author_name, f.message, f.reply, f.created_at, f.replied_at
  from public.share_feedback f
  where f.share_link_id = v_link_id
  order by f.created_at asc;
end;
$$;
