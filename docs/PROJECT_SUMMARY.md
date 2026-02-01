# Budgieee - Complete Project Summary

> **Purpose**: This document summarizes the entire project for handover/debugging with ChatGPT.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework (App Router) |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Supabase | 2.39.x | Backend (PostgreSQL + Auth + RLS) |
| Recharts | 3.7.x | Pie charts for budget |

---

## Project Structure

```
budgieee/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page (dashboard)
│   ├── layout.tsx         # Root layout
│   ├── login/page.tsx     # Auth: sign in, sign up, forgot password
│   ├── budget/page.tsx    # Life Budget feature (~2900 lines)
│   ├── trips/page.tsx     # Trips & Splits feature (~2865 lines)
│   └── community/page.tsx # Community Deals feature (~2400 lines)
├── lib/                   # Shared utilities & Supabase repos
│   ├── supabaseClient.ts  # Supabase client initialization
│   ├── useSession.ts      # Auth hook (session state)
│   ├── authGuard.ts       # Route protection helpers
│   ├── getUser.ts         # Get current user info
│   ├── budgetRepo.ts      # Budget data operations
│   ├── tripsRepo.ts       # Trips/Groups data operations
│   ├── communityRepo.ts   # Community data operations
│   └── homeRepo.ts        # Home page stats
├── components/            # Shared components
│   ├── BottomNav.tsx      # Bottom navigation bar
│   ├── NavCard.tsx        # Navigation cards
│   └── AuthBox.tsx        # (deprecated, login moved to /login)
├── docs/
│   ├── SUPABASE_SCHEMA.md # Complete SQL schema (source of truth)
│   └── PROJECT_SUMMARY.md # This file
├── .env.local             # Environment variables (Supabase keys)
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
```

---

## Features Overview

### 1. Authentication (`/app/login/page.tsx`)
- Email + password sign in/up via Supabase Auth
- Forgot password flow
- Session persistence via `useSession` hook
- Route protection (redirects to /login if not authenticated)
- Dev bypass mode for testing without auth

### 2. Life Budget (`/app/budget/page.tsx` + `lib/budgetRepo.ts`)
- Monthly budget with total and per-category limits
- Add/edit/delete expenses
- Pie chart showing spent vs budget
- Progress bars per category (red when over budget)
- Week view toggle
- **Supabase Tables**: `budgets`, `budget_categories`, `budget_expenses`

### 3. Trips & Splits (`/app/trips/page.tsx` + `lib/tripsRepo.ts`)
- Create groups (e.g., "Bali Trip")
- Invite people by email (creates DB record, **NO EMAIL SENT**)
- Accept/decline pending invites
- Add shared expenses with equal/exact/percent splits
- Balance calculation (who owes whom)
- **Supabase Tables**: `groups`, `group_members`, `expenses`, `expense_splits`, `invites`
- **RPC Function**: `get_user_balances(p_user_id)`

### 4. Community Deals (`/app/community/page.tsx` + `lib/communityRepo.ts`)
- City communities (San Francisco, Buenos Aires, etc.)
- Personal Friends group (per-user, private)
- Join/leave communities
- Invite friends by email
- Posts, likes, comments, bookmarks (partially implemented)
- **Supabase Tables**: `communities`, `community_members`, `community_posts`, `community_post_likes`, `community_post_comments`, `community_post_bookmarks`, `community_invites`, `profile_settings`

---

## Supabase Schema Summary

### Authentication
- Uses Supabase Auth (`auth.users`)
- `auth.uid()` is the source of truth for user identity
- Trigger `handle_new_user()` auto-creates profile on signup

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | user_id, email, full_name, avatar_url |
| `budgets` | Monthly budgets | user_id, month, total_budget |
| `budget_categories` | Budget categories | user_id, month, name, emoji, limit_amount |
| `budget_expenses` | Individual expenses | user_id, category_id, amount, occurred_at |
| `groups` | Trip/split groups | name, emoji, owner_id |
| `group_members` | Group membership | group_id, user_id, role |
| `expenses` | Shared expenses | amount, paid_by, group_id |
| `expense_splits` | How expenses split | expense_id, user_id, share |
| `invites` | Group invites | invited_by, invited_email, group_id, status |
| `communities` | Community groups | name, emoji, kind, owner_id |
| `community_members` | Community membership | community_id, user_id, role |
| `community_invites` | Community invites | community_id, invited_email, status |

### Row Level Security (RLS)

All tables have RLS enabled with policies using `auth.uid()`.

**Known Issue**: Self-referencing policies cause "infinite recursion" errors. Fixed by creating `security definer` helper functions:

```sql
-- Example fix for group_members
create or replace function is_group_member(p_group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from group_members
    where group_id = p_group_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create policy "users can view group members"
on group_members for select
to authenticated
using (is_group_member(group_id));
```

---

## Current Issues

### 1. Invites Don't Send Emails
**Problem**: `inviteToGroup()` and `createInvite()` only create database records. No actual email is sent.

**Solution Options**:
- **Option A**: Supabase Edge Functions + email provider (Resend, SendGrid, Postmark)
- **Option B**: Use Supabase's built-in "Invite user by email" for auth (but this is for auth, not group invites)
- **Option C**: Webhook to external service

