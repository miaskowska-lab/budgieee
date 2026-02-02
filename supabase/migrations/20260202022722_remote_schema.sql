drop extension if exists "pg_net";


  create table "public"."budget_categories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "month" date not null,
    "name" text not null,
    "emoji" text,
    "color" text default '#3b82f6'::text,
    "limit_amount" numeric not null default 0,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."budget_categories" enable row level security;


  create table "public"."budget_expenses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "category_id" uuid,
    "month" date not null,
    "title" text not null,
    "amount" numeric not null,
    "note" text,
    "occurred_at" date not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."budget_expenses" enable row level security;


  create table "public"."budgets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "month" date not null,
    "total_budget" numeric not null default 0,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."budgets" enable row level security;


  create table "public"."communities" (
    "id" uuid not null default gen_random_uuid(),
    "code" text,
    "name" text not null,
    "emoji" text,
    "kind" text not null,
    "image_url" text,
    "created_at" timestamp without time zone default now(),
    "owner_id" uuid
      );


alter table "public"."communities" enable row level security;


  create table "public"."community_invites" (
    "id" uuid not null default gen_random_uuid(),
    "community_id" uuid not null,
    "invited_by" uuid not null,
    "invited_email" text not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."community_invites" enable row level security;


  create table "public"."community_members" (
    "id" uuid not null default gen_random_uuid(),
    "community_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'member'::text,
    "joined_at" timestamp without time zone default now()
      );


alter table "public"."community_members" enable row level security;


  create table "public"."community_post_bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "post_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."community_post_bookmarks" enable row level security;


  create table "public"."community_post_comments" (
    "id" uuid not null default gen_random_uuid(),
    "post_id" uuid not null,
    "author_id" uuid not null,
    "body" text not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."community_post_comments" enable row level security;


  create table "public"."community_post_likes" (
    "id" uuid not null default gen_random_uuid(),
    "post_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."community_post_likes" enable row level security;


  create table "public"."community_posts" (
    "id" uuid not null default gen_random_uuid(),
    "community_id" uuid not null,
    "author_id" uuid not null,
    "title" text not null,
    "body" text not null,
    "tag" text,
    "tag_color" text,
    "image_url" text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."community_posts" enable row level security;


  create table "public"."expense_splits" (
    "id" uuid not null default gen_random_uuid(),
    "expense_id" uuid not null,
    "user_id" uuid not null,
    "share" numeric not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."expense_splits" enable row level security;


  create table "public"."expenses" (
    "id" uuid not null default gen_random_uuid(),
    "description" text not null,
    "amount" numeric not null,
    "currency" text default 'USD'::text,
    "paid_by" uuid not null,
    "group_id" uuid,
    "created_by" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."friendships" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "friend_id" uuid not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."friendships" enable row level security;


  create table "public"."group_members" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'member'::text,
    "joined_at" timestamp without time zone default now()
      );


alter table "public"."group_members" enable row level security;


  create table "public"."groups" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "emoji" text default '✈️'::text,
    "owner_id" uuid not null,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."groups" enable row level security;


  create table "public"."invites" (
    "id" uuid not null default gen_random_uuid(),
    "invited_by" uuid not null,
    "invited_email" text not null,
    "group_id" uuid,
    "status" text not null default 'pending'::text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."invites" enable row level security;


  create table "public"."profile_settings" (
    "user_id" uuid not null,
    "display_name" text,
    "avatar_color" text,
    "updated_at" timestamp without time zone default now()
      );


alter table "public"."profile_settings" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "email" text not null,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX budget_categories_pkey ON public.budget_categories USING btree (id);

CREATE UNIQUE INDEX budget_expenses_pkey ON public.budget_expenses USING btree (id);

CREATE UNIQUE INDEX budgets_pkey ON public.budgets USING btree (id);

CREATE UNIQUE INDEX categories_user_month_name_unique ON public.budget_categories USING btree (user_id, month, name);

CREATE UNIQUE INDEX communities_code_key ON public.communities USING btree (code);

CREATE UNIQUE INDEX communities_code_unique ON public.communities USING btree (code);

CREATE UNIQUE INDEX communities_pkey ON public.communities USING btree (id);

CREATE UNIQUE INDEX community_invites_community_id_invited_email_key ON public.community_invites USING btree (community_id, invited_email);

CREATE UNIQUE INDEX community_invites_pkey ON public.community_invites USING btree (id);

CREATE UNIQUE INDEX community_members_community_id_user_id_key ON public.community_members USING btree (community_id, user_id);

CREATE INDEX community_members_community_idx ON public.community_members USING btree (community_id);

CREATE UNIQUE INDEX community_members_pkey ON public.community_members USING btree (id);

CREATE INDEX community_members_user_idx ON public.community_members USING btree (user_id);

CREATE UNIQUE INDEX community_post_bookmarks_pkey ON public.community_post_bookmarks USING btree (id);

CREATE UNIQUE INDEX community_post_bookmarks_post_id_user_id_key ON public.community_post_bookmarks USING btree (post_id, user_id);

CREATE INDEX community_post_bookmarks_post_idx ON public.community_post_bookmarks USING btree (post_id);

CREATE INDEX community_post_bookmarks_user_idx ON public.community_post_bookmarks USING btree (user_id);

CREATE INDEX community_post_comments_author_idx ON public.community_post_comments USING btree (author_id);

CREATE UNIQUE INDEX community_post_comments_pkey ON public.community_post_comments USING btree (id);

CREATE INDEX community_post_comments_post_created_idx ON public.community_post_comments USING btree (post_id, created_at);

CREATE UNIQUE INDEX community_post_likes_pkey ON public.community_post_likes USING btree (id);

CREATE UNIQUE INDEX community_post_likes_post_id_user_id_key ON public.community_post_likes USING btree (post_id, user_id);

CREATE INDEX community_post_likes_post_idx ON public.community_post_likes USING btree (post_id);

CREATE INDEX community_post_likes_user_idx ON public.community_post_likes USING btree (user_id);

CREATE INDEX community_posts_author_idx ON public.community_posts USING btree (author_id);

CREATE INDEX community_posts_community_created_idx ON public.community_posts USING btree (community_id, created_at DESC);

CREATE UNIQUE INDEX community_posts_pkey ON public.community_posts USING btree (id);

CREATE UNIQUE INDEX expense_splits_expense_id_user_id_key ON public.expense_splits USING btree (expense_id, user_id);

CREATE UNIQUE INDEX expense_splits_pkey ON public.expense_splits USING btree (id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE UNIQUE INDEX friendships_pkey ON public.friendships USING btree (id);

CREATE UNIQUE INDEX friendships_user_id_friend_id_key ON public.friendships USING btree (user_id, friend_id);

CREATE UNIQUE INDEX group_members_group_id_user_id_key ON public.group_members USING btree (group_id, user_id);

CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (id);

CREATE UNIQUE INDEX groups_pkey ON public.groups USING btree (id);

CREATE UNIQUE INDEX invites_pkey ON public.invites USING btree (id);

CREATE UNIQUE INDEX profile_settings_pkey ON public.profile_settings USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

alter table "public"."budget_categories" add constraint "budget_categories_pkey" PRIMARY KEY using index "budget_categories_pkey";

alter table "public"."budget_expenses" add constraint "budget_expenses_pkey" PRIMARY KEY using index "budget_expenses_pkey";

alter table "public"."budgets" add constraint "budgets_pkey" PRIMARY KEY using index "budgets_pkey";

alter table "public"."communities" add constraint "communities_pkey" PRIMARY KEY using index "communities_pkey";

alter table "public"."community_invites" add constraint "community_invites_pkey" PRIMARY KEY using index "community_invites_pkey";

alter table "public"."community_members" add constraint "community_members_pkey" PRIMARY KEY using index "community_members_pkey";

alter table "public"."community_post_bookmarks" add constraint "community_post_bookmarks_pkey" PRIMARY KEY using index "community_post_bookmarks_pkey";

alter table "public"."community_post_comments" add constraint "community_post_comments_pkey" PRIMARY KEY using index "community_post_comments_pkey";

alter table "public"."community_post_likes" add constraint "community_post_likes_pkey" PRIMARY KEY using index "community_post_likes_pkey";

alter table "public"."community_posts" add constraint "community_posts_pkey" PRIMARY KEY using index "community_posts_pkey";

alter table "public"."expense_splits" add constraint "expense_splits_pkey" PRIMARY KEY using index "expense_splits_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."friendships" add constraint "friendships_pkey" PRIMARY KEY using index "friendships_pkey";

alter table "public"."group_members" add constraint "group_members_pkey" PRIMARY KEY using index "group_members_pkey";

alter table "public"."groups" add constraint "groups_pkey" PRIMARY KEY using index "groups_pkey";

alter table "public"."invites" add constraint "invites_pkey" PRIMARY KEY using index "invites_pkey";

alter table "public"."profile_settings" add constraint "profile_settings_pkey" PRIMARY KEY using index "profile_settings_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."budget_categories" add constraint "budget_categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."budget_categories" validate constraint "budget_categories_user_id_fkey";

alter table "public"."budget_expenses" add constraint "budget_expenses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE CASCADE not valid;

alter table "public"."budget_expenses" validate constraint "budget_expenses_category_id_fkey";

alter table "public"."budget_expenses" add constraint "budget_expenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."budget_expenses" validate constraint "budget_expenses_user_id_fkey";

alter table "public"."budgets" add constraint "budgets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."budgets" validate constraint "budgets_user_id_fkey";

alter table "public"."communities" add constraint "communities_code_key" UNIQUE using index "communities_code_key";

alter table "public"."communities" add constraint "communities_kind_check" CHECK ((kind = ANY (ARRAY['city'::text, 'university'::text, 'private'::text]))) not valid;

alter table "public"."communities" validate constraint "communities_kind_check";

alter table "public"."communities" add constraint "communities_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) not valid;

alter table "public"."communities" validate constraint "communities_owner_id_fkey";

alter table "public"."community_invites" add constraint "community_invites_community_id_fkey" FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE not valid;

alter table "public"."community_invites" validate constraint "community_invites_community_id_fkey";

alter table "public"."community_invites" add constraint "community_invites_community_id_invited_email_key" UNIQUE using index "community_invites_community_id_invited_email_key";

alter table "public"."community_invites" add constraint "community_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."community_invites" validate constraint "community_invites_invited_by_fkey";

alter table "public"."community_invites" add constraint "community_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]))) not valid;

alter table "public"."community_invites" validate constraint "community_invites_status_check";

alter table "public"."community_members" add constraint "community_members_community_id_fkey" FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE not valid;

alter table "public"."community_members" validate constraint "community_members_community_id_fkey";

alter table "public"."community_members" add constraint "community_members_community_id_user_id_key" UNIQUE using index "community_members_community_id_user_id_key";

alter table "public"."community_members" add constraint "community_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'moderator'::text, 'member'::text]))) not valid;

alter table "public"."community_members" validate constraint "community_members_role_check";

alter table "public"."community_members" add constraint "community_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_members" validate constraint "community_members_user_id_fkey";

alter table "public"."community_post_bookmarks" add constraint "community_post_bookmarks_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_bookmarks" validate constraint "community_post_bookmarks_post_id_fkey";

alter table "public"."community_post_bookmarks" add constraint "community_post_bookmarks_post_id_user_id_key" UNIQUE using index "community_post_bookmarks_post_id_user_id_key";

alter table "public"."community_post_bookmarks" add constraint "community_post_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_bookmarks" validate constraint "community_post_bookmarks_user_id_fkey";

alter table "public"."community_post_comments" add constraint "community_post_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_comments" validate constraint "community_post_comments_author_id_fkey";

alter table "public"."community_post_comments" add constraint "community_post_comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_comments" validate constraint "community_post_comments_post_id_fkey";

alter table "public"."community_post_likes" add constraint "community_post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_likes" validate constraint "community_post_likes_post_id_fkey";

alter table "public"."community_post_likes" add constraint "community_post_likes_post_id_user_id_key" UNIQUE using index "community_post_likes_post_id_user_id_key";

alter table "public"."community_post_likes" add constraint "community_post_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_post_likes" validate constraint "community_post_likes_user_id_fkey";

alter table "public"."community_posts" add constraint "community_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_posts" validate constraint "community_posts_author_id_fkey";

alter table "public"."community_posts" add constraint "community_posts_community_id_fkey" FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE not valid;

alter table "public"."community_posts" validate constraint "community_posts_community_id_fkey";

alter table "public"."expense_splits" add constraint "expense_splits_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE not valid;

alter table "public"."expense_splits" validate constraint "expense_splits_expense_id_fkey";

alter table "public"."expense_splits" add constraint "expense_splits_expense_id_user_id_key" UNIQUE using index "expense_splits_expense_id_user_id_key";

alter table "public"."expense_splits" add constraint "expense_splits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."expense_splits" validate constraint "expense_splits_user_id_fkey";

alter table "public"."expenses" add constraint "expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."expenses" validate constraint "expenses_created_by_fkey";

alter table "public"."expenses" add constraint "expenses_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."expenses" validate constraint "expenses_group_id_fkey";

alter table "public"."expenses" add constraint "expenses_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES auth.users(id) not valid;

alter table "public"."expenses" validate constraint "expenses_paid_by_fkey";

alter table "public"."friendships" add constraint "friendships_friend_id_fkey" FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."friendships" validate constraint "friendships_friend_id_fkey";

alter table "public"."friendships" add constraint "friendships_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text]))) not valid;

alter table "public"."friendships" validate constraint "friendships_status_check";

alter table "public"."friendships" add constraint "friendships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."friendships" validate constraint "friendships_user_id_fkey";

alter table "public"."friendships" add constraint "friendships_user_id_friend_id_key" UNIQUE using index "friendships_user_id_friend_id_key";

alter table "public"."group_members" add constraint "group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_group_id_fkey";

alter table "public"."group_members" add constraint "group_members_group_id_user_id_key" UNIQUE using index "group_members_group_id_user_id_key";

alter table "public"."group_members" add constraint "group_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text]))) not valid;

alter table "public"."group_members" validate constraint "group_members_role_check";

alter table "public"."group_members" add constraint "group_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_user_id_fkey";

alter table "public"."groups" add constraint "groups_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."groups" validate constraint "groups_owner_id_fkey";

alter table "public"."invites" add constraint "invites_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."invites" validate constraint "invites_group_id_fkey";

alter table "public"."invites" add constraint "invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."invites" validate constraint "invites_invited_by_fkey";

alter table "public"."invites" add constraint "invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]))) not valid;

alter table "public"."invites" validate constraint "invites_status_check";

alter table "public"."profile_settings" add constraint "profile_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profile_settings" validate constraint "profile_settings_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_personal_friends_membership()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  my_community_id uuid;
begin
  -- Check if user already has their own personal community
  select id into my_community_id
  from communities
  where code = 'personal_friends_' || auth.uid()::text
  limit 1;
 
  -- If not, create it
  if my_community_id is null then
    insert into communities (code, name, emoji, kind, owner_id)
    values (
      'personal_friends_' || auth.uid()::text,
      'Personal Friends',
      '👥',
      'private',
      auth.uid()
    )
    returning id into my_community_id;
   
    -- Add user as owner
    insert into community_members (community_id, user_id, role)
    values (my_community_id, auth.uid(), 'owner')
    on conflict (community_id, user_id) do nothing;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_community_feed(p_community_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(post_id uuid, community_id uuid, author_id uuid, title text, body text, tag text, tag_color text, image_url text, created_at timestamp without time zone, like_count bigint, comment_count bigint, liked_by_me boolean, bookmarked_by_me boolean, author_email text, author_full_name text, author_display_name text, author_avatar_url text, author_avatar_color text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Enforce community visibility in-function as a safety guard
  if not exists (
    select 1
    from communities c
    where c.id = p_community_id
      and (
        c.kind <> 'private'
        or exists (
          select 1 from community_members cm
          where cm.community_id = c.id and cm.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id as post_id,
    p.community_id,
    p.author_id,
    p.title,
    p.body,
    p.tag,
    p.tag_color,
    p.image_url,
    p.created_at,
    (select count(*) from community_post_likes l where l.post_id = p.id) as like_count,
    (select count(*) from community_post_comments c where c.post_id = p.id) as comment_count,
    exists (
      select 1 from community_post_likes l2
      where l2.post_id = p.id and l2.user_id = auth.uid()
    ) as liked_by_me,
    exists (
      select 1 from community_post_bookmarks b
      where b.post_id = p.id and b.user_id = auth.uid()
    ) as bookmarked_by_me,
    pr.email as author_email,
    pr.full_name as author_full_name,
    coalesce(ps.display_name, pr.full_name, pr.email) as author_display_name,
    pr.avatar_url as author_avatar_url,
    ps.avatar_color as author_avatar_color
  from community_posts p
  join profiles pr on pr.user_id = p.author_id
  left join profile_settings ps on ps.user_id = p.author_id
  where p.community_id = p_community_id
  order by p.created_at desc
  limit p_limit offset p_offset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_community_points()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  pts bigint;
begin
  select 2 * count(*)
  into pts
  from community_post_likes l
  join community_posts p on p.id = l.post_id
  where p.author_id = auth.uid();

  return coalesce(pts, 0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_balances(p_user_id uuid)
 RETURNS TABLE(other_user_id uuid, other_user_email text, other_user_name text, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  with
  owed_to_me as (
    select es.user_id as other_id, sum(es.share) as amount
    from expenses e
    join expense_splits es on es.expense_id = e.id
    where e.paid_by = p_user_id
      and es.user_id != p_user_id
    group by es.user_id
  ),
  i_owe as (
    select e.paid_by as other_id, sum(es.share) as amount
    from expenses e
    join expense_splits es on es.expense_id = e.id
    where es.user_id = p_user_id
      and e.paid_by != p_user_id
    group by e.paid_by
  ),
  net as (
    select
      coalesce(o.other_id, i.other_id) as other_id,
      coalesce(o.amount, 0) - coalesce(i.amount, 0) as balance
    from owed_to_me o
    full outer join i_owe i
      on o.other_id = i.other_id
  )
  select
    n.other_id,
    p.email,
    p.full_name,
    n.balance
  from net n
  join profiles p on p.user_id = n.other_id
  where n.balance != 0;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_community_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_community_id uuid;
begin
  -- Create a personal friends community for this specific user
  insert into public.communities (code, name, emoji, kind, owner_id)
  values (
    'personal_friends_' || new.id::text,
    'Personal Friends',
    '👥',
    'private',
    new.id
  )
  returning id into new_community_id;
 
  -- Add the user as owner of their own community
  insert into public.community_members (community_id, user_id, role)
  values (new_community_id, new.id, 'owner')
  on conflict (community_id, user_id) do nothing;
 
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from community_members
    where community_id = p_community_id
      and user_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from group_members
    where group_id = p_group_id
    and user_id = auth.uid()
  );
end;
$function$
;

grant delete on table "public"."budget_categories" to "anon";

grant insert on table "public"."budget_categories" to "anon";

grant references on table "public"."budget_categories" to "anon";

grant select on table "public"."budget_categories" to "anon";

grant trigger on table "public"."budget_categories" to "anon";

grant truncate on table "public"."budget_categories" to "anon";

grant update on table "public"."budget_categories" to "anon";

grant delete on table "public"."budget_categories" to "authenticated";

grant insert on table "public"."budget_categories" to "authenticated";

grant references on table "public"."budget_categories" to "authenticated";

grant select on table "public"."budget_categories" to "authenticated";

grant trigger on table "public"."budget_categories" to "authenticated";

grant truncate on table "public"."budget_categories" to "authenticated";

grant update on table "public"."budget_categories" to "authenticated";

grant delete on table "public"."budget_categories" to "service_role";

grant insert on table "public"."budget_categories" to "service_role";

grant references on table "public"."budget_categories" to "service_role";

grant select on table "public"."budget_categories" to "service_role";

grant trigger on table "public"."budget_categories" to "service_role";

grant truncate on table "public"."budget_categories" to "service_role";

grant update on table "public"."budget_categories" to "service_role";

grant delete on table "public"."budget_expenses" to "anon";

grant insert on table "public"."budget_expenses" to "anon";

grant references on table "public"."budget_expenses" to "anon";

grant select on table "public"."budget_expenses" to "anon";

grant trigger on table "public"."budget_expenses" to "anon";

grant truncate on table "public"."budget_expenses" to "anon";

grant update on table "public"."budget_expenses" to "anon";

grant delete on table "public"."budget_expenses" to "authenticated";

grant insert on table "public"."budget_expenses" to "authenticated";

grant references on table "public"."budget_expenses" to "authenticated";

grant select on table "public"."budget_expenses" to "authenticated";

grant trigger on table "public"."budget_expenses" to "authenticated";

grant truncate on table "public"."budget_expenses" to "authenticated";

grant update on table "public"."budget_expenses" to "authenticated";

grant delete on table "public"."budget_expenses" to "service_role";

grant insert on table "public"."budget_expenses" to "service_role";

grant references on table "public"."budget_expenses" to "service_role";

grant select on table "public"."budget_expenses" to "service_role";

grant trigger on table "public"."budget_expenses" to "service_role";

grant truncate on table "public"."budget_expenses" to "service_role";

grant update on table "public"."budget_expenses" to "service_role";

grant delete on table "public"."budgets" to "anon";

grant insert on table "public"."budgets" to "anon";

grant references on table "public"."budgets" to "anon";

grant select on table "public"."budgets" to "anon";

grant trigger on table "public"."budgets" to "anon";

grant truncate on table "public"."budgets" to "anon";

grant update on table "public"."budgets" to "anon";

grant delete on table "public"."budgets" to "authenticated";

grant insert on table "public"."budgets" to "authenticated";

grant references on table "public"."budgets" to "authenticated";

grant select on table "public"."budgets" to "authenticated";

grant trigger on table "public"."budgets" to "authenticated";

grant truncate on table "public"."budgets" to "authenticated";

grant update on table "public"."budgets" to "authenticated";

grant delete on table "public"."budgets" to "service_role";

grant insert on table "public"."budgets" to "service_role";

grant references on table "public"."budgets" to "service_role";

grant select on table "public"."budgets" to "service_role";

grant trigger on table "public"."budgets" to "service_role";

grant truncate on table "public"."budgets" to "service_role";

grant update on table "public"."budgets" to "service_role";

grant delete on table "public"."communities" to "anon";

grant insert on table "public"."communities" to "anon";

grant references on table "public"."communities" to "anon";

grant select on table "public"."communities" to "anon";

grant trigger on table "public"."communities" to "anon";

grant truncate on table "public"."communities" to "anon";

grant update on table "public"."communities" to "anon";

grant delete on table "public"."communities" to "authenticated";

grant insert on table "public"."communities" to "authenticated";

grant references on table "public"."communities" to "authenticated";

grant select on table "public"."communities" to "authenticated";

grant trigger on table "public"."communities" to "authenticated";

grant truncate on table "public"."communities" to "authenticated";

grant update on table "public"."communities" to "authenticated";

grant delete on table "public"."communities" to "service_role";

grant insert on table "public"."communities" to "service_role";

grant references on table "public"."communities" to "service_role";

grant select on table "public"."communities" to "service_role";

grant trigger on table "public"."communities" to "service_role";

grant truncate on table "public"."communities" to "service_role";

grant update on table "public"."communities" to "service_role";

grant delete on table "public"."community_invites" to "anon";

grant insert on table "public"."community_invites" to "anon";

grant references on table "public"."community_invites" to "anon";

grant select on table "public"."community_invites" to "anon";

grant trigger on table "public"."community_invites" to "anon";

grant truncate on table "public"."community_invites" to "anon";

grant update on table "public"."community_invites" to "anon";

grant delete on table "public"."community_invites" to "authenticated";

grant insert on table "public"."community_invites" to "authenticated";

grant references on table "public"."community_invites" to "authenticated";

grant select on table "public"."community_invites" to "authenticated";

grant trigger on table "public"."community_invites" to "authenticated";

grant truncate on table "public"."community_invites" to "authenticated";

grant update on table "public"."community_invites" to "authenticated";

grant delete on table "public"."community_invites" to "service_role";

grant insert on table "public"."community_invites" to "service_role";

grant references on table "public"."community_invites" to "service_role";

grant select on table "public"."community_invites" to "service_role";

grant trigger on table "public"."community_invites" to "service_role";

grant truncate on table "public"."community_invites" to "service_role";

grant update on table "public"."community_invites" to "service_role";

grant delete on table "public"."community_members" to "anon";

grant insert on table "public"."community_members" to "anon";

grant references on table "public"."community_members" to "anon";

grant select on table "public"."community_members" to "anon";

grant trigger on table "public"."community_members" to "anon";

grant truncate on table "public"."community_members" to "anon";

grant update on table "public"."community_members" to "anon";

grant delete on table "public"."community_members" to "authenticated";

grant insert on table "public"."community_members" to "authenticated";

grant references on table "public"."community_members" to "authenticated";

grant select on table "public"."community_members" to "authenticated";

grant trigger on table "public"."community_members" to "authenticated";

grant truncate on table "public"."community_members" to "authenticated";

grant update on table "public"."community_members" to "authenticated";

grant delete on table "public"."community_members" to "service_role";

grant insert on table "public"."community_members" to "service_role";

grant references on table "public"."community_members" to "service_role";

grant select on table "public"."community_members" to "service_role";

grant trigger on table "public"."community_members" to "service_role";

grant truncate on table "public"."community_members" to "service_role";

grant update on table "public"."community_members" to "service_role";

grant delete on table "public"."community_post_bookmarks" to "anon";

grant insert on table "public"."community_post_bookmarks" to "anon";

grant references on table "public"."community_post_bookmarks" to "anon";

grant select on table "public"."community_post_bookmarks" to "anon";

grant trigger on table "public"."community_post_bookmarks" to "anon";

grant truncate on table "public"."community_post_bookmarks" to "anon";

grant update on table "public"."community_post_bookmarks" to "anon";

grant delete on table "public"."community_post_bookmarks" to "authenticated";

grant insert on table "public"."community_post_bookmarks" to "authenticated";

grant references on table "public"."community_post_bookmarks" to "authenticated";

grant select on table "public"."community_post_bookmarks" to "authenticated";

grant trigger on table "public"."community_post_bookmarks" to "authenticated";

grant truncate on table "public"."community_post_bookmarks" to "authenticated";

grant update on table "public"."community_post_bookmarks" to "authenticated";

grant delete on table "public"."community_post_bookmarks" to "service_role";

grant insert on table "public"."community_post_bookmarks" to "service_role";

grant references on table "public"."community_post_bookmarks" to "service_role";

grant select on table "public"."community_post_bookmarks" to "service_role";

grant trigger on table "public"."community_post_bookmarks" to "service_role";

grant truncate on table "public"."community_post_bookmarks" to "service_role";

grant update on table "public"."community_post_bookmarks" to "service_role";

grant delete on table "public"."community_post_comments" to "anon";

grant insert on table "public"."community_post_comments" to "anon";

grant references on table "public"."community_post_comments" to "anon";

grant select on table "public"."community_post_comments" to "anon";

grant trigger on table "public"."community_post_comments" to "anon";

grant truncate on table "public"."community_post_comments" to "anon";

grant update on table "public"."community_post_comments" to "anon";

grant delete on table "public"."community_post_comments" to "authenticated";

grant insert on table "public"."community_post_comments" to "authenticated";

grant references on table "public"."community_post_comments" to "authenticated";

grant select on table "public"."community_post_comments" to "authenticated";

grant trigger on table "public"."community_post_comments" to "authenticated";

grant truncate on table "public"."community_post_comments" to "authenticated";

grant update on table "public"."community_post_comments" to "authenticated";

grant delete on table "public"."community_post_comments" to "service_role";

grant insert on table "public"."community_post_comments" to "service_role";

grant references on table "public"."community_post_comments" to "service_role";

grant select on table "public"."community_post_comments" to "service_role";

grant trigger on table "public"."community_post_comments" to "service_role";

grant truncate on table "public"."community_post_comments" to "service_role";

grant update on table "public"."community_post_comments" to "service_role";

grant delete on table "public"."community_post_likes" to "anon";

grant insert on table "public"."community_post_likes" to "anon";

grant references on table "public"."community_post_likes" to "anon";

grant select on table "public"."community_post_likes" to "anon";

grant trigger on table "public"."community_post_likes" to "anon";

grant truncate on table "public"."community_post_likes" to "anon";

grant update on table "public"."community_post_likes" to "anon";

grant delete on table "public"."community_post_likes" to "authenticated";

grant insert on table "public"."community_post_likes" to "authenticated";

grant references on table "public"."community_post_likes" to "authenticated";

grant select on table "public"."community_post_likes" to "authenticated";

grant trigger on table "public"."community_post_likes" to "authenticated";

grant truncate on table "public"."community_post_likes" to "authenticated";

grant update on table "public"."community_post_likes" to "authenticated";

grant delete on table "public"."community_post_likes" to "service_role";

grant insert on table "public"."community_post_likes" to "service_role";

grant references on table "public"."community_post_likes" to "service_role";

grant select on table "public"."community_post_likes" to "service_role";

grant trigger on table "public"."community_post_likes" to "service_role";

grant truncate on table "public"."community_post_likes" to "service_role";

grant update on table "public"."community_post_likes" to "service_role";

grant delete on table "public"."community_posts" to "anon";

grant insert on table "public"."community_posts" to "anon";

grant references on table "public"."community_posts" to "anon";

grant select on table "public"."community_posts" to "anon";

grant trigger on table "public"."community_posts" to "anon";

grant truncate on table "public"."community_posts" to "anon";

grant update on table "public"."community_posts" to "anon";

grant delete on table "public"."community_posts" to "authenticated";

grant insert on table "public"."community_posts" to "authenticated";

grant references on table "public"."community_posts" to "authenticated";

grant select on table "public"."community_posts" to "authenticated";

grant trigger on table "public"."community_posts" to "authenticated";

grant truncate on table "public"."community_posts" to "authenticated";

grant update on table "public"."community_posts" to "authenticated";

grant delete on table "public"."community_posts" to "service_role";

grant insert on table "public"."community_posts" to "service_role";

grant references on table "public"."community_posts" to "service_role";

grant select on table "public"."community_posts" to "service_role";

grant trigger on table "public"."community_posts" to "service_role";

grant truncate on table "public"."community_posts" to "service_role";

grant update on table "public"."community_posts" to "service_role";

grant delete on table "public"."expense_splits" to "anon";

grant insert on table "public"."expense_splits" to "anon";

grant references on table "public"."expense_splits" to "anon";

grant select on table "public"."expense_splits" to "anon";

grant trigger on table "public"."expense_splits" to "anon";

grant truncate on table "public"."expense_splits" to "anon";

grant update on table "public"."expense_splits" to "anon";

grant delete on table "public"."expense_splits" to "authenticated";

grant insert on table "public"."expense_splits" to "authenticated";

grant references on table "public"."expense_splits" to "authenticated";

grant select on table "public"."expense_splits" to "authenticated";

grant trigger on table "public"."expense_splits" to "authenticated";

grant truncate on table "public"."expense_splits" to "authenticated";

grant update on table "public"."expense_splits" to "authenticated";

grant delete on table "public"."expense_splits" to "service_role";

grant insert on table "public"."expense_splits" to "service_role";

grant references on table "public"."expense_splits" to "service_role";

grant select on table "public"."expense_splits" to "service_role";

grant trigger on table "public"."expense_splits" to "service_role";

grant truncate on table "public"."expense_splits" to "service_role";

grant update on table "public"."expense_splits" to "service_role";

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."friendships" to "anon";

grant insert on table "public"."friendships" to "anon";

grant references on table "public"."friendships" to "anon";

grant select on table "public"."friendships" to "anon";

grant trigger on table "public"."friendships" to "anon";

grant truncate on table "public"."friendships" to "anon";

grant update on table "public"."friendships" to "anon";

grant delete on table "public"."friendships" to "authenticated";

grant insert on table "public"."friendships" to "authenticated";

grant references on table "public"."friendships" to "authenticated";

grant select on table "public"."friendships" to "authenticated";

grant trigger on table "public"."friendships" to "authenticated";

grant truncate on table "public"."friendships" to "authenticated";

grant update on table "public"."friendships" to "authenticated";

grant delete on table "public"."friendships" to "service_role";

grant insert on table "public"."friendships" to "service_role";

grant references on table "public"."friendships" to "service_role";

grant select on table "public"."friendships" to "service_role";

grant trigger on table "public"."friendships" to "service_role";

grant truncate on table "public"."friendships" to "service_role";

grant update on table "public"."friendships" to "service_role";

grant delete on table "public"."group_members" to "anon";

grant insert on table "public"."group_members" to "anon";

grant references on table "public"."group_members" to "anon";

grant select on table "public"."group_members" to "anon";

grant trigger on table "public"."group_members" to "anon";

grant truncate on table "public"."group_members" to "anon";

grant update on table "public"."group_members" to "anon";

grant delete on table "public"."group_members" to "authenticated";

grant insert on table "public"."group_members" to "authenticated";

grant references on table "public"."group_members" to "authenticated";

grant select on table "public"."group_members" to "authenticated";

grant trigger on table "public"."group_members" to "authenticated";

grant truncate on table "public"."group_members" to "authenticated";

grant update on table "public"."group_members" to "authenticated";

grant delete on table "public"."group_members" to "service_role";

grant insert on table "public"."group_members" to "service_role";

grant references on table "public"."group_members" to "service_role";

grant select on table "public"."group_members" to "service_role";

grant trigger on table "public"."group_members" to "service_role";

grant truncate on table "public"."group_members" to "service_role";

grant update on table "public"."group_members" to "service_role";

grant delete on table "public"."groups" to "anon";

grant insert on table "public"."groups" to "anon";

grant references on table "public"."groups" to "anon";

grant select on table "public"."groups" to "anon";

grant trigger on table "public"."groups" to "anon";

grant truncate on table "public"."groups" to "anon";

grant update on table "public"."groups" to "anon";

grant delete on table "public"."groups" to "authenticated";

grant insert on table "public"."groups" to "authenticated";

grant references on table "public"."groups" to "authenticated";

grant select on table "public"."groups" to "authenticated";

grant trigger on table "public"."groups" to "authenticated";

grant truncate on table "public"."groups" to "authenticated";

grant update on table "public"."groups" to "authenticated";

grant delete on table "public"."groups" to "service_role";

grant insert on table "public"."groups" to "service_role";

grant references on table "public"."groups" to "service_role";

grant select on table "public"."groups" to "service_role";

grant trigger on table "public"."groups" to "service_role";

grant truncate on table "public"."groups" to "service_role";

grant update on table "public"."groups" to "service_role";

grant delete on table "public"."invites" to "anon";

grant insert on table "public"."invites" to "anon";

grant references on table "public"."invites" to "anon";

grant select on table "public"."invites" to "anon";

grant trigger on table "public"."invites" to "anon";

grant truncate on table "public"."invites" to "anon";

grant update on table "public"."invites" to "anon";

grant delete on table "public"."invites" to "authenticated";

grant insert on table "public"."invites" to "authenticated";

grant references on table "public"."invites" to "authenticated";

grant select on table "public"."invites" to "authenticated";

grant trigger on table "public"."invites" to "authenticated";

grant truncate on table "public"."invites" to "authenticated";

grant update on table "public"."invites" to "authenticated";

grant delete on table "public"."invites" to "service_role";

grant insert on table "public"."invites" to "service_role";

grant references on table "public"."invites" to "service_role";

grant select on table "public"."invites" to "service_role";

grant trigger on table "public"."invites" to "service_role";

grant truncate on table "public"."invites" to "service_role";

grant update on table "public"."invites" to "service_role";

grant delete on table "public"."profile_settings" to "anon";

grant insert on table "public"."profile_settings" to "anon";

grant references on table "public"."profile_settings" to "anon";

grant select on table "public"."profile_settings" to "anon";

grant trigger on table "public"."profile_settings" to "anon";

grant truncate on table "public"."profile_settings" to "anon";

grant update on table "public"."profile_settings" to "anon";

grant delete on table "public"."profile_settings" to "authenticated";

grant insert on table "public"."profile_settings" to "authenticated";

grant references on table "public"."profile_settings" to "authenticated";

grant select on table "public"."profile_settings" to "authenticated";

grant trigger on table "public"."profile_settings" to "authenticated";

grant truncate on table "public"."profile_settings" to "authenticated";

grant update on table "public"."profile_settings" to "authenticated";

grant delete on table "public"."profile_settings" to "service_role";

grant insert on table "public"."profile_settings" to "service_role";

grant references on table "public"."profile_settings" to "service_role";

grant select on table "public"."profile_settings" to "service_role";

grant trigger on table "public"."profile_settings" to "service_role";

grant truncate on table "public"."profile_settings" to "service_role";

grant update on table "public"."profile_settings" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "users manage own categories"
  on "public"."budget_categories"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "users manage own expenses"
  on "public"."budget_expenses"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "users insert own budgets"
  on "public"."budgets"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "users read own budgets"
  on "public"."budgets"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "users update own budgets"
  on "public"."budgets"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "communities viewable by membership"
  on "public"."communities"
  as permissive
  for select
  to authenticated
using (((kind <> 'private'::text) OR (owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.community_members cm
  WHERE ((cm.community_id = communities.id) AND (cm.user_id = auth.uid()))))));



  create policy "users can create own private communities"
  on "public"."communities"
  as permissive
  for insert
  to authenticated
with check (((kind = 'private'::text) AND (owner_id = auth.uid())));



  create policy "users can create community invites"
  on "public"."community_invites"
  as permissive
  for insert
  to authenticated
with check ((invited_by = auth.uid()));



  create policy "users can update community invites they received"
  on "public"."community_invites"
  as permissive
  for update
  to authenticated
using ((invited_email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "users can view community invites they sent or received"
  on "public"."community_invites"
  as permissive
  for select
  to authenticated
using (((invited_by = auth.uid()) OR (invited_email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "community_members insert minerva or private"
  on "public"."community_members"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND ((( SELECT c.kind
   FROM public.communities c
  WHERE (c.id = community_members.community_id)) = 'private'::text) OR ((( SELECT c.kind
   FROM public.communities c
  WHERE (c.id = community_members.community_id)) = ANY (ARRAY['city'::text, 'university'::text])) AND (( SELECT lower(p.email) AS lower
   FROM public.profiles p
  WHERE (p.user_id = auth.uid())) ~~ '%@uni.minerva.edu'::text)))));



  create policy "users can join public communities"
  on "public"."community_members"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.communities c
  WHERE ((c.id = community_members.community_id) AND (c.kind <> 'private'::text))))));



  create policy "users can leave communities"
  on "public"."community_members"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "users can view other members in joined communities"
  on "public"."community_members"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.is_community_member(community_id)));



  create policy "users can bookmark visible posts"
  on "public"."community_post_bookmarks"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.community_posts p
     JOIN public.communities c ON ((c.id = p.community_id)))
  WHERE ((p.id = community_post_bookmarks.post_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid()))))))))));



  create policy "users can remove own bookmarks"
  on "public"."community_post_bookmarks"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "users can view own bookmarks"
  on "public"."community_post_bookmarks"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "authors can delete own comments"
  on "public"."community_post_comments"
  as permissive
  for delete
  to authenticated
