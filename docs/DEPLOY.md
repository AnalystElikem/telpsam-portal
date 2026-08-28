# TELPSAM Portal — Deployment Runbook

Order matters. Do these top to bottom the first time.

## 0. Prerequisites
- A Supabase project (already created).
- A GitHub account.
- A Vercel account (free Hobby tier is fine to start).
- Your domain (at your registrar), if using a custom domain.

## 1. Push the code to GitHub
From the project folder (`telpsam-portal`) on your computer:

```bash
git init
git add .
git commit -m "TELPSAM portal"
git branch -M main
# create an EMPTY repo on github.com first (no README), then:
git remote add origin https://github.com/<you>/telpsam-portal.git
git push -u origin main
```

`.env.local` is gitignored, so your secrets are NOT pushed. Good.

## 2. Apply the database (Supabase)
Supabase → SQL Editor. If the database is fresh, run `supabase/schema.sql` once.
If it already has earlier tables, run the migrations **in order** (idempotent):

```
002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013
```

Then make yourself the super admin (after you've signed up once so the row exists):

```sql
update public.profiles set is_superadmin = true, role = 'admin'
where email = 'elikemaflakpui@gmail.com';
```

## 3. Verify RLS (critical)
Supabase → Table Editor. Confirm **every** table shows RLS "Enabled":
profiles, alumni_profiles, alumni_contact, student_profiles, mentorship_requests,
mentorships, messages, reports, call_requests, checkins, deletion_requests,
audit_log, extension_requests, support_messages. A table with RLS off is
world-readable via the anon key.

## 4. Supabase Auth settings
Supabase → Authentication → ...
- **Confirm email: ON** (users must verify their address).
- **Leaked password protection: ON**.
- **URL configuration**: set Site URL to your production URL (e.g.
  `https://portal.telpsam.org`), and add it to Redirect URLs.

## 5. Deploy on Vercel
- Vercel → Add New → Project → import your GitHub repo.
- Framework preset: Next.js (auto-detected). Build command / output: defaults.
- Add **Environment Variables** (Production + Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `NEXT_PUBLIC_APP_URL` | your production URL |
| `RESEND_API_KEY` | Resend key (optional, for email) |
| `ALERT_FROM_EMAIL` | verified sender, e.g. `TELPSAM <alerts@yourdomain>` |

- Deploy. You'll get a `*.vercel.app` URL. Test it before wiring DNS.

## 6. Custom domain + DNS
- Vercel → Project → Settings → Domains → add `portal.telpsam.org` (or your choice).
- Vercel shows the DNS record to create. At your registrar add either:
  - a **CNAME** for the subdomain → `cname.vercel-dns.com`, or
  - for a root/apex domain, the **A record** Vercel gives you.
- Wait for DNS to propagate; Vercel auto-provisions HTTPS.
- Update `NEXT_PUBLIC_APP_URL` and Supabase Site URL to the final domain, then
  redeploy so email links use the real domain.

## 7. Backups
Supabase → Database → Backups → enable **Point-in-Time Recovery**. Deletions are
permanent, so this is your safety net.

## 8. Post-deploy smoke test
- Sign up as a student → complete profile → confirm you land on "awaiting approval".
- As super admin: approve the student, appoint a coordinator, assign a mentorship.
- Send a message containing a phone number → confirm it auto-flags in Alerts.
- Open Admin → Audit and confirm actions are logged.
- (If email configured) confirm a coordinator alert email arrives.

## 9. Ongoing
- New migrations: run the next-numbered file in `supabase/migrations/` on prod.
- Consider wiring `npm run test:rls` into CI against a staging project.
