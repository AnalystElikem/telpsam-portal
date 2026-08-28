import type { Metadata } from "next";
import Image from "next/image";
import { UserRound, CheckCircle2, Clock, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveAlumnus } from "@/app/actions/admin";

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

  const { data } = await supabase
    .from("alumni_profiles")
    .select("id, gender, job_title, organization, bio, is_approved, is_published, grad_year, profiles(full_name, avatar_url, campus, email)")
    .order("created_at", { ascending: false });

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Alumni</h1>
      <p className="mt-1 text-body">Review new profiles before they appear to students.</p>

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
          <AlumnusCard key={r.id} r={r} />
        ))}
      </Section>

      <Section title="Approved" empty="No approved alumni yet.">
        {approved.map((r) => (
          <AlumnusCard key={r.id} r={r} />
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

function AlumnusCard({ r }: { r: Row }) {
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
            {r.profiles?.avatar_url ? (
              <Image src={r.profiles.avatar_url} alt="" fill className="object-cover" sizes="56px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <UserRound className="h-6 w-6" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-ink">
              {r.profiles?.full_name || "Alumnus"}
              {r.gender ? <span className="ml-2 text-xs font-normal text-muted">{r.gender}</span> : null}
            </p>
            <p className="text-sm text-body">
              {r.job_title || "—"}
              {r.organization ? ` · ${r.organization}` : ""}
            </p>
            <p className="text-xs text-muted">{r.profiles?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.is_approved ? (
            <>
              <span className="chip bg-green-100 text-success">
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
              <span className="chip bg-gold-soft text-gold-600">
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
