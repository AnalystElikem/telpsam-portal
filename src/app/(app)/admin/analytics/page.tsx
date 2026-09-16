import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics · Admin" };

export default async function AdminAnalytics() {
  await requireRole("admin");
  const supabase = await createClient();

  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const HEAD = { count: "exact" as const, head: true };

  const [
    studentsApproved,
    studentsPending,
    alumniApproved,
    alumniPublished,
    mentorshipsActive,
    mentorshipsEnded,
    messagesTotal,
    messages7d,
    reportsOpen,
    callsOpen,
    requestsNew,
    ckGood,
    ckOkay,
    ckConcern,
  ] = await Promise.all([
    supabase.from("student_profiles").select("*", HEAD).eq("is_approved", true),
    supabase.from("student_profiles").select("*", HEAD).eq("is_approved", false),
    supabase.from("alumni_profiles").select("*", HEAD).eq("is_approved", true),
    supabase.from("alumni_profiles").select("*", HEAD).eq("is_approved", true).eq("is_published", true),
    supabase.from("mentorships").select("*", HEAD).eq("status", "active").eq("kind", "mentorship"),
    supabase.from("mentorships").select("*", HEAD).eq("status", "ended").eq("kind", "mentorship"),
    supabase.from("messages").select("*", HEAD),
    supabase.from("messages").select("*", HEAD).gte("created_at", d7),
    supabase.from("reports").select("*", HEAD).eq("status", "open"),
    supabase.from("call_requests").select("*", HEAD).eq("status", "open"),
    supabase.from("mentorship_requests").select("*", HEAD).eq("status", "new"),
    supabase.from("checkins").select("*", HEAD).eq("rating", "good"),
    supabase.from("checkins").select("*", HEAD).eq("rating", "okay"),
    supabase.from("checkins").select("*", HEAD).eq("rating", "concern"),
  ]);

  const n = (r: { count: number | null }) => r.count ?? 0;

  // Active conversations this week (distinct mentorships with a recent message).
  const { data: recentMsgs } = await supabase
    .from("messages")
    .select("mentorship_id")
    .gte("created_at", d7);
  const activeConversations = new Set((recentMsgs ?? []).map((m) => m.mentorship_id)).size;

  // Mentorships over time: the running total of mentorships ever created, by
  // month, for the last 12 months — so growth is visible at a glance.
  const { data: mRows } = await supabase
    .from("mentorships")
    .select("created_at")
    .eq("kind", "mentorship");
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en", { month: "short" }), added: 0 };
  });
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  let baseline = 0; // mentorships created before the 12-month window
  for (const r of mRows ?? []) {
    const d = new Date(r.created_at);
    if (d < windowStart) {
      baseline++;
      continue;
    }
    const i = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) months[i].added++;
  }
  let running = baseline;
  const series = months.map((m) => {
    running += m.added;
    return { label: m.label, total: running, added: m.added };
  });
  const maxTotal = Math.max(1, ...series.map((s) => s.total));
  const totalMentorships = (mRows ?? []).length;

  const groups: { title: string; stats: { label: string; value: number; accent?: string }[] }[] = [
    {
      title: "Members",
      stats: [
        { label: "Students approved", value: n(studentsApproved) },
        { label: "Students pending", value: n(studentsPending), accent: n(studentsPending) ? "text-gold-600" : undefined },
        { label: "Alumni approved", value: n(alumniApproved) },
        { label: "Alumni in directory", value: n(alumniPublished) },
      ],
    },
    {
      title: "Mentorships",
      stats: [
        { label: "Active pairings", value: n(mentorshipsActive) },
        { label: "Ended", value: n(mentorshipsEnded) },
        { label: "New requests", value: n(requestsNew), accent: n(requestsNew) ? "text-navy" : undefined },
        { label: "Active this week", value: activeConversations },
      ],
    },
    {
      title: "Engagement",
      stats: [
        { label: "Messages (all time)", value: n(messagesTotal) },
        { label: "Messages this week", value: n(messages7d) },
        { label: "Check-ins: going well", value: n(ckGood), accent: "text-success" },
        { label: "Check-ins: okay", value: n(ckOkay) },
      ],
    },
    {
      title: "Safety",
      stats: [
        { label: "Open flags/reports", value: n(reportsOpen), accent: n(reportsOpen) ? "text-danger" : undefined },
        { label: "Open call requests", value: n(callsOpen), accent: n(callsOpen) ? "text-teal" : undefined },
        { label: "Check-in concerns", value: n(ckConcern), accent: n(ckConcern) ? "text-danger" : undefined },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Coordinator</p>
      <h1 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">Analytics</h1>
      <p className="mt-1 text-body">A snapshot of the programme&apos;s health.</p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{g.title}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.stats.map((s) => (
                <div key={s.label} className="card p-5">
                  <p className={`text-3xl font-bold ${s.accent || "text-ink"}`}>{s.value}</p>
                  <p className="mt-1 text-sm text-body">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Mentorships over time</h2>
          <div className="card mt-3 p-5">
            <p className="text-sm text-body">
              <span className="text-3xl font-bold text-ink">{totalMentorships}</span> mentorships created in total
            </p>
            <div className="mt-6">
              <div className="flex h-32 items-end gap-1.5">
                {series.map((s, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-navy transition-colors hover:bg-gold"
                    style={{ height: `${Math.max(3, (s.total / maxTotal) * 100)}%` }}
                    title={`${s.label}: ${s.total} total (+${s.added} that month)`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {series.map((s, i) => (
                  <span key={i} className="flex-1 text-center text-[10px] text-muted">{s.label}</span>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Running total by month, last 12 months. Hover a bar for the count.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