using ((author_id = auth.uid()));



  create policy "authors can update own comments"
  on "public"."community_post_comments"
  as permissive
  for update
  to authenticated
using ((author_id = auth.uid()));



  create policy "users can comment on visible posts"
  on "public"."community_post_comments"
  as permissive
  for insert
  to authenticated
with check (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.community_posts p
     JOIN public.communities c ON ((c.id = p.community_id)))
  WHERE ((p.id = community_post_comments.post_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid()))))))))));



  create policy "users can view comments for visible posts"
  on "public"."community_post_comments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.community_posts p
     JOIN public.communities c ON ((c.id = p.community_id)))
  WHERE ((p.id = community_post_comments.post_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid())))))))));



  create policy "users can like visible posts"
  on "public"."community_post_likes"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.community_posts p
     JOIN public.communities c ON ((c.id = p.community_id)))
  WHERE ((p.id = community_post_likes.post_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid()))))))))));



  create policy "users can unlike own likes"
  on "public"."community_post_likes"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "users can view likes for visible posts"
  on "public"."community_post_likes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.community_posts p
     JOIN public.communities c ON ((c.id = p.community_id)))
  WHERE ((p.id = community_post_likes.post_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid())))))))));



  create policy "authors can delete own posts"
  on "public"."community_posts"
  as permissive
  for delete
  to authenticated
