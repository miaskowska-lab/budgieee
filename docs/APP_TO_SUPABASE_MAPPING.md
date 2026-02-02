# App → Supabase: Tables & RPCs

Every app feature and the Supabase tables/RPCs it uses. Run the SQL in `SUPABASE_SCHEMA.md` (Blocks A–E) first, then **SUPABASE_MISSING_TABLES.sql** (community + settings + notifications). Run order: 1) Schema Blocks A–E, 2) Missing tables file. If your project doesn’t have the community/settings tables yet.

---

## 1. Auth & profiles

| App use | Supabase |
|--------|----------|
| Login / signup | `auth.users` (Supabase Auth) |
| Profile row per user | `profiles` (trigger `handle_new_user` on signup) |
| Session | `supabase.auth.getSession()` |

**profiles** (from schema): `user_id`, `email`, `full_name`, `avatar_url`, `created_at`  
`display_name` and `avatar_color` are added in `SUPABASE_MISSING_TABLES.sql` (ALTER).

---

## 2. Life Budget

| App use | Supabase table |
|--------|-----------------|
| Monthly budget | `budgets` |
| Categories | `budget_categories` |
| Expenses | `budget_expenses` |

**Repo:** `lib/budgetRepo.ts`  
**Schema:** Block A in `SUPABASE_SCHEMA.md`

---

## 3. Trips & splits

| App use | Supabase table / RPC |
|--------|----------------------|
| Groups | `groups` |
| Members | `group_members` |
| Invites | `invites` |
| Expenses | `expenses` |
| Splits | `expense_splits` |
| Balances | RPC `get_user_balances(p_user_id)` |
| Profiles (names) | `profiles` |

**Repo:** `lib/tripsRepo.ts`  
**Schema:** Blocks B, C, D1, D2, E1, E2, E3 in `SUPABASE_SCHEMA.md`

---

## 4. Community deals

| App use | Supabase table / RPC |
|--------|----------------------|
| List communities | `communities` |
| Join/leave/members | `community_members` |
| Invites | `community_invites` |
| Personal Friends | RPC `ensure_personal_friends_membership` |
| Default memberships | RPC `ensure_default_community_memberships` |
| My communities | RPC `get_my_communities` |
| Feed | RPC `get_community_feed(p_community_id)` |
| Saved deals | RPC `get_saved_deals` |
| Create post | `posts` |
| Like/unlike | `post_likes` |
| Bookmark | `post_bookmarks` |
| Comments | `post_comments`, RPC `get_post_comments(p_post_id)` |
| Points | RPC `get_user_points` |

**Repo:** `lib/communityRepo.ts`  
**Schema:** All community tables and RPCs are in `SUPABASE_MISSING_TABLES.sql`. Block F (policy only) is optional—same policy is in that file.

---

## 5. User settings (notifications)

| App use | Supabase |
|--------|----------|
| Get settings | RPC `get_user_settings` |
| Update settings | RPC `update_user_settings(p_notif_community, p_notif_trips, p_notif_budget, p_digest_hour)` |

**Repo:** `lib/userSettings.ts`  
Table `profile_settings` and RPCs `get_user_settings`, `update_user_settings` are in `SUPABASE_MISSING_TABLES.sql`.

---

## 6. Home dashboard

| App use | Supabase table |
|--------|-----------------|
| Profile / name | `profiles` |
| Budget total / spent | `budgets`, `budget_expenses` |
| Community pts / deals / saved / trips net | Fetched via `getHomeDashboard()` (currently budget only; community/trips can be wired to RPCs/tables above) |

**Repo:** `lib/homeRepo.ts`

---

## 7. Notifications (cron)

| App use | Supabase |
|--------|----------|
| Mark delivered | RPC `mark_notifications_delivered` |
| Create event | RPC `create_notification_event` |

**Repo:** `lib/notifications.ts`  
Table `notification_events` and RPCs `create_notification_event`, `get_pending_notifications`, `mark_notifications_delivered` are in `SUPABASE_MISSING_TABLES.sql`.

---

## Quick checklist

- [ ] Blocks A–E from `SUPABASE_SCHEMA.md` applied (budget, profiles, groups, expenses, invites, `get_user_balances`).
- [ ] `SUPABASE_MISSING_TABLES.sql` applied (communities, community_members, community_invites, posts, post_likes, post_bookmarks, post_comments, user_points, profile_settings, notification_events + all RPCs).
- [ ] RPCs exist: `get_user_balances` (schema), `ensure_personal_friends_membership`, `ensure_default_community_memberships`, `get_my_communities`, `get_community_feed`, `get_saved_deals`, `get_post_comments`, `get_user_points`, `get_user_settings`, `update_user_settings`, `create_notification_event`, `get_pending_notifications`, `mark_notifications_delivered` (all in missing tables file).
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
