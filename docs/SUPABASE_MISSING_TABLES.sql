-- =============================================================================
-- Budgieee: Community, Settings & Notifications Tables + RPCs
-- Run AFTER SUPABASE_SCHEMA.md (Blocks A–E). Block F (community_members
-- Minerva policy) applies to community_members created here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profiles: optional columns used by app (display_name, avatar_color)
-- -----------------------------------------------------------------------------
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_color text;

-- -----------------------------------------------------------------------------
-- 2. Communities
-- -----------------------------------------------------------------------------
create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  emoji text default '🏷️',
  kind text not null check (kind in ('city', 'university', 'private')),
  image_url text,
  is_public boolean not null default true,
  created_at timestamptz default now()
);

alter table communities enable row level security;

create policy "communities visible to authenticated"
on communities for select
to authenticated
using (true);

-- Inserts/updates/deletes happen via security-definer RPCs (e.g. ensure_personal_friends_membership)

-- -----------------------------------------------------------------------------
-- 3. Community members
-- -----------------------------------------------------------------------------
create table if not exists community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member', 'moderator')),
  joined_at timestamptz default now(),
  unique(community_id, user_id)
);

alter table community_members enable row level security;

create policy "community_members select"
on community_members for select
to authenticated
using (true);

create policy "community_members delete own"
on community_members for delete
to authenticated
using (user_id = auth.uid());

-- INSERT: private communities always; city/university only if email ends with @uni.minerva.edu
drop policy if exists "users can join communities" on community_members;
drop policy if exists "members insert" on community_members;
drop policy if exists "community_members insert" on community_members;
create policy "community_members insert minerva or private"
on community_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (select c.kind from public.communities c where c.id = community_id) = 'private'
    or (
      (select c.kind from public.communities c where c.id = community_id) in ('city', 'university')
      and (select lower(p.email) from public.profiles p where p.user_id = auth.uid()) like '%@uni.minerva.edu'
    )
  )
);

-- -----------------------------------------------------------------------------
-- 4. Community invites
-- -----------------------------------------------------------------------------
create table if not exists community_invites (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  invited_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

alter table community_invites enable row level security;

create policy "community_invites select"
on community_invites for select
to authenticated
using (
  invited_by = auth.uid()
  or invited_email = (select email from profiles where user_id = auth.uid())
);

create policy "community_invites insert"
on community_invites for insert
to authenticated
with check (invited_by = auth.uid());

create policy "community_invites update"
on community_invites for update
to authenticated
using (invited_email = (select email from profiles where user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Posts
-- -----------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  title text not null,
  body text not null,
  tag text,
  tag_color text,
  image_url text,
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "posts select members"
on posts for select
to authenticated
using (
  community_id in (
    select community_id from community_members where user_id = auth.uid()
  )
);

create policy "posts insert"
on posts for insert
to authenticated
with check (
  author_id = auth.uid()
  and community_id in (
    select community_id from community_members where user_id = auth.uid()
  )
);

create policy "posts update own"
on posts for update
to authenticated
using (author_id = auth.uid());

create policy "posts delete own"
on posts for delete
to authenticated
using (author_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. Post likes
-- -----------------------------------------------------------------------------
create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table post_likes enable row level security;

create policy "post_likes all"
on post_likes for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Post bookmarks
-- -----------------------------------------------------------------------------
create table if not exists post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table post_bookmarks enable row level security;

create policy "post_bookmarks all"
on post_bookmarks for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 8. Post comments
-- -----------------------------------------------------------------------------
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz default now()
);

alter table post_comments enable row level security;

create policy "post_comments select"
on post_comments for select
to authenticated
using (
  post_id in (
    select id from posts p
    where exists (
      select 1 from community_members cm
      where cm.community_id = p.community_id and cm.user_id = auth.uid()
    )
  )
);

create policy "post_comments insert"
on post_comments for insert
to authenticated
with check (author_id = auth.uid());

create policy "post_comments delete own"
on post_comments for delete
to authenticated
using (author_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 9. User community points (for get_user_points)
-- -----------------------------------------------------------------------------
create table if not exists user_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  updated_at timestamptz default now()
);

alter table user_points enable row level security;

create policy "user_points own"
on user_points for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. Profile settings (notifications)
-- -----------------------------------------------------------------------------
create table if not exists profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notif_community boolean not null default true,
  notif_trips boolean not null default true,
  notif_budget boolean not null default false,
  digest_hour integer not null default 18 check (digest_hour >= 0 and digest_hour <= 23),
  updated_at timestamptz default now()
);

alter table profile_settings enable row level security;

create policy "profile_settings own"
on profile_settings for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 11. Notification events (for cron + create_notification_event)
-- -----------------------------------------------------------------------------
create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'community_post', 'trip_added', 'split_expense', 'split_settle',
    'budget_alert', 'budget_digest'
  )),
  title text not null,
  body text not null,
  url text,
  priority text not null default 'normal' check (priority in ('high', 'normal')),
  created_at timestamptz default now(),
  delivered_at timestamptz
);

