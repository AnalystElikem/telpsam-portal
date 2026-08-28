import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import HeaderBar from "@/components/HeaderBar";

const LINKS: Record<Profile["role"], { href: string; label: string }[]> = {
  student: [
    { href: "/directory", label: "Alumni Directory" },
    { href: "/requests", label: "My Requests" },
    { href: "/mentorships", label: "My Mentorship" },
    { href: "/profile", label: "My Profile" },
  ],
  alumnus: [
    { href: "/profile", label: "My Profile" },
    { href: "/mentorships", label: "My Mentees" },
    { href: "/directory", label: "Directory" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/alumni", label: "Alumni" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/audit", label: "Audit" },
    { href: "/directory", label: "Directory" },
    { href: "/profile", label: "My Profile" },
    { href: "/mentorships", label: "My Mentorship" },
  ],
};

export default async function TopNav({ profile }: { profile: Profile }) {
  const links = [...LINKS[profile.role]];
  // The super admin gets a link to manage coordinators.
  if (profile.is_superadmin) {
    links.splice(1, 0, { href: "/admin/coordinators", label: "Coordinators" });
  }

  // Live alert badge for coordinators: open flags + open call requests.
  let alertCount = 0;
  if (profile.role === "admin") {
    const supabase = await createClient();
    const [reports, calls] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("call_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);
    alertCount = (reports.count ?? 0) + (calls.count ?? 0);
  }

  return (
    <HeaderBar
      links={links}
      alertCount={alertCount}
      fullName={profile.full_name}
      role={profile.role}
    />
  );
}
