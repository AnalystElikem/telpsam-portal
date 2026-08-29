import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Phone, LogOut, ArrowRight, CheckCircle2, Moon, CalendarPlus, Eye } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markCallHandled, resolveExtension } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Alerts · Admin" };

export default async function AdminAlerts() {
  await requireRole("admin");
  const supabase = await createClient();

  // Open flags/reports. High-confidence ones need attention now; low-confidence
  // ones (broad hints the AI/regex caught but wasn't sure about) go to a quieter
  // "for review" list so coordinators aren't pinged for every maybe.
  const { data: allReports } = await supabase
    .from("reports")
    .select("id, mentorship_id, source, reason, severity, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const reports = (allReports ?? []).filter((r) => r.severity !== "low");
  const lowReports = (allReports ?? []).filter((r) => r.severity === "low");

  // Open call requests.
  const { data: calls } = await supabase
    .from("call_requests")
    .select("id, mentorship_id, requester_id, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  // Pending extension requests.
  const { data: extRows } = await supabase
    .from("extension_requests")
    .select("id, mentorship_id, requester_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Recently ended mentorships.
  const { data: endedRows } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, ended_by, ended_at")
    .eq("status", "ended")
    .order("ended_at", { ascending: false })
    .limit(20);

  const callList = calls ?? [];
  const extensions = extRows ?? [];
  const ended = endedRows ?? [];

  // Dormant mentorships: active pairings with no message for a while.
  const DORMANT_DAYS = 14;
  const cutoff = Date.now() - DORMANT_DAYS * 86_400_000;
  const { data: activeRows } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, created_at")
    .eq("status", "active");
  const activeList = activeRows ?? [];
  const activeIds = activeList.map((m) => m.id);
  const { data: activeMsgs } = activeIds.length
    ? await supabase.from("messages").select("mentorship_id, created_at").in("mentorship_id", activeIds).order("created_at", { ascending: false })
    : { data: [] };
  const lastMsgAt = new Map<string, string>();
  for (const m of activeMsgs ?? []) if (!lastMsgAt.has(m.mentorship_id)) lastMsgAt.set(m.mentorship_id, m.created_at);
  const dormant = activeList
    .filter((m) => {
      const created = new Date(m.created_at).getTime();
      const last = lastMsgAt.get(m.id);
      const lastTime = last ? new Date(last).getTime() : created;
      return created < cutoff && lastTime < cutoff;
    })
    .map((m) => ({ ...m, lastActivity: lastMsgAt.get(m.id) ?? null }));

  // Gather people + phones for the call requests, ended, and dormant lists.
  const mentorshipIds = Array.from(
    new Set([
      ...callList.map((c) => c.mentorship_id),
      ...extensions.map((e) => e.mentorship_id),
      ...ended.map((e) => e.id),
    ])
  );
  const { data: ms } = mentorshipIds.length
    ? await supabase.from("mentorships").select("id, mentor_id, mentee_id").in("id", mentorshipIds)
    : { data: [] };
  const mById = new Map((ms ?? []).map((m) => [m.id, m]));

  const personIds = Array.from(
    new Set([
      ...(ms ?? []).flatMap((m) => [m.mentor_id, m.mentee_id]),
      ...dormant.flatMap((m) => [m.mentor_id, m.mentee_id]),
    ])
  );
  const { data: people } = personIds.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", personIds)
    : { data: [] };
  const pById = new Map((people ?? []).map((p) => [p.id, p]));

  // Phones live on the role-specific tables.
  const { data: sPhones } = personIds.length
    ? await supabase.from("student_profiles").select("id, phone").in("id", personIds)
    : { data: [] };
  const { data: aPhones } = personIds.length
    ? await supabase.from("alumni_contact").select("id, phone").in("id", personIds)
    : { data: [] };
  const phoneById = new Map<string, string>();
  for (const s of sPhones ?? []) if (s.phone) phoneById.set(s.id, s.phone);
  for (const a of aPhones ?? []) if (a.phone) phoneById.set(a.id, a.phone);

  const name = (id: string | null) => (id ? pById.get(id)?.full_name || "Member" : "Member");

  const nothing =
    reports.length === 0 && lowReports.length === 0 && callList.length === 0 && extensions.length === 0 &&
    ended.length === 0 && dormant.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Alerts</h1>
      <p className="mt-1 text-body">
        Everything that needs a coordinator&apos;s eye: flagged conversations, phone-call
        requests, dormant pairings, and mentorships that have ended.
      </p>

      {nothing && (
        <p className="card mt-6 p-6 text-center text-sm text-body">
          All clear. No open flags, call requests, or recent endings. 🎉
        </p>
      )}

      {/* High-confidence flags */}
      {reports.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger">
            <Flag className="h-4 w-4" /> Flagged conversations ({reports.length})
          </h2>
          <div className="mt-3 space-y-2">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={r.mentorship_id ? `/mentorships/${r.mentorship_id}` : "/admin/reports"}
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md"
              >
                <div className="text-sm">
                  <span className="font-semibold text-ink">{r.reason}</span>
                  <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                    {r.source === "auto" ? "Auto" : "Report"}
                  </span>
                  <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-navy" />
              </Link>
            ))}
          </div>
          <Link href="/admin/reports" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">
            Manage all reports →
          </Link>
        </section>
      )}

      {/* Low-confidence hints — a quiet review list, not urgent. */}
      {lowReports.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <Eye className="h-4 w-4" /> For review · lower priority ({lowReports.length})
          </h2>
          <p className="mt-1 text-xs text-muted">
            Broad hints the scanner wasn&apos;t sure about. Worth a glance, but not urgent.
          </p>
          <div className="mt-3 space-y-2">
            {lowReports.map((r) => (
              <Link
                key={r.id}
                href={r.mentorship_id ? `/mentorships/${r.mentorship_id}` : "/admin/reports"}
                className="flex items-center justify-between rounded-lg border border-line bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="text-sm">
                  <span className="text-body">{r.reason}</span>
                  <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Call requests */}
      {callList.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal">
            <Phone className="h-4 w-4" /> Phone-call requests ({callList.length})
          </h2>
          <div className="mt-3 space-y-2">
            {callList.map((c) => {
              const m = mById.get(c.mentorship_id);
              const otherId = m ? (m.mentor_id === c.requester_id ? m.mentee_id : m.mentor_id) : null;
              return (
                <div key={c.id} className="card p-4">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{name(c.requester_id)}</span>{" "}
                    <span className="text-muted">
                      ({pById.get(c.requester_id)?.role}) requested a call with{" "}
                    </span>
                    <span className="font-semibold">{name(otherId)}</span>
                  </p>
                  <div className="mt-2 grid gap-1 text-xs text-body sm:grid-cols-2">
                    <span>
                      Requester phone:{" "}
                      <span className="font-semibold text-ink">{phoneById.get(c.requester_id) || "—"}</span>
                    </span>
                    <span>
                      Other party phone:{" "}
                      <span className="font-semibold text-ink">{otherId ? phoneById.get(otherId) || "—" : "—"}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {c.mentorship_id && (
                      <Link href={`/mentorships/${c.mentorship_id}`} className="btn btn-outline !py-1.5 !text-xs">
                        View pairing
                      </Link>
                    )}
                    <form action={markCallHandled}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn btn-primary !py-1.5 !text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark handled
                      </button>
                    </form>
                    <span className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Extension requests */}
      {extensions.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy">
            <CalendarPlus className="h-4 w-4" /> Extension requests ({extensions.length})
          </h2>
          <p className="mt-1 text-xs text-muted">Approving adds 2 weeks and reopens the conversation.</p>
          <div className="mt-3 space-y-2">
            {extensions.map((x) => {
              const m = mById.get(x.mentorship_id);
              return (
                <div key={x.id} className="card p-4">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{name(x.requester_id)}</span>{" "}
                    <span className="text-muted">asked to extend the mentorship with </span>
                    <span className="font-semibold">
                      {m ? name(m.mentor_id === x.requester_id ? m.mentee_id : m.mentor_id) : "their partner"}
                    </span>
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <form action={resolveExtension}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="approve" value="true" />
                      <button className="btn btn-primary !py-1.5 !text-xs">Approve · +2 weeks</button>
                    </form>
                    <form action={resolveExtension}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="approve" value="false" />
                      <button className="btn btn-outline !py-1.5 !text-xs">Decline</button>
                    </form>
                    <span className="text-xs text-muted">{new Date(x.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Dormant mentorships */}
      {dormant.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gold-600">
            <Moon className="h-4 w-4" /> Dormant mentorships ({dormant.length})
          </h2>
          <p className="mt-1 text-xs text-muted">No messages for {DORMANT_DAYS}+ days. Consider checking in with the pair.</p>
          <div className="mt-3 space-y-2">
            {dormant.map((m) => (
              <Link
                key={m.id}
                href={`/mentorships/${m.id}`}
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md"
              >
                <span className="text-sm text-ink">
                  {name(m.mentee_id)} &amp; {name(m.mentor_id)}
                </span>
                <span className="text-xs text-muted">
                  {m.lastActivity
                    ? `last message ${new Date(m.lastActivity).toLocaleDateString()}`
                    : "no messages yet"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ended mentorships */}
      {ended.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <LogOut className="h-4 w-4" /> Recently ended
          </h2>
          <div className="mt-3 space-y-2">
            {ended.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2.5 text-sm">
                <span className="text-ink">
                  {name(e.mentee_id)} &amp; {name(e.mentor_id)}
                  <span className="text-muted"> · ended by {name(e.ended_by)}</span>
                </span>
                <span className="text-xs text-muted">
                  {e.ended_at ? new Date(e.ended_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