alter table notification_events enable row level security;

-- Only service role / RPCs should read/write (cron uses service role)
create policy "notification_events no direct access"
on notification_events for all
to authenticated
using (false)
with check (false);

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Ensure current user has a Personal Friends community and is a member
create or replace function ensure_personal_friends_membership()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := 'personal_friends_' || v_user_id::text;
  v_comm_id uuid;
begin
  if v_user_id is null then return; end if;
  select id into v_comm_id from communities where code = v_code and kind = 'private' limit 1;
  if v_comm_id is null then
    insert into communities (code, name, emoji, kind, is_public)
    values (v_code, 'Personal Friends', '👋', 'private', false)
    returning id into v_comm_id;
  end if;
  insert into community_members (community_id, user_id, role)
  values (v_comm_id, v_user_id, 'owner')
  on conflict (community_id, user_id) do nothing;
end;
$$;

-- Onboarding: ensure default memberships (e.g. Personal Friends)
create or replace function ensure_default_community_memberships()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform ensure_personal_friends_membership();
end;
$$;

-- My communities with member_count and my_role
create or replace function get_my_communities()
returns table (
  id uuid,
  name text,
  emoji text,
  kind text,
  image_url text,
  is_public boolean,
  member_count bigint,
  my_role text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.name,
    c.emoji,
    c.kind,
    c.image_url,
    c.is_public,
    (select count(*) from community_members cm where cm.community_id = c.id),
    (select cm.role from community_members cm where cm.community_id = c.id and cm.user_id = auth.uid() limit 1)
  from communities c
  inner join community_members cm on cm.community_id = c.id and cm.user_id = auth.uid()
  order by c.name;
$$;

-- Community feed: posts with author, like/comment counts, liked_by_me, bookmarked_by_me
create or replace function get_community_feed(p_community_id uuid)
returns table (
  post_id uuid,
  title text,
  body text,
  tag text,
  tag_color text,
  image_url text,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar_color text,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean,
  bookmarked_by_me boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with pr as (
    select p.user_id, coalesce(p.display_name, p.full_name, '') as name, coalesce(p.avatar_color, '#6b7280') as ac
    from profiles p
  )
  select
    p.id,
    p.title,
    p.body,
    p.tag,
    p.tag_color,
    p.image_url,
    p.created_at,
    p.author_id,
    coalesce(pr.name, ''),
    coalesce(pr.ac, '#6b7280'),
    (select count(*) from post_likes pl where pl.post_id = p.id),
    (select count(*) from post_comments pc where pc.post_id = p.id),
    exists (select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = auth.uid()),
    exists (select 1 from post_bookmarks pb where pb.post_id = p.id and pb.user_id = auth.uid())
  from posts p
  left join pr on pr.user_id = p.author_id
  where p.community_id = get_community_feed.p_community_id
    and exists (select 1 from community_members cm where cm.community_id = p.community_id and cm.user_id = auth.uid())
  order by p.created_at desc;
$$;

-- Saved deals: bookmarked posts with community info
create or replace function get_saved_deals()
returns table (
  post_id uuid,
  title text,
  body text,
  tag text,
  tag_color text,
  image_url text,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar_color text,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean,
  bookmarked_by_me boolean,
  community_id uuid,
  community_name text,
  community_emoji text
)
language sql
security definer
set search_path = public
stable
as $$
  with pr as (
    select p.user_id, coalesce(p.display_name, p.full_name, '') as name, coalesce(p.avatar_color, '#6b7280') as ac
    from profiles p
  )
  select
    p.id,
    p.title,
    p.body,
    p.tag,
    p.tag_color,
    p.image_url,
    p.created_at,
    p.author_id,
    coalesce(pr.name, ''),
    coalesce(pr.ac, '#6b7280'),
    (select count(*) from post_likes pl where pl.post_id = p.id),
    (select count(*) from post_comments pc where pc.post_id = p.id),
    exists (select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = auth.uid()),
    true,
    c.id,
    c.name,
    c.emoji
  from post_bookmarks pb
  join posts p on p.id = pb.post_id
  left join pr on pr.user_id = p.author_id
  join communities c on c.id = p.community_id
  where pb.user_id = auth.uid()
  order by pb.created_at desc;
$$;

-- Post comments with author info
create or replace function get_post_comments(p_post_id uuid)
returns table (
  comment_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar_color text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pc.id,
    pc.body,
    pc.created_at,
    pc.author_id,
    coalesce(p.display_name, p.full_name, ''),
    coalesce(p.avatar_color, '#6b7280')
  from post_comments pc
  join profiles p on p.user_id = pc.author_id
  where pc.post_id = p_post_id
    and exists (
      select 1 from posts p2
      join community_members cm on cm.community_id = p2.community_id and cm.user_id = auth.uid()
      where p2.id = pc.post_id
    )
  order by pc.created_at asc;
$$;

-- User community points
create or replace function get_user_points()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select points from user_points where user_id = auth.uid()), 0);
$$;

-- User settings (returns one row with defaults if no row exists)
create or replace function get_user_settings()
returns table (
  notif_community boolean,
  notif_trips boolean,
  notif_budget boolean,
  digest_hour integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(ps.notif_community, true),
    coalesce(ps.notif_trips, true),
    coalesce(ps.notif_budget, false),
    coalesce(ps.digest_hour, 18)
  from (select auth.uid() as uid) u
  left join profile_settings ps on ps.user_id = u.uid;
$$;

create or replace function update_user_settings(
  p_notif_community boolean default null,
  p_notif_trips boolean default null,
  p_notif_budget boolean default null,
  p_digest_hour integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then return; end if;
  insert into profile_settings (user_id, notif_community, notif_trips, notif_budget, digest_hour)
  values (
    v_user_id,
    coalesce(p_notif_community, true),
    coalesce(p_notif_trips, true),
    coalesce(p_notif_budget, false),
    coalesce(p_digest_hour, 18)
  )
  on conflict (user_id) do update set
    notif_community = coalesce(p_notif_community, profile_settings.notif_community),
    notif_trips = coalesce(p_notif_trips, profile_settings.notif_trips),
    notif_budget = coalesce(p_notif_budget, profile_settings.notif_budget),
    digest_hour = coalesce(p_digest_hour, profile_settings.digest_hour),
    updated_at = now();
end;
$$;

-- Notification: create event (called from API/cron)
create or replace function create_notification_event(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_url text default null,
  p_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into notification_events (user_id, type, title, body, url, priority)
  values (p_user_id, p_type, p_title, p_body, p_url, p_priority)
  returning id into v_id;
  return v_id;
end;
$$;

-- Pending notifications for cron (returns rows with user_email and settings for filtering)
create or replace function get_pending_notifications(p_priority text, p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  type text,
  title text,
  body text,
  url text,
  priority text,
  created_at timestamptz,
  notif_community boolean,
  notif_trips boolean,
  notif_budget boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ne.id,
    ne.user_id,
    p.email,
    ne.type,
    ne.title,
    ne.body,
    ne.url,
    ne.priority,
    ne.created_at,
    coalesce(ps.notif_community, true),
    coalesce(ps.notif_trips, true),
    coalesce(ps.notif_budget, false)
  from notification_events ne
  join profiles p on p.user_id = ne.user_id
  left join profile_settings ps on ps.user_id = ne.user_id
  where ne.delivered_at is null and ne.priority = p_priority
  order by ne.created_at asc
  limit p_limit;
$$;

-- Mark notifications as delivered
create or replace function mark_notifications_delivered(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update notification_events set delivered_at = now() where id = any(p_ids);
end;
$$;
