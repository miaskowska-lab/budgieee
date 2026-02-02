# Supabase Schema - Source of Truth

> **⚠️ IMPORTANT**: This SQL is already executed in production Supabase.  
> All frontend code must query these tables **exactly as defined**.  
> `auth.uid()` is the source of truth for user identity.

## Block Order (DO NOT MERGE)

The SQL is split into blocks due to RLS cross-table dependencies:

| Block | Purpose |
|-------|---------|
| A | Life Budget (budgets, categories, expenses) |
| B | Profiles + Friendships |
| C | Groups (base table) |
| D1 | Group Members |
| D2 | Group Visibility (RLS policy) |
| D3 | (Reserved) |
| E1 | Expenses |
| E2 | Expense Splits |
| E3 | Invites + Balance Function |
| F  | Community Members (Minerva join restriction) |

---

## 🧱 BLOCK A — Life Budget

```sql
-- budgets
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  month date not null,
  total_budget numeric not null default 0,
  created_at timestamp default now(),
  unique (user_id, month)
);

alter table budgets enable row level security;

create policy "users read own budgets"
on budgets for select
using (user_id = auth.uid());

create policy "users insert own budgets"
on budgets for insert
with check (user_id = auth.uid());

create policy "users update own budgets"
on budgets for update
using (user_id = auth.uid());


-- budget_categories
create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  month date not null,
  name text not null,
  emoji text,
  color text default '#3b82f6',
  limit_amount numeric not null default 0,
  created_at timestamp default now(),
  unique (user_id, month, name)
);

alter table budget_categories enable row level security;

create policy "users manage own categories"
on budget_categories
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- budget_expenses
create table if not exists budget_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id uuid references budget_categories(id) on delete cascade,
  month date not null,
  title text not null,
  amount numeric not null,
  note text,
  occurred_at date not null,
  created_at timestamp default now()
);

alter table budget_expenses enable row level security;

create policy "users manage own expenses"
on budget_expenses
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

## 🧱 BLOCK B — Profiles + Friendships

```sql
-- profiles (auto-created on signup via trigger)
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp default now()
);

alter table profiles enable row level security;

create policy "profiles viewable by authenticated users"
on profiles for select
to authenticated
using (true);

create policy "users update own profile"
on profiles for update
using (user_id = auth.uid());

create policy "users insert own profile"
on profiles for insert
with check (user_id = auth.uid());


-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();


-- friendships
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  friend_id uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','accepted')),
  created_at timestamp default now(),
  unique(user_id, friend_id)
);

alter table friendships enable row level security;

create policy "users view own friendships"
on friendships for select
using (user_id = auth.uid() or friend_id = auth.uid());

create policy "users create friendships"
on friendships for insert
with check (user_id = auth.uid());

create policy "users accept friendships"
on friendships for update
using (friend_id = auth.uid());

create policy "users delete friendships"
on friendships for delete
using (user_id = auth.uid() or friend_id = auth.uid());
```

---

## 🧱 BLOCK C — Groups (base table)

```sql
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '✈️',
  owner_id uuid not null references auth.users(id),
  created_at timestamp default now()
);

alter table groups enable row level security;

create policy "users create groups"
on groups for insert
with check (owner_id = auth.uid());

create policy "owners update groups"
on groups for update
using (owner_id = auth.uid());

create policy "owners delete groups"
on groups for delete
using (owner_id = auth.uid());
```

---

## 🧱 BLOCK D1 — Group Members

```sql
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null default 'member'
    check (role in ('owner','member')),
  joined_at timestamp default now(),
  unique(group_id, user_id)
);

alter table group_members enable row level security;

create policy "users view group members"
on group_members for select
using (
  group_id in (
    select group_id from group_members
    where user_id = auth.uid()
  )
);

create policy "owners add members"
on group_members for insert
with check (
  group_id in (select id from groups where owner_id = auth.uid())
  or user_id = auth.uid()
);

create policy "owners remove members"
on group_members for delete
using (
  group_id in (select id from groups where owner_id = auth.uid())
  or user_id = auth.uid()
);
```

---

## 🧱 BLOCK D2 — Group Visibility

```sql
create policy "users view groups they belong to"
on groups for select
using (
  owner_id = auth.uid()
  or id in (
    select group_id from group_members
    where user_id = auth.uid()
  )
);
```

---

## 🧱 BLOCK E1 — Expenses

```sql
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null,
  currency text default 'USD',
  paid_by uuid not null references auth.users(id),
  group_id uuid references groups(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamp default now()
);

