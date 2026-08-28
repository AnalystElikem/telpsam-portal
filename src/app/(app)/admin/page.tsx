import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, Inbox, Users, Flag, GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const me = await requireRole("admin");
  const supabase = await createClient();

  const [pendingStudents, pendingAlumni, newRequests, activeMentorships, openReports, openCalls] =
    await Promise.all([
      supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("alumni_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("mentorship_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("mentorships").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("call_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);

  const alertCount = (openReports.count ?? 0) + (openCalls.count ?? 0);

  const stats = [
    { icon: Flag, label: "Alerts needing attention", value: alertCount, href: "/admin/alerts", accent: "text-danger" },
    { icon: GraduationCap, label: "Students awaiting approval", value: pendingStudents.count ?? 0, href: "/admin/students", accent: "text-teal" },
    { icon: UserCheck, label: "Alumni awaiting review", value: pendingAlumni.count ?? 0, href: "/admin/alumni", accent: "text-gold-600" },
    { icon: Inbox, label: "New mentorship requests", value: newRequests.count ?? 0, href: "/admin/requests", accent: "text-navy" },
    { icon: Users, label: "Active mentorships", value: activeMentorships.count ?? 0, href: "/admin/mentorships", accent: "text-success" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Program Coordinators Dashboard</h1>
      <p className="mt-1 text-body">
        Review alumni, match mentees to mentors, and keep interactions safe.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition-shadow hover:shadow-md">
            <s.icon className={`h-6 w-6 ${s.accent}`} />
            <p className="mt-4 text-3xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-body">{s.label}</p>
          </Link>
        ))}
      </div>

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
