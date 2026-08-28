import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { UserRound, Search, Briefcase, Building2, ArrowRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Alumni Directory" };

type Row = {
  id: string;
  title: string | null;
  job_title: string | null;
  organization: string | null;
  industry: string | null;
  interests: string[] | null;
  grad_year: number | null;
  profiles: { full_name: string; avatar_url: string | null; campus: string | null } | null;
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; interest?: string }>;
}) {
  await requireProfile();
  const { q, industry, interest } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("alumni_profiles")
    .select("id, title, job_title, organization, industry, interests, grad_year")
    .eq("is_approved", true)
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  const base = (data as unknown as Omit<Row, "profiles">[]) ?? [];

  // Names/avatars come from the safe member_cards view (never raw profiles).
  const ids = base.map((a) => a.id);
  const { data: cards } = ids.length
    ? await supabase.from("member_cards").select("id, full_name, avatar_url, campus").in("id", ids)
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const all: Row[] = base.map((a) => ({ ...a, profiles: cardById.get(a.id) ?? null }));

  // Filter options built from what's actually in the directory.
  const industries = Array.from(
    new Set(all.map((a) => (a.industry || "").trim()).filter(Boolean))
  ).sort();
  const interestOptions = Array.from(
    new Set(all.flatMap((a) => (a.interests || []).map((i) => i.trim()).filter(Boolean)))
  ).sort();

  let alumni = all;
  if (q) {
    const needle = q.toLowerCase();
    alumni = alumni.filter((a) =>
      [a.profiles?.full_name, a.job_title, a.organization, a.industry, (a.interests || []).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }
  if (industry) alumni = alumni.filter((a) => a.industry === industry);
  if (interest) alumni = alumni.filter((a) => (a.interests || []).includes(interest));

  const filtered = Boolean(q || industry || interest);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Alumni Directory</h1>
        <p className="mt-1 text-body">
          Explore alumni who have gone ahead of you. To connect, open a profile
          and request mentorship, and the Program Coordinators will arrange the match.
        </p>
      </div>

      <form className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search name, field, interest…"
            className="field !pl-10"
          />
        </div>
        <div className="min-w-[12rem] flex-1 sm:max-w-[16rem]">
          <select name="industry" defaultValue={industry || ""} className="field">
            <option value="">All industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1 sm:max-w-[16rem]">
          <select name="interest" defaultValue={interest || ""} className="field">
            <option value="">All interests</option>
            {interestOptions.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary shrink-0">Filter</button>
      </form>

      {filtered && (
        <p className="mt-3 text-sm text-muted">
          Showing {alumni.length} of {all.length}.{" "}
          <Link href="/directory" className="font-semibold text-navy hover:underline">Clear filters</Link>
        </p>
      )}

      {alumni.length === 0 ? (
        <p className="mt-12 text-center text-body">
          {filtered ? "No alumni match your search yet." : "No alumni profiles are published yet. Check back soon."}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {alumni.map((a) => (
            <Link
              key={a.id}
              href={`/directory/${a.id}`}
              className="card group flex flex-col p-6 transition-shadow hover:shadow-md sm:p-7"
            >
              <div className="flex items-start gap-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-line bg-canvas sm:h-24 sm:w-24">
                  {a.profiles?.avatar_url ? (
                    <Image src={a.profiles.avatar_url} alt="" fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <UserRound className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold leading-tight text-ink group-hover:text-navy">
                    {a.title ? `${a.title} ` : ""}
                    {a.profiles?.full_name || "Alumnus"}
                  </p>
                  {a.job_title && (
                    <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-navy">
                      <Briefcase className="h-4 w-4 shrink-0 text-gold-600" />
                      {a.job_title}
                    </p>
                  )}
                  {a.organization && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-body">
                      <Building2 className="h-4 w-4 shrink-0 text-muted" />
                      {a.organization}
                    </p>
                  )}
                  {(a.industry || a.grad_year) && (
                    <p className="mt-2 text-xs text-muted">
                      {a.industry}
                      {a.industry && a.grad_year ? " · " : ""}
                      {a.grad_year ? `Class of ${a.grad_year}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {a.interests && a.interests.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {a.interests.slice(0, 4).map((it) => (
                    <span key={it} className="chip">{it}</span>
                  ))}
                </div>
              )}

              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600">
                View full profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
