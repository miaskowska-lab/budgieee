# Budgieee – Deploy readiness & test checklist

Use this checklist to confirm the app is fully functional and ready to deploy on Vercel. Run through it before and after deployment.

---

## 1. Pre-deploy: local setup

### 1.1 Environment variables

- [ ] `.env.local` exists in project root with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_DEV_BYPASS_AUTH=false`
  - `RESEND_API_KEY` (for server-side notifications)
  - `SUPABASE_SERVICE_ROLE_KEY` (for server-side notifications)
  - `NOTIF_FROM_EMAIL` (optional, e.g. `"Budgieee <notifications@budgieee.com>"`)

### 1.2 Build (no errors)

```bash
npm install
npm run build
```

- [ ] Build completes with **0 errors**. Fix any TypeScript or build errors before deploying.

### 1.3 Email tests

```bash
npm run test:emails
```

- [ ] All 5 tests pass (CORS, Edge Function, Budget Alert, Welcome, Community Post).
- [ ] If any fail, fix env vars or Supabase Edge Function deployment/secrets.

---

## 2. Manual test flows (local: `npm run dev`, then http://localhost:3000)

### 2.1 Auth

- [ ] **Sign up** – New user can create account (email + password).
- [ ] **Sign in** – Existing user can log in.
- [ ] **Sign out** – Sign out works and redirects appropriately.
- [ ] **Protected routes** – Logged-out user is redirected from /trips, /community, /budget (or equivalent protected pages).

### 2.2 Trips & splits

- [ ] **Create group** – Create a new trip group; it appears in the list.
- [ ] **Invite by email** – Invite someone (e.g. a real email you can check); invite is sent (no CORS/network error in DevTools → Network).
- [ ] **Pending invite** – Invited user can see pending invite after signing in (or in invite list).
- [ ] **Accept invite** – Accepting adds user to group; group and members update.
- [ ] **Add expense** – Add an expense to a group; it appears for all members.
- [ ] **Balances** – Balances (who owes whom) show correctly for the group.

### 2.3 Community

- [ ] **Communities list** – Communities load (e.g. city, Personal Friends); no blank or broken UI.
- [ ] **Join community** – Can join a community (where allowed, e.g. Minerva email for city).
- [ ] **Feed** – Open a community feed; posts load (or empty state shows).
- [ ] **Create post** – Create a deal/post; it appears in the feed.
- [ ] **Like / bookmark** – Like and bookmark a post; state updates (and persists on refresh if backed by DB).
- [ ] **Comments** – Open comments, add a comment; it appears.
- [ ] **Community invite** – Invite by email to a community (e.g. Personal Friends); email is sent (check Network tab for success).

### 2.4 Budget

- [ ] **Budget page loads** – No crash; categories or empty state show.
- [ ] **Set budget** – Set a category budget; it saves and displays.
- [ ] **Add expense** – Log an expense; it appears and affects totals/charts.
- [ ] **Charts** – Any pie/bar charts render without errors.

### 2.5 Home & nav

- [ ] **Home** – Stats or placeholder load; no errors.
- [ ] **Bottom nav** – All tabs (Home, Trips, Community, Budget, etc.) work and don’t crash.
- [ ] **Settings / profile** – If present, open without errors.

### 2.6 Network & console

- [ ] **No CORS errors** – DevTools → Network: no red CORS failures for Supabase or Edge Functions.
- [ ] **No repeated errors in Console** – DevTools → Console: no uncaught errors or repeated 401/500 for normal flows.

---

## 3. Endpoints & API

- [ ] **Supabase** – All data (groups, invites, posts, budget, etc.) loads from Supabase (no “mock only” or missing data when logged in).
- [ ] **Edge Function (invites)** – Sending an invite (Trips or Community) triggers `send-invite-email` and returns success (check Network for 200, not 401/500/CORS).
- [ ] **Resend** – If you have server-side notification routes (e.g. cron or API routes that send email), they run without error when triggered (optional: trigger one and check inbox).

---

## 4. Vercel deploy checklist

### 4.1 Env vars on Vercel

In Vercel: **Project → Settings → Environment Variables**. Add (for Production, and optionally Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIF_FROM_EMAIL` (optional)

- [ ] All required variables set; no typos in names.

### 4.2 Build on Vercel

- [ ] Deploy (e.g. push to `main` or trigger deploy); build succeeds.
- [ ] No build-time errors in Vercel logs.

### 4.3 Post-deploy checks

- [ ] **Open live URL** – Site loads (no 500 or blank page).
- [ ] **Sign in** – Auth works with production Supabase.
- [ ] **One full flow** – e.g. create group → invite by email → confirm email received; or create post → like → comment.
- [ ] **Supabase redirect URL** – In Supabase Dashboard → Authentication → URL Configuration, add the Vercel URL (e.g. `https://your-app.vercel.app`) to Site URL and Redirect URLs so auth redirects work.

---

## 5. Quick commands summary

| Action              | Command              |
|---------------------|----------------------|
| Install deps        | `npm install`        |
| Build               | `npm run build`      |
| Run dev             | `npm run dev`        |
| Run email tests     | `npm run test:emails`|

---

## 6. If something breaks

- **Build fails** – Fix TypeScript/lint errors; run `npm run build` locally until it passes.
- **CORS on invite** – Edge Function must return CORS headers and handle OPTIONS; redeploy: `npx supabase functions deploy send-invite-email`.
- **401 on invite** – User must be logged in; Edge Function expects a valid user JWT (browser sends it automatically when logged in).
- **Emails not sending** – Check Resend API key in `.env.local` and in Vercel env vars; run `npm run test:emails`.
- **Auth redirect** – Add Vercel URL to Supabase Auth redirect URLs.

---

When all checked items pass, the app is ready for production use on Vercel.
