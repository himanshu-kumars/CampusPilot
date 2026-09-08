-- CampusPilot Phase 5: mentor feedback on share links + push subscriptions.
--
-- Run after: 07_DATABASE_SCHEMA.sql, 002_phase2.sql, 003_phase3.sql, 004_phase4.sql.

/* ------------------------- Mentor feedback ------------------------- */

create table if not exists public.share_feedback (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists share_feedback_link_idx on public.share_feedback (share_link_id);

alter table public.share_feedback enable row level security;

-- Owners read/delete feedback on their own links. Inserts go through the
-- SECURITY DEFINER RPC below (token-checked), never direct anon writes.
drop policy if exists "Owners read own link feedback" on public.share_feedback;
create policy "Owners read own link feedback"
  on public.share_feedback for select
  using (
    share_link_id in (select id from public.share_links where user_id = auth.uid())
  );

drop policy if exists "Owners delete own link feedback" on public.share_feedback;
create policy "Owners delete own link feedback"
  on public.share_feedback for delete
  using (
    share_link_id in (select id from public.share_links where user_id = auth.uid())
  );

create or replace function public.submit_share_feedback(
  p_token text,
  p_author text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  if p_author is null or char_length(trim(p_author)) < 1 or char_length(p_author) > 60 then
    raise exception 'Author name must be 1–60 characters.';
  end if;
  if p_message is null or char_length(trim(p_message)) < 1 or char_length(p_message) > 1000 then
    raise exception 'Message must be 1–1000 characters.';
  end if;

  select id into v_link_id
  from public.share_links
  where token = p_token
    and (expires_at is null or expires_at > now());

  if v_link_id is null then
    raise exception 'Share link is invalid or expired.';
  end if;

  insert into public.share_feedback (share_link_id, author_name, message)
  values (v_link_id, trim(p_author), trim(p_message))
  returning id into v_link_id;

  return v_link_id;
end;
$$;

/* ----------------------- Push subscriptions ------------------------ */

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
