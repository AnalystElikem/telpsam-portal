import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound, Briefcase, GraduationCap, MapPin, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRequest } from "@/app/actions/requests";

export const metadata: Metadata = { title: "Alumnus" };

type Row = {
  id: string;
  title: string | null;
  grad_year: number | null;
  qualifications: string | null;
  job_title: string | null;
  organization: string | null;
  industry: string | null;
  interests: string[] | null;
  bio: string | null;
  profiles: { full_name: string; avatar_url: string | null; campus: string | null } | null;
};

export default async function AlumnusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await requireProfile();
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("alumni_profiles")
    .select("id, title, grad_year, qualifications, job_title, organization, industry, interests, bio")
    .eq("id", id)
    .eq("is_approved", true)
    .eq("is_published", true)
    .maybeSingle();

  const base = data as unknown as Omit<Row, "profiles"> | null;
  if (!base) notFound();

  // Name/avatar/campus from the safe member_cards view (never raw profiles).
  const { data: card } = await supabase
    .from("member_cards")
    .select("full_name, avatar_url, campus")
    .eq("id", id)
    .maybeSingle();
  const a: Row = { ...base, profiles: card ?? null };

  const name = `${a.title ? `${a.title} ` : ""}${a.profiles?.full_name || "Alumnus"}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/directory" className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Link>

      <div className="card mt-4 p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
            {a.profiles?.avatar_url ? (
              <Image src={a.profiles.avatar_url} alt="" fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <UserRound className="h-10 w-10" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{name}</h1>
            <p className="mt-1 text-body">
              {a.job_title || "—"}
              {a.organization ? ` at ${a.organization}` : ""}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {a.industry && <Detail icon={Briefcase} label="Field" value={a.industry} />}
          {a.grad_year && <Detail icon={GraduationCap} label="Graduated" value={String(a.grad_year)} />}
          {a.profiles?.campus && <Detail icon={MapPin} label="Campus" value={a.profiles.campus} />}
          {a.qualifications && <Detail icon={GraduationCap} label="Qualifications" value={a.qualifications} />}
        </dl>

        {a.bio && (
          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">About</h2>
            <p className="mt-2 leading-relaxed text-body">{a.bio}</p>
          </div>
        )}

        {a.interests && a.interests.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.interests.map((it) => (
              <span key={it} className="chip">{it}</span>
            ))}
          </div>
        )}
      </div>

      {/* Request — students only */}
      {viewer.role === "student" ? (
        <div className="card mt-6 p-7">
          <h2 className="text-lg font-bold text-ink">Request mentorship</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-body">
            <ShieldCheck className="h-4 w-4 text-success" />
            Your request goes to the TELPSAM Program Coordinators, who will arrange the match. Contact details are never shared.
          </p>
          {error && <p className="mt-3 text-sm text-danger">Please write a short message first.</p>}
          <form action={createRequest} className="mt-4 space-y-3">
            <input type="hidden" name="alumnus_id" value={a.id} />
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">What are you hoping for?</label>
              <select name="kind" className="field">
                <option value="mentorship">Ongoing mentorship</option>
                <option value="question">A specific question</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Message to the Program Coordinators</label>
              <textarea name="message" rows={4} required className="field" placeholder="Briefly, why would you like to connect with this alumnus, and what would help you most?" />
            </div>
            <button type="submit" className="btn btn-primary">Send request</button>
          </form>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">
          Only students can request mentorship.
        </p>
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-navy">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
        <dd className="text-sm text-ink">{value}</dd>
      </div>
    </div>
  );
}
