import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, Inbox, Users, Flag, GraduationCap, UsersRound, Scale, HeartHandshake } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const me = await requireRole("admin");
  const supabase = await createClient();

  const [
    pendingStudents,
    pendingAlumni,
    newRequests,
    activeMentorships,
    openReports,
    openCalls,
    enrolledStudents,
    enrolledAlumni,
    activeMentorRows,
  ] = await Promise.all([
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("alumni_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("mentorship_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("mentorships").select("*", { count: "exact", head: true }).eq("status", "active").eq("kind", "mentorship"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("call_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
    supabase.from("alumni_profiles").select("*", { count: "exact", head: true }).eq("is_approved", true),
    supabase.from("mentorships").select("mentor_id").eq("status", "active").eq("kind", "mentorship"),
  ]);

  const alertCount = (openReports.count ?? 0) + (openCalls.count ?? 0);

  // Enrolment = approved members. Ratio and the mentoring split help coordinators
  // see the shape of the network at a glance.
  const studentsN = enrolledStudents.count ?? 0;
  const alumniN = enrolledAlumni.count ?? 0;
  const totalEnrolled = studentsN + alumniN;
  const ratio = alumniN > 0 ? `${(studentsN / alumniN).toFixed(1)} : 1` : "—";

  const mentoringAlumni = new Set((activeMentorRows.data ?? []).map((m) => m.mentor_id)).size;
  const availableAlumni = Math.max(alumniN - mentoringAlumni, 0);

  const network = [
    { icon: UsersRound, label: "People enrolled", value: totalEnrolled, tint: "bg-teal-soft", accent: "text-teal" },
    { icon: GraduationCap, label: "Students enrolled", value: studentsN, tint: "bg-forest-soft", accent: "text-navy" },
    { icon: UserCheck, label: "Alumni enrolled", value: alumniN, tint: "bg-gold-soft", accent: "text-gold-600" },
    { icon: Scale, label: "Students per alumnus", value: ratio, tint: "bg-violet-soft", accent: "text-violet" },
  ];

  const stats = [
    { icon: Flag, label: "Alerts needing attention", value: alertCount, href: "/admin/alerts", accent: "text-coral", tint: "bg-coral-soft" },
    { icon: GraduationCap, label: "Students awaiting approval", value: pendingStudents.count ?? 0, href: "/admin/students", accent: "text-teal", tint: "bg-teal-soft" },
    { icon: UserCheck, label: "Alumni awaiting review", value: pendingAlumni.count ?? 0, href: "/admin/alumni", accent: "text-gold-600", tint: "bg-gold-soft" },
    { icon: Inbox, label: "New mentorship requests", value: newRequests.count ?? 0, href: "/admin/requests", accent: "text-violet", tint: "bg-violet-soft" },
    { icon: Users, label: "Active mentorships", value: activeMentorships.count ?? 0, href: "/admin/mentorships", accent: "text-success", tint: "bg-[#dff3e6]" },
  ];

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Coordinator</p>
      <h1 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">Program Coordinators Dashboard</h1>
      <p className="mt-2 text-body">
        Review alumni, match mentees to mentors, and keep interactions safe.
      </p>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-muted">Needs attention</h2>
      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card card-interactive flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.tint}`}>
              <s.icon className={`h-6 w-6 ${s.accent}`} />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none text-ink">{s.value}</p>
              <p className="mt-1.5 text-sm text-body">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-muted">The network at a glance</h2>
      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {network.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.tint}`}>
              <s.icon className={`h-6 w-6 ${s.accent}`} />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none text-ink">{s.value}</p>
              <p className="mt-1.5 text-sm text-body">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-body">
        <HeartHandshake className="h-4 w-4 shrink-0 text-gold-600" />
        <span>
          <span className="font-semibold text-ink">{mentoringAlumni}</span> of {alumniN} alumni are
          currently mentoring · <span className="font-semibold text-ink">{availableAlumni}</span> available
        </span>
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/requests" className="btn btn-primary">Assign mentorships</Link>
        <Link href="/admin/students" className="btn btn-outline">Review students</Link>
        <Link href="/admin/alumni" className="btn btn-outline">Review alumni</Link>
        <Link href="/admin/analytics" className="btn btn-outline">Analytics</Link>
        <Link href="/admin/audit" className="btn btn-outline">Audit log</Link>
        <Link href="/admin/deletions" className="btn btn-outline">Data deletions</Link>
        {me.is_superadmin && (
          <Link href="/admin/coordinators" className="btn btn-outline">Coordinators</Link>
        )}
      </div>
    </div>
  );
}