using ((author_id = auth.uid()));



  create policy "authors can update own posts"
  on "public"."community_posts"
  as permissive
  for update
  to authenticated
using ((author_id = auth.uid()));



  create policy "users can create posts in visible communities"
  on "public"."community_posts"
  as permissive
  for insert
  to authenticated
with check (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.communities c
  WHERE ((c.id = community_posts.community_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid()))))))))));



  create policy "users can view posts in visible communities"
  on "public"."community_posts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.communities c
  WHERE ((c.id = community_posts.community_id) AND ((c.kind <> 'private'::text) OR (EXISTS ( SELECT 1
           FROM public.community_members cm
          WHERE ((cm.community_id = c.id) AND (cm.user_id = auth.uid())))))))));



  create policy "expense creators can delete splits"
  on "public"."expense_splits"
  as permissive
  for delete
  to public
using ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.created_by = auth.uid()))));



  create policy "expense creators can insert splits"
  on "public"."expense_splits"
  as permissive
  for insert
  to public
with check ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.created_by = auth.uid()))));



  create policy "expense creators can update splits"
  on "public"."expense_splits"
  as permissive
  for update
  to public
using ((expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.created_by = auth.uid()))));



  create policy "users can view relevant splits"
  on "public"."expense_splits"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.created_by = auth.uid()))) OR (expense_id IN ( SELECT expenses.id
   FROM public.expenses
  WHERE (expenses.paid_by = auth.uid())))));



  create policy "creators can delete expenses"
  on "public"."expenses"
  as permissive
  for delete
  to public