**Required Changes**:
1. Set up Edge Function in Supabase
2. Configure email provider (API key)
3. Trigger function when row inserted into `invites` table
4. Email contains link like: `https://budgieee.app/invite?token=xxx`

### 2. Infinite Recursion in RLS Policies
**Status**: Partially fixed for `community_members`, needs same fix for `group_members`.

**SQL to run**:
```sql
-- Drop all policies on group_members
drop policy if exists "users view group members" on group_members;
drop policy if exists "owners add members" on group_members;
drop policy if exists "owners remove members" on group_members;
drop policy if exists "users can view group members" on group_members;
drop policy if exists "users can join groups" on group_members;
drop policy if exists "users can leave groups" on group_members;

-- Create helper function
create or replace function is_group_member(p_group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from group_members
    where group_id = p_group_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Create clean policies
create policy "users can view group members"
on group_members for select to authenticated
using (is_group_member(group_id));

create policy "users can join groups"
on group_members for insert to authenticated
with check (
  user_id = auth.uid()
  or exists (select 1 from groups where id = group_id and owner_id = auth.uid())
);

create policy "users can leave groups"
on group_members for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from groups where id = group_id and owner_id = auth.uid())
);
```

---

## Key Files Summary

### `lib/supabaseClient.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
```

### `lib/useSession.ts`
- Hook that manages auth state
- Returns `{ user, session, loading, isAuthenticated }`
- Handles dev bypass mode
- Listens for auth state changes

### `lib/tripsRepo.ts`
Functions:
- `getMyGroups()` - Get all groups user is member of
- `createGroup(name, emoji)` - Create new group
- `deleteGroup(groupId)` - Delete group (owner only)
- `inviteToGroup(groupId, email)` - Create invite record
- `getMyPendingInvites()` - Get invites sent to user's email
- `acceptInvite(inviteId)` - Accept and join group
- `declineInvite(inviteId)` - Decline invite
- `leaveGroup(groupId)` - Leave a group
- `getGroupExpenses(groupId)` - Get expenses for group
- `addExpense(...)` - Add expense with splits
- `deleteExpense(expenseId)` - Delete expense
- `getMyBalances()` - Get overall balance summary
- `getGroupBalances(groupId)` - Get balances within group

### `lib/communityRepo.ts`
Functions:
- `ensurePersonalFriendsMembership()` - Ensure user has personal group
- `getVisibleCommunitiesWithCounts()` - Get communities with member counts
- `joinCommunity(communityId)` - Join a community
- `leaveCommunity(communityId)` - Leave a community
- `createInvite(communityId, email)` - Invite to community
- `isPersonalFriendsCode(code)` - Check if personal friends group

---

## How Invites Currently Work (Database Only)

1. User A clicks "Invite by Email" in a group
2. Frontend calls `inviteToGroup(groupId, email)`
3. This inserts row into `invites` table:
   ```
   { invited_by: userA.id, invited_email: "friend@email.com", group_id: "xxx", status: "pending" }
   ```
4. **NO EMAIL IS SENT** - just database record
5. When User B (friend@email.com) logs in:
   - `getMyPendingInvites()` queries invites where `invited_email = their email`
   - Shows pending invites in UI
6. User B clicks Accept → `acceptInvite(inviteId)`:
   - Updates invite status to 'accepted'
   - Inserts into `group_members`

**To actually send emails**, need to:
1. Create Supabase Edge Function
2. Use database trigger or call function after insert
3. Send email with provider API

---

## Next Steps to Fix Email Invites

### Option A: Supabase Edge Functions (Recommended)

1. **Create Edge Function** (`supabase/functions/send-invite-email/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { invited_email, inviter_name, group_name } = await req.json()
  
  // Use Resend, SendGrid, or other provider
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Budgieee <noreply@budgieee.app>",
      to: invited_email,
      subject: `${inviter_name} invited you to ${group_name}`,
      html: `<p>Click <a href="https://budgieee.app/login">here</a> to join!</p>`,
    }),
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

2. **Call from frontend** after creating invite:
```typescript
// In tripsRepo.ts after successful insert
await supabase.functions.invoke('send-invite-email', {
  body: { invited_email: email, inviter_name: 'You', group_name: 'Bali Trip' }
})
```

3. **Or use Database Trigger** to automatically call function on insert

---

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Supabase
# All schema changes done via Supabase Dashboard SQL Editor
```

---

## Summary for ChatGPT

**What's working**:
- Authentication (sign up, sign in, session)
- Budget feature (expenses, categories, charts)
- Groups creation and viewing
- Expense splitting and balance calculation
- Community browsing and joining

**What's NOT working**:
1. **Email invites** - Only creates DB record, no email sent
2. **group_members RLS** - May still have infinite recursion (run SQL fix above)

**To fix email invites**, you need to:
1. Set up email provider (Resend recommended - free tier available)
2. Create Supabase Edge Function to send emails
3. Call function when invite is created

Let me know if you need the Edge Function code or Resend setup instructions.
