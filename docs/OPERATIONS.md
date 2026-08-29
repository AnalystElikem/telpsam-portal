# TELPSAM Portal — Operations

Practical notes for running the portal safely in production.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill it in. The app now **fails
fast** with a clear message if a required variable is missing.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | for admin email, deletions | Secret. Server-only. Never expose. |
| `ADMIN_SIGNUP_CODE` | for `/office` | Secret code to create coordinator accounts |
| `RESEND_API_KEY` / `ALERT_FROM_EMAIL` | for email alerts | Resend transactional email |
| `NEXT_PUBLIC_APP_URL` | for email links | Your deployed site URL |

## Database migrations

The full schema is in `supabase/schema.sql` (run once on a fresh database).
For an existing database, run the numbered files in `supabase/migrations/`
**in order** in the Supabase SQL editor. They are idempotent (safe to re-run):

```
003_students_calls_end.sql
004_student_school.sql
005_gender_transition.sql
006_audit_log.sql
007_guardian_consent.sql
008_deletion_requests.sql
009_checkins.sql
```

## Backups

Enable **Point-in-Time Recovery** in the Supabase dashboard
(Project → Database → Backups). This lets you restore to any moment, which
matters because deletions are permanent. Test a restore at least once.

## RLS smoke tests

Row-level security is the entire privacy model, so verify it after any policy
change. `scripts/rls-test.mjs` signs in as a real test student and asserts they
cannot read other people's phones, private conversations, the audit log, etc.

```
# against a STAGING project with two approved test students
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
RLS_STUDENT_A_EMAIL=... RLS_STUDENT_A_PASSWORD=... \
RLS_STUDENT_B_ID=<another member's user id> \
npm run test:rls
```

Wire this into CI so a bad policy change fails the build.

## Error monitoring (Sentry)

Wiring is in place at `src/instrumentation.ts` (a safe no-op until enabled). To
turn it on: `npm install @sentry/nextjs`, then set `SENTRY_DSN` in the
environment (Vercel + `.env.local`). Captures server-side errors. For full
client capture + source maps, `npx @sentry/wizard@latest -i nextjs` also works.

## Continuous integration

`.github/workflows/ci.yml` runs typecheck + lint on every push/PR. To also run
the RLS smoke tests in CI, set repo **variable** `RUN_RLS_TESTS=true` and add
the secrets it reads (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`RLS_STUDENT_A_EMAIL`, `RLS_STUDENT_A_PASSWORD`, `RLS_STUDENT_B_ID`) against a
STAGING project.

## Scheduled jobs

`migrations/015_expiry_cron.sql` schedules a nightly pg_cron job that ends
mentorships past their 3-month period. Enable the **pg_cron** extension first
(Supabase → Database → Extensions), then run the migration.

## Safeguarding: how messages get flagged

Every chat message runs through two layers before it's considered clean. The
goal is to **catch everything without pinging coordinators for every maybe**.

1. **Keyword scanner** (`src/lib/safeguard.ts`, always on, free, instant).
   - **High-confidence** hits — a real phone number, a contact handle/social
     app/email, a money request with an amount or "cover my fees", a concrete
     meet-up — raise a **high** flag → coordinators are emailed and it shows
     under *Alerts → Flagged conversations*.
   - **Low-confidence** hints — a bare mention of "money", "meet", "phone",
     "photo", "secret", etc. — raise a **low** flag. These do **not** email
     anyone; they sit under *Alerts → For review · lower priority*.

2. **AI classifier** (`src/lib/moderation.ts`, optional — set `OPENAI_API_KEY`).
   When the keyword layer isn't already high-confidence, the message is read
   **in context** by a small model (`gpt-4o-mini` by default). It catches what
   rules miss — euphemisms, spelled-out numbers ("oh two four…"), grooming and
   secrecy — and can also **clear a false hint** (e.g. "nice to meet you" →
   not a breach → no flag). Its verdict overrides the keyword low/none result.

Notes:
- Without the AI key, the low-priority list is deliberately broad (it would
  rather over-catch than miss), so it will include some innocent messages.
  Adding the key cleans that up. Either way, **coordinators are only emailed
  for high-confidence flags.**
- One open auto-flag per conversation per tier — a burst of messages won't spam
  the alerts list; a high flag can still escalate above an open low one.
- Coordinators still only ever see the **flagged message(s)**, not the whole
  chat (enforced in RLS, migration `018`).
- Severity lives on `reports.severity` (migration `020`). Manual reports and
  check-in concerns are always `high`.
- Cost of the AI layer is roughly a hundredth of a cent per message on
  `gpt-4o-mini`. It runs only when the keyword layer isn't already sure, and
  fails safe (network/timeout → falls back to the keyword result).

## Security notes

- Private phone numbers live in `alumni_contact` / `student_profiles`, which are
  **not** directory-readable. Never move a phone column onto `alumni_profiles`.
- Coordinator access to flagged conversations and other sensitive actions is
  recorded in `audit_log` (Admin → Audit).
- Data deletion requires two different coordinators to confirm.
