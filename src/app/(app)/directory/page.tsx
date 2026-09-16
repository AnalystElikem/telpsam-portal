import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, Briefcase, Building2, ArrowRight, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import { titleCaseName, cleanTitle } from "@/lib/format";

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Find your mentor</p>
        <h1 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">Alumni Directory</h1>
        <p className="mt-2 text-body">
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
        <div className="mt-8">
          <EmptyState
            icon={Search}
            title={filtered ? "No matches yet" : "No alumni yet"}
            hint={
              filtered
                ? "Try a different name, industry, or clear your filters."
                : "No alumni profiles are published yet. Check back soon."
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alumni.map((a) => (
            <Link
              key={a.id}
              href={`/directory/${a.id}`}
              className="card card-interactive group flex flex-col overflow-hidden"
            >
              {/* Prominent photo */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
                {a.profiles?.avatar_url ? (
                  <Image
                    src={a.profiles.avatar_url}
                    alt={a.profiles?.full_name || "Alumnus"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy to-navy-600 font-serif text-5xl font-bold text-white/90">
                    {initials(a.profiles?.full_name || "Alumnus")}
                  </div>
                )}
                <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                  Alumnus
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="font-serif text-base font-bold leading-tight text-ink group-hover:text-navy">
                  {a.title ? `${cleanTitle(a.title)} ` : ""}
                  {titleCaseName(a.profiles?.full_name) || "Alumnus"}
                </p>

                {a.job_title && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-navy">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                    <span className="truncate">{a.job_title}</span>
                  </p>
                )}
                {a.organization && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-body">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="truncate">{a.organization}</span>
                  </p>
                )}
                {a.profiles?.campus && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-body">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="truncate">{a.profiles.campus}</span>
                  </p>
                )}
                {(a.industry || a.grad_year) && (
                  <p className="mt-1.5 text-xs text-muted">
                    {a.industry}
                    {a.industry && a.grad_year ? " · " : ""}
                    {a.grad_year ? `Class of ${a.grad_year}` : ""}
                  </p>
                )}

                <div className="mt-3 flex-1" />
                <span className="btn btn-primary w-full !py-2 !text-sm">
                  View profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
