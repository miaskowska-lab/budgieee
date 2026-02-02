# Email deliverability (avoid spam)

Invite emails are sent from **Budgieee &lt;no-reply@budgieee.com&gt;** via Resend. To stop them going to spam, verify your domain in Resend and add the DNS records below.

## 1. Add and verify domain in Resend

1. Go to **[Resend → Domains](https://resend.com/domains)**.
2. Click **Add Domain**.
3. Enter **`budgieee.com`** (or a subdomain like **`send.budgieee.com`** — subdomains are recommended for sending).
4. Resend will show you **DNS records** to add. You need at least:
   - **SPF** (TXT)
   - **DKIM** (TXT)
   - Optionally **MX** for return-path (bounces).

## 2. Add DNS records at your DNS provider

Add the **exact** records Resend shows. Example shape:

| Type | Name/Host | Value |
|------|-----------|--------|
| TXT | `@` or `budgieee.com` | (SPF value from Resend, e.g. `v=spf1 include:resend.com ~all`) |
| TXT | (DKIM name from Resend) | (DKIM value from Resend) |
| MX | `send` (if Resend shows it) | (MX target from Resend) |

Where you add them depends on your provider (e.g. Cloudflare, Namecheap, Vercel, etc.).  
If you use a **subdomain** like `send.budgieee.com`, the “Name” for each record will be that subdomain (e.g. `send`).

## 3. Verify in Resend

1. After saving DNS, wait 5–15 minutes (or up to 48 hours).
2. In Resend → Domains → your domain, click **Verify DNS Records**.
3. When status is **Verified**, you’re done.

## 4. (Optional) Add DMARC for more trust

Add a DMARC TXT record so providers know what to do if SPF/DKIM fail:

| Type | Name | Value |
|------|------|--------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@budgieee.com` |

You can change `p=none` to `p=quarantine` or `p=reject` later if you want stricter policy.

## 5. Sending address in the app

- If you verified **budgieee.com**, keep sending from:  
  `no-reply@budgieee.com` (already set in the Edge Function).
- If you verified **send.budgieee.com**, set the Supabase secret:  
  `FROM_EMAIL=Budgieee <no-reply@send.budgieee.com>`  
  so the app uses the verified subdomain.

## Quick checklist

- [ ] Domain added in Resend (budgieee.com or send.budgieee.com)
- [ ] SPF TXT record added in DNS
- [ ] DKIM TXT record added in DNS
- [ ] Optional: MX and/or DMARC added
- [ ] Resend shows domain as **Verified**
- [ ] If using subdomain: `FROM_EMAIL` secret set to that address

After this, invite emails should land in inbox more consistently. If they still go to spam, wait 24–48 hours for DNS and reputation to propagate.
