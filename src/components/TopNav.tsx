import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import HeaderBar from "@/components/HeaderBar";

const LINKS: Record<Profile["role"], { href: string; label: string }[]> = {
  student: [
    { href: "/directory", label: "Alumni Directory" },
    { href: "/requests", label: "My Requests" },
    { href: "/mentorships", label: "My Mentorship" },
    { href: "/support", label: "Contact Coordinators" },
    { href: "/profile", label: "My Profile" },
  ],
  alumnus: [
    { href: "/profile", label: "My Profile" },
    { href: "/mentorships", label: "My Mentees" },
    { href: "/directory", label: "Directory" },
    { href: "/support", label: "Contact Coordinators" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/alumni", label: "Alumni" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/support", label: "Support" },
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

  // Live "needs attention" counts per menu item (coordinators only).
  let badges: Record<string, number> = {};
  if (profile.role === "admin") {
    const supabase = await createClient();
    const [reports, calls, ext, students, alumni, requests, support] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open").neq("severity", "low"),
      supabase.from("call_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("extension_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("alumni_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("mentorship_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("support_messages").select("member_id, from_coordinator, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    // Support threads whose most recent message is from the member (needs reply).
    const latestFromCoordinator = new Map<string, boolean>();
    for (const m of support.data ?? []) {
      if (!latestFromCoordinator.has(m.member_id)) latestFromCoordinator.set(m.member_id, m.from_coordinator);
    }
    let supportNeedsReply = 0;
    for (const fromCoord of latestFromCoordinator.values()) if (!fromCoord) supportNeedsReply++;

    badges = {
      "/admin/alerts": (reports.count ?? 0) + (calls.count ?? 0) + (ext.count ?? 0),
      "/admin/students": students.count ?? 0,
      "/admin/alumni": alumni.count ?? 0,
      "/admin/requests": requests.count ?? 0,
      "/admin/reports": reports.count ?? 0,
      "/admin/support": supportNeedsReply,
    };
  } else {
    // Members: unread conversations + unread coordinator replies.
    const supabase = await createClient();
    const me = profile.id;

    const { data: ms } = await supabase.from("mentorships").select("id"); // RLS: only mine
    const ids = (ms ?? []).map((m) => m.id);

    let unreadConvos = 0;
    if (ids.length) {
      const [readsRes, msgsRes] = await Promise.all([
        supabase.from("reads").select("ref_id, seen_at").eq("scope", "mentorship"),
        supabase.from("messages").select("mentorship_id, created_at").in("mentorship_id", ids).neq("sender_id", me).order("created_at", { ascending: false }),
      ]);
      const seen = new Map((readsRes.data ?? []).map((r) => [r.ref_id, r.seen_at]));
      const latestOther = new Map<string, string>();
      for (const m of msgsRes.data ?? []) if (!latestOther.has(m.mentorship_id)) latestOther.set(m.mentorship_id, m.created_at);
      for (const [mid, t] of latestOther) {
        const s = seen.get(mid);
        if (!s || new Date(t).getTime() > new Date(s).getTime()) unreadConvos++;
      }
    }

    const [supLatest, supRead] = await Promise.all([
      supabase.from("my_support_thread").select("from_coordinator, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("reads").select("seen_at").eq("scope", "support").maybeSingle(),
    ]);
    let supportUnread = 0;
    if (supLatest.data?.from_coordinator) {
      const s = supRead.data?.seen_at;
      if (!s || new Date(supLatest.data.created_at).getTime() > new Date(s).getTime()) supportUnread = 1;
    }

    badges = { "/mentorships": unreadConvos, "/support": supportUnread };
  }

  return (
    <HeaderBar
      links={links}
      badges={badges}
      fullName={profile.full_name}
      role={profile.role}
    />
  );
}
