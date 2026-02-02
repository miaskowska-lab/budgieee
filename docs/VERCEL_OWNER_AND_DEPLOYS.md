# Make your pushes deploy to Vercel (you as author/owner)

Your repo: **miaskowska-lab/budgieee** on GitHub. Branch: **main**.

For **your** pushes to update the live Vercel site, do one of the following.

---

## Option A: You already push to this repo (most common)

If you push to **main** on **https://github.com/miaskowska-lab/budgieee**:

1. **Vercel** must be connected to that repo and the **main** branch (Vercel → Project → Settings → Git).
2. **You** need **push access** to the repo. On GitHub: repo → **Settings → Collaborators** (or **Manage access**). Your account should be there with **Write** (or Admin). If not, the repo owner adds you.
3. Then: `git push origin main` → Vercel auto-deploys (no need to be “author” in Vercel; the Git connection is per repo, not per person).

So: **push to the same repo/branch Vercel uses**, and you’re set.

---

## Option B: You want to own the Vercel project (author/owner)

If the Vercel project was created by someone else and you want to **own** it (control env vars, domain, billing, etc.):

1. **Current owner** goes to [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings → Team** (or **Members**).
2. They **invite you** and set your role to **Owner**, or use **Transfer Project** to move the project to your account.
3. After that, you’re the author/owner; your pushes to the connected repo still trigger deploys the same way.

If you’d rather have the project under **your** Vercel account from scratch:

1. In **your** Vercel account: **Add New Project** → **Import** the same repo (**miaskowska-lab/budgieee**). You need at least read access (or better, write) to that repo.
2. Connect **main** as the production branch, add env vars, deploy.
3. Then only this project (under your account) will be “yours”; the old one can be deleted or left for the other person.

---

## Quick check

- **“When I push, does Vercel update?”**  
  Yes, if (1) Vercel is connected to **miaskowska-lab/budgieee** and branch **main**, and (2) you can push to that repo (`git push origin main`).

- **“Can I make myself author so when I push it updates to Vercel main?”**  
  Pushes to **main** on the repo Vercel is using already update Vercel. To be the **owner** of the Vercel project, use Option B (invite as Owner or transfer / import under your account).
