# Run deploy tests (give this to Cursor)

Use this to verify the Budgieee site is fully functional and ready to deploy on Vercel—no glitching, no broken endpoints.

---

## Step 1: Automated checks (run these in order)

In the project root, run:

```bash
npm install
npm run build
npm run test:emails
```

- **All three must succeed.** If `npm run build` fails, fix TypeScript/build errors. If `npm run test:emails` fails, fix env vars (`.env.local`) or Supabase Edge Function deployment.
- Optional one-liner: `npm run test:ready` (runs build + email tests).

---

## Step 2: Start dev server and manual test

```bash
npm run dev
```

Open **http://localhost:3000**. Then follow **docs/DEPLOY_TEST_CHECKLIST.md** sections **2** and **3**:

- **2.1–2.6**: Auth, Trips & splits, Community, Budget, Home & nav, and check Network/Console for no CORS or repeated errors.
- **3**: Confirm all data comes from Supabase and that invite emails hit the Edge Function (Network tab: 200 on `send-invite-email`, no CORS/401).

---

## Step 3: Vercel deploy checklist

Before and after deploying to Vercel, follow **docs/DEPLOY_TEST_CHECKLIST.md** section **4**:

- Set env vars in Vercel (same as `.env.local`).
- Confirm build succeeds on Vercel.
- Add Vercel URL to Supabase Auth redirect URLs.
- Do one full flow on the live URL (e.g. sign in, create group, send invite).

---

## Quick reference

| Command | Purpose |
|--------|--------|
| `npm install` | Install dependencies |
| `npm run build` | Production build (must pass) |
| `npm run test:emails` | Email + Edge Function tests (must pass) |
| `npm run test:ready` | Build + email tests in one go |
| `npm run dev` | Local dev server for manual testing |

Full checklist with every checkbox: **docs/DEPLOY_TEST_CHECKLIST.md**.
