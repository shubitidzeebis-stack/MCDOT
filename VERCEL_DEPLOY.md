# Vercel Deploy — Veritor Group

End-to-end walkthrough for shipping the site to production. Do this **after**
you've got Resend wired locally per [RESEND_SETUP.md](RESEND_SETUP.md).

---

## Step 1 — Vercel account

1. Go to **https://vercel.com/signup**
2. Sign up with GitHub (recommended — gives you automatic preview deploys per branch later)
3. The free **Hobby** plan is fine to start. Upgrade to **Pro ($20/mo)** when you start running paid ads — Hobby has a soft limit on bandwidth + serverless invocations that ad traffic can exceed quickly.

## Step 2 — Install Vercel CLI

```bash
npm i -g vercel
vercel --version
```

Then log in:

```bash
vercel login
```

It opens a browser, you confirm, done.

## Step 3 — Link this project

From the project root (`/Users/filthyrichtrevislee/Desktop/MCDOT`):

```bash
vercel link
```

Pick **Link to existing project: No → Create new project**. When asked:
- Project name: `veritor-website` (or whatever you prefer)
- Directory: `.` (current)
- Settings: accept the defaults — Vercel auto-detects Next.js

A `.vercel/` folder appears. Don't commit it (already in `.gitignore`).

## Step 4 — Provision the database (Neon Postgres)

The lead form persists every submission to Postgres. In production we use
**Neon** via the Vercel Marketplace (free tier is plenty).

1. Vercel dashboard → your project → **Storage** tab → **Create Database**
2. Pick **Neon** (Postgres) → choose **US East** for region → **Continue**
3. Accept the marketplace terms → **Create**

Vercel auto-injects `DATABASE_URL` (and a few other Neon env vars) into all
three environments. No manual env-var copy needed.

If you want the same connection locally:

```bash
vercel env pull .env.local
```

That writes the production `DATABASE_URL` into your `.env.local`. Restart `npm run dev`
and the local form will write to the same database. (You can scope to a separate
dev DB later if you want isolation; for now one DB is fine.)

## Step 5 — Add Resend + site URL env vars

Run these from the project root, picking the right key per environment:

```bash
# Production — your real Resend prod key
vercel env add RESEND_API_KEY production

# Preview + Development — your dev key
vercel env add RESEND_API_KEY preview
vercel env add RESEND_API_KEY development

# Site URL — production only (preview/dev will use Vercel's auto-injected URL)
vercel env add NEXT_PUBLIC_SITE_URL production
```

When prompted for `NEXT_PUBLIC_SITE_URL`, paste your real domain with `https://`
and **no trailing slash** — e.g. `https://veritorgroup.com`.

You can verify everything's set:

```bash
vercel env ls
```

## Step 6 — First production deploy

```bash
vercel --prod
```

Watch the build. If it succeeds, you'll get a URL like
`https://veritor-website.vercel.app`.

Open it. Click through every page. Submit the contact form. Confirm:
- Form submits, redirects to `/thanks`
- Email arrives at your team inbox
- Auto-reply lands in your seller-test inbox
- Privacy + Terms render with the correct effective date
- `/sitemap.xml` and `/robots.txt` resolve

## Step 7 — Add your custom domain

1. Vercel project → **Settings** → **Domains** → **Add**
2. Enter your real domain (e.g. `veritorgroup.com`)
3. Vercel shows DNS records to add at your registrar:
   - **For root domain** (`veritorgroup.com`): `A` record → `76.76.21.21`
   - **For `www` subdomain**: `CNAME` → `cname.vercel-dns.com`
4. Add both records at your registrar (or, if you bought through Vercel Domains, this is one click)
5. Wait for DNS propagation — usually 5–60 minutes
6. Once verified, Vercel auto-issues an SSL certificate (Let's Encrypt)

After it's live, set the **primary domain** to `veritorgroup.com` (the apex/root)
and have Vercel redirect `www.veritorgroup.com` → `veritorgroup.com`. Or the
other way around. Pick one and stick with it for SEO.

Update `NEXT_PUBLIC_SITE_URL` in Vercel to match your final canonical domain
choice and redeploy.

## Step 8 — Verify the production setup

| Check | Expected |
|---|---|
| `https://yourdomain.com` loads with the hero and Veritor logo | ✅ |
| `https://yourdomain.com/sitemap.xml` returns the sitemap | ✅ |
| `https://yourdomain.com/robots.txt` allows `/`, disallows `/api/` | ✅ |
| `curl -s yourdomain.com \| grep '@type":"Organization"'` returns a hit | ✅ JSON-LD shipping |
| Submit form → `/thanks` page loads, email arrives | ✅ |
| `vercel logs` shows the POST as `200` | ✅ |

## Step 9 — Subsequent deploys

Once you connect the project to GitHub (recommended):

- Push to `main` → auto-deploys to production
- Open a pull request → auto-deploys a preview URL with the branch's database tied to a Neon branch (Neon does this automatically)
- Merge → preview promotes to production

Or via CLI any time:

```bash
vercel          # deploy a preview
vercel --prod   # deploy to production
```

---

## Troubleshooting

**Build fails on `next build` step**
- Run `npm run build` locally first. Most failures are TypeScript errors that compile fine in dev (Next does stricter checks for prod).
- Common culprit: a `"use client"` component imports a server-only function. Move shared helpers to `lib/` files without `"use client"`.

**Form submits but no email**
- Check `vercel env ls` shows `RESEND_API_KEY` in production
- Check Vercel Logs (Project → Logs) for `[contact]` messages
- Common cause: Resend domain isn't verified yet. Verify all DNS records show green in Resend.

**Domain shows "Invalid Configuration"**
- Vercel needs the `A` record on the root, not on `www`
- If you have Cloudflare in front, set the proxy to **DNS Only** (grey cloud), not the orange proxied state — proxied DNS conflicts with Vercel's SSL issuance

**Form returns 429 "Too many submissions"**
- Local rate limiter: 5 submissions per IP per 10 minutes. Wait 10 minutes or restart the dev server. Production behaves the same — that's intentional spam protection.

**`NEXT_PUBLIC_SITE_URL` not picking up**
- Public env vars get baked at build time. After changing one, **redeploy** (not just restart the function).

---

## Costs at a glance

| Service | Free tier | Likely upgrade trigger |
|---|---|---|
| **Vercel** Hobby | 100 GB bandwidth/mo, 100K serverless invocations | Once paid ads start driving > 5K visits/day |
| **Resend** | 3K emails/mo, 100/day | Once you hit ~50 form submissions/day |
| **Neon** | 0.5 GB storage, 191 compute hours | Probably never for a marketing site |
| **Vercel Analytics** | 2.5K events/mo on Hobby | When you turn on ad tracking + want full funnel data |

Total realistic cost for the first 6 months: **$0/mo** unless you go viral.
After paid ads ramp up: **~$20/mo** (Vercel Pro) + **$20/mo** (Resend Pro) = **~$40/mo**.