using ((created_by = auth.uid()));



  create policy "creators can update expenses"
  on "public"."expenses"
  as permissive
  for update
  to public
using ((created_by = auth.uid()));



  create policy "users can create expenses"
  on "public"."expenses"
  as permissive
  for insert
  to public
with check ((created_by = auth.uid()));



  create policy "users can view own expenses"
  on "public"."expenses"
  as permissive
  for select
  to public
using (((paid_by = auth.uid()) OR (created_by = auth.uid()) OR (group_id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE (group_members.user_id = auth.uid())))));



  create policy "users can view split expenses"
  on "public"."expenses"
  as permissive
  for select
  to public
using ((id IN ( SELECT expense_splits.expense_id
   FROM public.expense_splits
  WHERE (expense_splits.user_id = auth.uid()))));



  create policy "users can create friendships"
  on "public"."friendships"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "users can delete own friendships"
  on "public"."friendships"
  as permissive
  for delete
  to public
using (((user_id = auth.uid()) OR (friend_id = auth.uid())));



  create policy "users can update received friendships"
  on "public"."friendships"
  as permissive
  for update
  to public
using ((friend_id = auth.uid()));



  create policy "users can view own friendships"
  on "public"."friendships"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (friend_id = auth.uid())));



  create policy "owners can add group members"
  on "public"."group_members"
  as permissive
  for insert
  to public
