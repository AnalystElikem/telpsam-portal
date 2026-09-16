import type { Metadata } from "next";
import { CheckCircle2, Clock, Search, Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveAlumnus } from "@/app/actions/admin";
import Avatar from "@/components/Avatar";
import { titleCaseName } from "@/lib/format";

export const metadata: Metadata = { title: "Alumni · Admin" };

type Row = {
  id: string;
  gender: string | null;
  job_title: string | null;
  organization: string | null;
  bio: string | null;
  is_approved: boolean;
  is_published: boolean;
  grad_year: number | null;
  profiles: { full_name: string; avatar_url: string | null; campus: string | null; email: string } | null;
};

export default async function AdminAlumni({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("admin");
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data }, { data: mentorRows }] = await Promise.all([
    supabase
      .from("alumni_profiles")
      .select("id, gender, job_title, organization, bio, is_approved, is_published, grad_year, profiles(full_name, avatar_url, campus, email)")
      .order("created_at", { ascending: false }),
    supabase.from("mentorships").select("mentor_id").eq("status", "active").eq("kind", "mentorship"),
  ]);

  // How many active mentees each alumnus currently has.
  const mentorLoad = new Map<string, number>();
  for (const m of mentorRows ?? []) mentorLoad.set(m.mentor_id, (mentorLoad.get(m.mentor_id) ?? 0) + 1);

  let rows = (data as unknown as Row[]) ?? [];
  const needle = (q || "").trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) =>
      [r.profiles?.full_name, r.profiles?.email, r.organization, r.job_title]
        .filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }
  const pending = rows.filter((r) => !r.is_approved);
  const approved = rows.filter((r) => r.is_approved);

  // Members who signed up as alumni but never saved/submitted a profile.
  const submitted = new Set(((data as unknown as Row[]) ?? []).map((r) => r.id));
  const { data: allAlumni } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "alumnus");
  const incomplete = (allAlumni ?? []).filter(
    (p) => !submitted.has(p.id) && (!needle || `${p.full_name} ${p.email}`.toLowerCase().includes(needle))
  );

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Coordinator</p>
      <h1 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">Alumni</h1>
      <p className="mt-1 text-body">Review new profiles before they appear to students.</p>
      {approved.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold text-ink">{approved.filter((r) => (mentorLoad.get(r.id) ?? 0) > 0).length}</span>{" "}
          of {approved.length} approved alumni are currently mentoring.
        </p>
      )}

      <form className="relative mt-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q || ""} placeholder="Search by name, email, or organisation…" className="field !pl-10" />
      </form>
      {needle && (
        <p className="mt-2 text-sm text-muted">
          {rows.length} result{rows.length === 1 ? "" : "s"} for “{q}”.{" "}
          <a href="/admin/alumni" className="font-semibold text-navy hover:underline">Clear</a>
        </p>
      )}

      <Section title="Awaiting review" empty="No alumni are waiting for review.">
        {pending.map((r) => (
          <AlumnusCard key={r.id} r={r} mentoring={mentorLoad.get(r.id) ?? 0} />
        ))}
      </Section>

      {incomplete.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Registered, not yet submitted ({incomplete.length})
          </h2>
          <p className="mt-1 text-xs text-muted">Signed up but haven&apos;t saved a profile, so there&apos;s nothing to review yet.</p>
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

      <Section title="Approved" empty="No approved alumni yet.">
        {approved.map((r) => (
          <AlumnusCard key={r.id} r={r} mentoring={mentorLoad.get(r.id) ?? 0} />
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

function AlumnusCard({ r, mentoring }: { r: Row; mentoring: number }) {
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={r.profiles?.full_name} src={r.profiles?.avatar_url} size={56} className="ring-2 ring-line" />
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
              <span>
                {titleCaseName(r.profiles?.full_name) || "Alumnus"}
                {r.gender ? <span className="ml-2 text-xs font-normal text-muted">{r.gender}</span> : null}
              </span>
              {r.is_approved &&
                (mentoring > 0 ? (
                  <span className="chip chip-teal">Mentoring {mentoring}</span>
                ) : (
                  <span className="chip chip-muted">Available</span>
                ))}
            </p>
            {(r.job_title || r.organization) && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-body">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                <span>
                  {r.job_title || "—"}
                  {r.organization ? ` · ${r.organization}` : ""}
                </span>
              </p>
            )}
            <p className="text-xs text-muted">{r.profiles?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.is_approved ? (
            <>
              <span className="chip chip-success">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approved
              </span>
              <form action={approveAlumnus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approve" value="false" />
                <button className="btn btn-outline !py-1.5 !text-xs">Unapprove</button>
              </form>
            </>
          ) : (
            <>
              <span className="chip chip-gold">
                <Clock className="mr-1 h-3.5 w-3.5" /> Pending
              </span>
              <form action={approveAlumnus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approve" value="true" />
                <button className="btn btn-primary !py-1.5 !text-xs">Approve</button>
              </form>
            </>
          )}
        </div>
      </div>
      {r.bio && <p className="mt-3 border-t border-line pt-3 text-sm text-body">{r.bio}</p>}
    </div>
  );
}
