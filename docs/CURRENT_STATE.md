# Budgieee – Current State of Every File

Snapshot as of this write. Paths are from project root.

---

## Root

| File | State |
|------|--------|
| **package.json** | `budgieee` 0.1.0, Next 14, React 18, Supabase JS, recharts; scripts: dev, build, start, supabase |
| **.env.local** | `NEXT_PUBLIC_SUPABASE_URL` = https://zestpsjkfrsagnazjorg.supabase.co, `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sb_publishable_..., `NEXT_PUBLIC_DEV_BYPASS_AUTH` = false |
| **.gitignore** | node_modules, .next, out, .env*.local, .env, .DS_Store, etc. |
| **next.config.js** | Webpack watchOptions for dev (ignore node_modules/.git, poll) to reduce EMFILE |
| **tsconfig.json** | Strict, paths `@/*` → `./*`, Next plugin |
| **vercel.json** | Cron: `/api/cron/notifications` every 15 min |

---

## app/

| File | State |
|------|--------|
| **layout.tsx** | Root layout: globals.css, BottomNav, NavVisibilityProvider; metadata title/description Budgieee |
| **page.tsx** | Home (client): useSession, home stats (homeRepo), user panel, settings (userSettings), displayName/avatarColor/currency/notifications, sign out |
| **login/page.tsx** | Login page (Supabase auth) |
| **budget/page.tsx** | Life Budget: budgets, categories, expenses; pie chart = **budget allocation by category** (from “Build your budget”); expenses tracked below; uses budgetRepo, getCategoriesWithSpent, etc. |
| **trips/page.tsx** | Trips & splits: groups, invites, expenses, balances; uses tripsRepo, get_user_balances |
| **community/page.tsx** | Community Deals: list communities, join/leave, feed, saved, Minerva join-gate; uses communityRepo (getVisibleCommunitiesWithCounts, joinCommunity, createInvite, etc.) |
| **api/cron/notifications/route.ts** | Cron handler for notification digest (calls notifications lib) |

---

## components/

| File | State |
|------|--------|
| **BottomNav.tsx** | Bottom nav (Budget, Home, Trips, Deals); active state by pathname; BOTTOM_NAV_HEIGHT 72; NavVisibilityProvider/useNavVisibility |
| **AuthBox.tsx** | Auth UI (login/signup) |
| **NavCard.tsx** | Nav card component |

---

## lib/

| File | State |
|------|--------|
| **supabaseClient.ts** | createClient(url, anonKey); isSupabaseConfigured; mock client if env missing |
| **useSession.ts** | useSession() – getSession with 4s timeout so app doesn’t hang |
| **authGuard.ts** | Auth redirect helpers |
| **getUser.ts** | User fetch helper |
| **homeRepo.ts** | fetchAllHomeStats – profiles, budgets, budget_expenses (and placeholders for community/trips) |
| **budgetRepo.ts** | ensureBudgetSeed, getBudget, getCategoriesWithSpent, addExpense, deleteExpense, updateCategoryBudget, createCategory, etc.; tables: budgets, budget_categories, budget_expenses |
| **tripsRepo.ts** | Groups, group_members, invites, expenses, expense_splits; RPC get_user_balances; tables: groups, group_members, invites, expenses, expense_splits, profiles |
| **communityRepo.ts** | **Uses remote table names:** communities, community_members, community_invites, **community_posts**, **community_post_likes**, **community_post_bookmarks**, **community_post_comments**. RPCs: ensure_personal_friends_membership, ensure_default_community_memberships, get_community_feed, get_my_community_points. getMyCommunities implemented via getVisibleCommunitiesWithCounts + community_members. getSavedDeals and getPostComments implemented client-side (no RPC). Feed response mapped to Post (author_display_name → author_name). |
| **userSettings.ts** | getUserSettings, updateUserSettings; RPCs get_user_settings, update_user_settings; fallback to localStorage when Supabase not configured |
| **notifications.ts** | Email via Resend; processHighPriorityNotifications, processDigestNotifications; createNotificationEvent; RPCs get_pending_notifications, mark_notifications_delivered, create_notification_event |

---

## styles/

| File | State |
|------|--------|
| **globals.css** | Global styles (incl. budget, community, nav, etc.) |

---

## supabase/

| File | State |
|------|--------|
| **config.toml** | Local Supabase config (project_id budgieee, api/db ports, etc.) |
| **functions/send-invite-email/index.ts** | Edge Function: body invited_email, inviter_name, group_name; RESEND_API_KEY required; FROM_EMAIL default `Budgieee <no-reply@budgieee.com>`; SITE_URL for login link; sends HTML email via Resend |
| **functions/send-invite-email/deno.json** | Deno config for function |
| **migrations/20260202012403_remote_schema.sql** | First pulled remote schema |
| **migrations/20260202022722_remote_schema.sql** | Second pulled remote schema; **storage triggers commented out** (delete_prefix_hierarchy_trigger, objects_insert_prefix_trigger, objects_update_prefix_trigger, prefixes_insert_trigger) so `supabase start` runs locally |

---

## docs/

| File | State |
|------|--------|
| **APP_TO_SUPABASE_MAPPING.md** | Mapping of app features to Supabase tables/RPCs; run order Schema A–E then SUPABASE_MISSING_TABLES.sql; SQL Editor table names (community_posts, etc.); checklist |
| **PROJECT_SUMMARY.md** | Project overview |
| **SUPABASE_SCHEMA.md** | Blocks A–F: budgets, profiles, friendships, groups, group_members, expenses, expense_splits, invites, get_user_balances, community_members Minerva policy |
| **SUPABASE_MISSING_TABLES.sql** | Community + settings + notifications tables and RPCs (communities, community_members, community_invites, posts, post_likes, post_bookmarks, post_comments, user_points, profile_settings, notification_events + all RPCs); profiles display_name/avatar_color ALTER; community_members insert policy (Minerva/private) |
| **SUPABASE_RLS_COMMUNITY_MEMBERS_MINERVA.sql** | Standalone RLS for community_members insert (Minerva or private) |
| **CURRENT_STATE.md** | This file |

---

## scripts/

| File | State |
|------|--------|
| **invoke-send-invite-email.sh** | Curl to **local** send-invite-email (127.0.0.1:54321) with local Publishable key; body invited_email, inviter_name, group_name |

---

## public/

| File | State |
|------|--------|
| **budgie-mascot.png** | App mascot asset |

---

## Summary

- **App:** Next 14, React 18, Supabase (project zestpsjkfrsagnazjorg). Home, Budget, Trips, Community, Login; bottom nav; session with 4s timeout.
- **Budget:** Pie chart = budget allocation by category (Build your budget); expenses below.
- **Community:** Uses DB tables community_posts, community_post_likes, community_post_bookmarks, community_post_comments; RPC get_community_feed, get_my_community_points; getMyCommunities/getSavedDeals/getPostComments implemented in app where RPCs missing.
- **Edge Function:** send-invite-email uses Resend, FROM_EMAIL default no-reply@budgieee.com; RESEND_API_KEY in Supabase secrets for deployed; test with user JWT when JWT is on.
- **Local Supabase:** Migrations have storage triggers commented out so `supabase start` succeeds.
- **Curl (hosted):** Use user token from Local Storage (access_token) in `Authorization: Bearer` when JWT is on; body: invited_email, inviter_name, group_name.
