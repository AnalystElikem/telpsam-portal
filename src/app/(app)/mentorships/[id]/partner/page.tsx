import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound, Briefcase, Building2, GraduationCap, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

function Detail({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
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

export default async function PartnerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("mentorships")
    .select("mentor_id, mentee_id")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  const isParticipant = m.mentor_id === me.id || m.mentee_id === me.id;
  if (!isParticipant) notFound();

  const partnerId = m.mentor_id === me.id ? m.mentee_id : m.mentor_id;
  const partnerIsMentor = partnerId === m.mentor_id;

  const { data: card } = await supabase
    .from("member_cards")
    .select("full_name, avatar_url")
    .eq("id", partnerId)
    .maybeSingle();
  const name = card?.full_name || (partnerIsMentor ? "Mentor" : "Mentee");

  const back = (
    <Link href={`/mentorships/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy">
      <ArrowLeft className="h-4 w-4" /> Back to conversation
    </Link>
  );

  const header = (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
        {card?.avatar_url ? (
          <Image src={card.avatar_url} alt="" fill className="object-cover" sizes="96px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <UserRound className="h-10 w-10" />
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-ink">{name}</h1>
        <p className="text-sm text-muted">{partnerIsMentor ? "Your mentor" : "Your mentee"}</p>
      </div>
    </div>
  );

  if (partnerIsMentor) {
    const { data: a } = await supabase
      .from("alumnus_cards")
      .select("title, gender, grad_year, qualifications, job_title, organization, industry, interests, bio, church_branch")
      .eq("id", partnerId)
      .maybeSingle();
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <div className="card mt-4 p-7">
          {header}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {a?.job_title && <Detail icon={Briefcase} label="Role" value={a.job_title} />}
            {a?.organization && <Detail icon={Building2} label="Organisation" value={a.organization} />}
            {a?.industry && <Detail icon={Briefcase} label="Field" value={a.industry} />}
            {a?.grad_year && <Detail icon={GraduationCap} label="Graduated" value={String(a.grad_year)} />}
            {a?.qualifications && <Detail icon={GraduationCap} label="Qualifications" value={a.qualifications} />}
            {a?.church_branch && <Detail icon={MapPin} label="Church branch" value={a.church_branch} />}
          </dl>
          {a?.bio && (
            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">About</h2>
              <p className="mt-2 leading-relaxed text-body">{a.bio}</p>
            </div>
          )}
          {a?.interests && a.interests.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {a.interests.map((it: string) => (
                <span key={it} className="chip">{it}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Partner is the mentee (student) — show safe fields only (no phone/parent).
  const { data: s } = await supabase
    .from("mentee_cards")
    .select("gender, school, education_level, class_level, church_branch")
    .eq("id", partnerId)
    .maybeSingle();
  return (
    <div className="mx-auto max-w-3xl">
      {back}
      <div className="card mt-4 p-7">
        {header}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {s?.school && <Detail icon={GraduationCap} label="School" value={s.school} />}
          {s?.education_level && <Detail icon={GraduationCap} label="Level" value={s.education_level} />}
          {s?.class_level && <Detail icon={Briefcase} label="Programme / level" value={s.class_level} />}
          {s?.church_branch && <Detail icon={MapPin} label="Church branch" value={s.church_branch} />}
          {s?.gender && <Detail icon={UserRound} label="Gender" value={s.gender} />}
        </dl>
        <p className="mt-6 text-xs text-muted">
          Contact details are private and kept with the Program Coordinators.
        </p>
      </div>
    </div>
  );
}
