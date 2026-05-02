# Resend Setup — Veritor Group

Wires the contact form to real email delivery. Until this is done,
form submissions are persisted (if `DATABASE_URL` is set) but the team
notification + auto-reply emails are silently skipped — the user still
sees a success message.

---

## Step 1 — Sign up for Resend

1. Go to **https://resend.com**
2. Click **Sign up** (free plan: 3,000 emails/month, 100/day)
3. Verify your email

## Step 2 — Add your sending domain

1. Dashboard → **Domains** → **Add Domain**
2. Enter your real domain (e.g. `veritorgroup.com`) — **not** your enquiry inbox subdomain
3. Region: pick the one closest to your audience. For a US-targeted site, use **`US East (N. Virginia)`**.

Resend will display 3–4 DNS records to add (SPF/TXT, DKIM, MX/DMARC). Keep that page open.

## Step 3 — Add DNS records at your registrar

Log into wherever you bought the domain and add the records Resend showed you. Common registrars:

- **Vercel Domains** (if you bought through Vercel): Project → Domains → DNS Records → Add
- **Cloudflare:** Dashboard → Domain → DNS → Records → Add (set Cloudflare proxy to **DNS Only**, grey cloud)
- **GoDaddy:** My Products → Domains → DNS → Add Record
- **Namecheap:** Domain List → Manage → Advanced DNS → Add New Record

Each record has:
- Type (TXT / CNAME / MX)
- Host/Name (e.g. `send`, `resend._domainkey`)
- Value (long string from Resend)

Add **all of them**, including the optional DMARC record — DMARC dramatically improves deliverability and is increasingly required by Gmail/Yahoo for cold-list senders.

After adding, wait 5–30 minutes, then click **Verify DNS Records** in Resend. All records must show green.

## Step 4 — Create an API key

1. Resend dashboard → **API Keys** → **Create API Key**
2. Name: `Veritor Website (production)`
3. Permission: **Sending access**
4. Copy the `re_...` key — only shown once

For local dev, create a second key named `Veritor Website (dev)` so you can revoke them independently.

## Step 5 — Update sender + recipient addresses

The site reads addresses from one place: [`src/lib/site.ts`](src/lib/site.ts).

```ts
email: "team@veritorgroup.com",                          // where leads land
emailFrom: "Veritor Group <enquiries@veritorgroup.com>", // From: on outgoing email
```

Update these to match the addresses you actually own once your email host is set up. Both addresses must be on a domain you've verified in Resend (Step 2).

You'll also want **`privacyEmail`** in the same file (used by the privacy policy + autoreply unsubscribe link):

```ts
legal: {
  privacyEmail: "privacy@veritorgroup.com",
}
```

## Step 6 — Add the key locally

Copy the example file and fill in your dev key:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
RESEND_API_KEY=re_YOUR_DEV_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

Restart the dev server:

```bash
npm run dev
```

Submit the contact form on `http://localhost:3100/contact`. You should:
1. Receive the team notification at `team@veritorgroup.com`
2. The form submitter should receive the auto-reply
3. Status code on `POST /api/contact` should be `200`

## Step 7 — Add the key in production (Vercel)

Once Vercel is linked (see [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)):

1. Vercel project → **Settings** → **Environment Variables**
2. Add `RESEND_API_KEY` with your **production** key — Apply to **Production** only
3. Add `RESEND_API_KEY` again with your **dev** key — Apply to **Preview** + **Development**
4. Add `NEXT_PUBLIC_SITE_URL` with your real production domain (e.g. `https://veritorgroup.com`) — Apply to **Production**
5. Redeploy

Or via CLI:

```bash
vercel env add RESEND_API_KEY production
vercel env add RESEND_API_KEY preview
vercel env add NEXT_PUBLIC_SITE_URL production
```

## Step 8 — Test in production

1. Submit the contact form on the live site
2. Confirm:
   - Success page (`/thanks`) loads
   - Team email arrives at `team@veritorgroup.com`
   - Reply-To header on the team email is the seller's email (so you can reply directly)
   - Auto-reply arrives in the seller's inbox
   - Auto-reply has CAN-SPAM footer (sender, postal address, unsubscribe instructions)

## Step 9 — Monitor deliverability

Once you start getting traffic:

- **Resend dashboard → Logs** — every send attempt with status (delivered / bounced / complained)
- **Resend dashboard → Suppressions** — addresses that bounced or unsubscribed; never re-send to them
- **Postmaster Tools** — set up Google Postmaster + Yahoo Sender Hub once domain has volume; check spam-rate, IP reputation, DMARC compliance

If deliverability drops below 95%, check:
- DMARC alignment (`p=quarantine` or `p=reject` only after 30 days at `p=none`)
- Whether your `From:` domain matches the verified Resend domain
- Whether you're sending to suppressed addresses

---

## Where the code lives

| What | Where |
|---|---|
| API route handling form posts | [src/app/api/contact/route.ts](src/app/api/contact/route.ts) |
| Form component | [src/components/ContactForm.tsx](src/components/ContactForm.tsx) |
| Auto-reply template (EN/ES/RU) | [src/lib/email/autoreply.ts](src/lib/email/autoreply.ts) |
| Sender/recipient addresses | [src/lib/site.ts](src/lib/site.ts) |
| Lead persistence (Neon Postgres) | [src/lib/db/leads.ts](src/lib/db/leads.ts) |
| Honeypot + rate limit + Zod | [src/lib/security/](src/lib/security/) + [src/lib/rate-limit.ts](src/lib/rate-limit.ts) |

## Free tier limits

- **3,000 emails/month** total (team notification + autoreply combined)
- **100 emails/day**
- For an ad-driven lead-gen site, that's typically enough until you hit ~50+ leads/day. Upgrade to Pro ($20/mo, 50K emails) when you start running broader marketing campaigns.

## Compliance reminders

- The autoreply template at [src/lib/email/autoreply.ts](src/lib/email/autoreply.ts) already includes a **CAN-SPAM-compliant footer** (sender identity, postal address, unsubscribe instructions). Don't remove it.
- The postal address is read from `SITE.address` in [src/lib/site.ts](src/lib/site.ts). It currently shows `[Business address — to be filled in]` — fill it in before sending real autoreplies.
- TCPA consent for phone/SMS is captured at the form-submit point in [src/components/ContactForm.tsx](src/components/ContactForm.tsx). Don't disable that consent block.
