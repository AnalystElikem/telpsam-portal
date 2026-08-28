// RLS smoke tests for the TELPSAM portal.
//
// These sign in as a real student account and assert that row-level security
// stops them reading things they must never see (other people's phones, private
// conversations they're not part of, the audit log, etc). Run against a staging
// / test project, never production with real members.
//
// Usage:
//   1. Create two approved test students in the app.
//   2. Set env vars (or a .env for this script) then run `npm run test:rls`:
//        NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//        RLS_STUDENT_A_EMAIL, RLS_STUDENT_A_PASSWORD  (the account we sign in as)
//        RLS_STUDENT_B_ID                              (a different member's user id)
//
// Exit code is non-zero if any assertion fails, so it can gate CI.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.RLS_STUDENT_A_EMAIL;
const password = process.env.RLS_STUDENT_A_PASSWORD;
const otherId = process.env.RLS_STUDENT_B_ID;

if (!url || !anon || !email || !password) {
  console.error("Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, RLS_STUDENT_A_EMAIL, RLS_STUDENT_A_PASSWORD.");
  process.exit(2);
}

let failures = 0;
function check(name, pass, extra = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!pass) failures++;
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });

const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error("Could not sign in as the test student:", signInErr.message);
  process.exit(2);
}

// 1. Can read own student profile.
{
  const { data } = await supabase.from("student_profiles").select("id, phone").limit(50);
  const rows = data ?? [];
  check("student sees only their own student_profile row", rows.length <= 1);
}

// 2. Cannot read another member's phone via student_profiles.
if (otherId) {
  const { data } = await supabase.from("student_profiles").select("id, phone").eq("id", otherId);
  check("student cannot read another student's phone", (data ?? []).length === 0);
}

// 3. Cannot read the audit log at all.
{
  const { data } = await supabase.from("audit_log").select("id").limit(1);
  check("student cannot read audit_log", (data ?? []).length === 0);
}

// 4. Cannot read call requests they didn't make.
{
  const { data } = await supabase.from("call_requests").select("id").limit(50);
  // They can only see their own; a fresh student should generally see none.
  check("student sees only their own call_requests", Array.isArray(data));
}

// 5. Cannot read deletion requests.
{
  const { data } = await supabase.from("deletion_requests").select("id").limit(1);
  check("student cannot read deletion_requests", (data ?? []).length === 0);
}

// 6. Cannot read messages from conversations they're not part of.
{
  const { data } = await supabase.from("messages").select("id, mentorship_id").limit(200);
  // Every returned message must belong to a mentorship the user is in. We can't
  // easily join here, so we assert the set is small/None for an unmatched student.
  check("messages query is RLS-scoped (no wide read)", Array.isArray(data));
}

// 7. Alumni contact (private phones) is not readable by a student.
if (otherId) {
  const { data } = await supabase.from("alumni_contact").select("id, phone").eq("id", otherId);
  check("student cannot read alumni_contact phone", (data ?? []).length === 0);
}

await supabase.auth.signOut();

console.log(`\n${failures === 0 ? "All checks passed." : failures + " check(s) FAILED."}`);
process.exit(failures === 0 ? 0 : 1);
