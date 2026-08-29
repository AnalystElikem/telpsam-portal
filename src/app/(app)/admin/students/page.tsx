import type { Metadata } from "next";
import { UserRound, CheckCircle2, Clock, Phone, GraduationCap, MapPin, Users, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveStudent } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Students · Admin" };

type Row = {
  id: string;
  gender: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_contact: string | null;
  church_branch: string | null;
  school: string | null;
  education_level: string | null;
  class_level: string | null;
  is_approved: boolean;
  guardian_consent_confirmed: boolean;
  profiles: { full_name: string; email: string } | null;
};

export default async function AdminStudents({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  await requireRole("admin");
  const { error, q } = await searchParams;
  const supabase = await createClient();

  // Note: student_profiles has two foreign keys to profiles (id and
  // guardian_consent_by), so an embedded profiles(...) join is ambiguous and
  // fails. Fetch the names separately and merge by id.
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id, gender, phone, parent_name, parent_contact, church_branch, school, education_level, class_level, is_approved, guardian_consent_confirmed")
    .order("created_at", { ascending: false });
  const base = (sp as unknown as Omit<Row, "profiles">[]) ?? [];

  const ids = base.map((r) => r.id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const pById = new Map((people ?? []).map((p) => [p.id, p as { full_name: string; email: string }]));
  let rows: Row[] = base.map((r) => ({ ...r, profiles: pById.get(r.id) ?? null }));

  const needle = (q || "").trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) =>
      [r.profiles?.full_name, r.profiles?.email, r.school, r.church_branch]
        .filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }
  const pending = rows.filter((r) => !r.is_approved);
  const approved = rows.filter((r) => r.is_approved);

  // Members who signed up as students but never completed/submitted a profile.
  const submitted = new Set(base.map((r) => r.id));
  const { data: allStudents } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student");
  const incomplete = (allStudents ?? []).filter(
    (p) => !submitted.has(p.id) && (!needle || `${p.full_name} ${p.email}`.toLowerCase().includes(needle))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Students</h1>
      <p className="mt-1 text-body">
        Review each student before approving them into the network. Phone and parent
        details are private, for coordinator use only.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
      )}

      <form className="relative mt-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q || ""} placeholder="Search by name, email, school, or branch…" className="field !pl-10" />
      </form>
      {needle && (
        <p className="mt-2 text-sm text-muted">
          {rows.length} result{rows.length === 1 ? "" : "s"} for “{q}”.{" "}
          <a href="/admin/students" className="font-semibold text-navy hover:underline">Clear</a>
        </p>
      )}

      <Section title="Awaiting approval" empty="No students are waiting for approval.">
        {pending.map((r) => (
          <StudentCard key={r.id} r={r} />
        ))}
      </Section>

      {incomplete.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Registered, not yet submitted ({incomplete.length})
          </h2>
          <p className="mt-1 text-xs text-muted">Signed up but haven&apos;t completed a profile, so there&apos;s nothing to approve yet.</p>
          <div className="mt-3 space-y-2">
            {incomplete.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{p.full_name || "New member"}</p>
                  <p className="text-xs text-muted">{p.email}</p>
                </div>
                <span className="text-xs text-muted">Profile not completed</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Section title="Approved" empty="No approved students yet.">
        {approved.map((r) => (
          <StudentCard key={r.id} r={r} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3 space-y-3">
        {hasItems ? children : <p className="card p-5 text-sm text-body">{empty}</p>}
      </div>
    </section>
  );
}

function StudentCard({ r }: { r: Row }) {
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-muted">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-ink">
              {r.profiles?.full_name || "Student"}
              {r.gender ? <span className="ml-2 text-xs font-normal text-muted">{r.gender}</span> : null}
            </p>
            <p className="text-xs text-muted">{r.profiles?.email}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-teal" />
                {r.school || "—"}
                {r.education_level ? ` · ${r.education_level}` : ""}
                {r.class_level ? ` · ${r.class_level}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-coral" />
                {r.church_branch || "—"}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-navy" />
                {r.phone || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-violet" />
                {r.parent_name || "—"}
                {r.parent_contact ? ` · ${r.parent_contact}` : ""}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {r.is_approved ? (
            <>
              <span className="chip bg-green-100 text-success">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approved
              </span>
              {r.guardian_consent_confirmed && (
                <span className="text-[11px] text-muted">Guardian consent on record</span>
              )}
              <form action={approveStudent}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approve" value="false" />
                <button className="btn btn-outline !py-1.5 !text-xs">Revoke</button>
              </form>
            </>
          ) : (
            <>
              <span className="chip bg-gold-soft text-gold-600">
                <Clock className="mr-1 h-3.5 w-3.5" /> Pending
              </span>
              <form action={approveStudent} className="flex flex-col items-stretch gap-2 sm:items-end">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approve" value="true" />
                <label className="flex items-center gap-1.5 text-xs text-body">
                  <input type="checkbox" name="guardian_consent" required /> Guardian consent confirmed
                </label>
                <button className="btn btn-primary !py-1.5 !text-xs">Approve</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