alter table expenses enable row level security;

create policy "users view own or group expenses"
on expenses for select
using (
  paid_by = auth.uid()
  or created_by = auth.uid()
  or group_id in (
    select group_id from group_members
    where user_id = auth.uid()
  )
);

create policy "users create expenses"
on expenses for insert
with check (created_by = auth.uid());

create policy "users update own expenses"
on expenses for update
using (created_by = auth.uid());

create policy "users delete own expenses"
on expenses for delete
using (created_by = auth.uid());
```

---

## 🧱 BLOCK E2 — Expense Splits

```sql
create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  share numeric not null,
  created_at timestamp default now(),
  unique(expense_id, user_id)
);

alter table expense_splits enable row level security;

create policy "users view relevant splits"
on expense_splits for select
using (
  user_id = auth.uid()
  or expense_id in (
    select id from expenses
    where paid_by = auth.uid() or created_by = auth.uid()
  )
);

create policy "creators manage splits"
on expense_splits
for all
using (
  expense_id in (
    select id from expenses
    where created_by = auth.uid()
  )
);
```

---

## 🧱 BLOCK E3 — Invites + Balance Function

```sql
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  invited_email text not null,
  group_id uuid references groups(id),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined')),
  created_at timestamp default now()
);

alter table invites enable row level security;

create policy "users view invites"
on invites for select
using (
  invited_by = auth.uid()
  or invited_email = (
    select email from profiles where user_id = auth.uid()
  )
);

create policy "users create invites"
on invites for insert
with check (invited_by = auth.uid());

create policy "users respond invites"
on invites for update
using (
  invited_email = (
    select email from profiles where user_id = auth.uid()
  )
);


-- Balance calculation function
create or replace function get_user_balances(p_user_id uuid)
returns table (
  other_user_id uuid,
  other_user_email text,
  other_user_name text,
  balance numeric
) as $$
begin
  return query
  with owed as (
    select es.user_id, sum(es.share) amt
    from expenses e
    join expense_splits es on es.expense_id = e.id
    where e.paid_by = p_user_id and es.user_id != p_user_id
    group by es.user_id
  ),
  owe as (
    select e.paid_by, sum(es.share) amt
    from expenses e
    join expense_splits es on es.expense_id = e.id
    where es.user_id = p_user_id and e.paid_by != p_user_id
    group by e.paid_by
  )
  select
    coalesce(owed.user_id, owe.paid_by),
    p.email,
    p.full_name,
    coalesce(owed.amt,0) - coalesce(owe.amt,0)
  from owed
  full join owe on owed.user_id = owe.paid_by
  join profiles p on p.user_id = coalesce(owed.user_id, owe.paid_by);
end;
$$ language plpgsql security definer;
```

---

## 🧱 BLOCK F — Community Members (Minerva join restriction)

Run this **after** `communities` and `community_members` tables exist. Restricts joining **city/university** communities to users whose email ends with `@uni.minerva.edu`. **Private** communities (e.g. Personal Friends, invite flows) remain joinable by RPC/invite.

```sql
-- Drop existing INSERT policy on community_members if it exists (name may vary in your project)
drop policy if exists "users can join communities" on community_members;
drop policy if exists "members insert" on community_members;
drop policy if exists "community_members insert" on community_members;

-- Allow insert: own user_id; and either community is private, or (city/university and Minerva email)
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
```

---

## Table Summary

| Table | Columns |
|-------|---------|
| `budgets` | id, user_id, month, total_budget, created_at |
| `budget_categories` | id, user_id, month, name, emoji, color, limit_amount, created_at |
| `budget_expenses` | id, user_id, category_id, month, title, amount, note, occurred_at, created_at |
| `profiles` | user_id, email, full_name, avatar_url, created_at |
| `friendships` | id, user_id, friend_id, status, created_at |
| `groups` | id, name, emoji, owner_id, created_at |
| `group_members` | id, group_id, user_id, role, joined_at |
| `expenses` | id, description, amount, currency, paid_by, group_id, created_by, created_at |
| `expense_splits` | id, expense_id, user_id, share, created_at |
| `invites` | id, invited_by, invited_email, group_id, status, created_at |

## Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: auto-creates profile on signup |
| `get_user_balances(p_user_id)` | Returns who owes whom and how much |