with check (((group_id IN ( SELECT groups.id
   FROM public.groups
  WHERE (groups.owner_id = auth.uid()))) OR (user_id = auth.uid())));



  create policy "owners can remove group members"
  on "public"."group_members"
  as permissive
  for delete
  to public
using (((group_id IN ( SELECT groups.id
   FROM public.groups
  WHERE (groups.owner_id = auth.uid()))) OR (user_id = auth.uid())));



  create policy "users can join groups"
  on "public"."group_members"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.groups
  WHERE ((groups.id = group_members.group_id) AND (groups.owner_id = auth.uid()))))));



  create policy "users can leave groups"
  on "public"."group_members"
  as permissive
  for delete
  to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.groups
  WHERE ((groups.id = group_members.group_id) AND (groups.owner_id = auth.uid()))))));



  create policy "users can view group members"
  on "public"."group_members"
  as permissive
  for select
  to authenticated
using (public.is_group_member(group_id));



  create policy "owners can delete groups"
  on "public"."groups"
  as permissive
  for delete
  to public
using ((owner_id = auth.uid()));



  create policy "owners can update groups"
  on "public"."groups"
  as permissive
  for update
  to public
using ((owner_id = auth.uid()));



  create policy "users can create groups"
  on "public"."groups"
  as permissive
  for insert
  to public
with check ((owner_id = auth.uid()));



  create policy "users can view groups they belong to"
  on "public"."groups"
  as permissive
  for select
  to public
using (((owner_id = auth.uid()) OR (id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE (group_members.user_id = auth.uid())))));



  create policy "users can cancel invites"
  on "public"."invites"
  as permissive
  for delete
  to public
using ((invited_by = auth.uid()));



  create policy "users can create invites"
  on "public"."invites"
  as permissive
  for insert
  to public
with check ((invited_by = auth.uid()));



  create policy "users can respond to invites"
  on "public"."invites"
  as permissive
  for update
  to public
using ((invited_email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "users can view own invites"
  on "public"."invites"
  as permissive
  for select
  to public
using (((invited_by = auth.uid()) OR (invited_email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "users can update own profile_settings"
  on "public"."profile_settings"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()));



  create policy "users can upsert own profile_settings"
  on "public"."profile_settings"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "users can view profile_settings"
  on "public"."profile_settings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "profiles are viewable by authenticated users"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "profiles viewable by authenticated users"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "users insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "users update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_community_defaults AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_community_defaults();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


