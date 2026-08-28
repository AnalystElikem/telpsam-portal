import type { Metadata } from "next";
import Link from "next/link";
import { Flag, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Reports · Admin" };

type R = {
  id: string;
  reporter_id: string;
  mentorship_id: string | null;
  source: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export default async function AdminReports() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("reports")
    .select("id, reporter_id, mentorship_id, source, reason, details, status, created_at")
    .order("created_at", { ascending: false });
  const rows = (data as R[]) ?? [];

  const ids = Array.from(new Set(rows.map((r) => r.reporter_id)));
  const { data: peopleData } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const people = new Map((peopleData ?? []).map((p) => [p.id, p]));

  const open = rows.filter((r) => r.status === "open");
  const resolved = rows.filter((r) => r.status === "resolved");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Reports</h1>
      <p className="mt-1 text-body">Concerns raised by students or alumni. Review and act promptly.</p>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Open</h2>
      <div className="mt-3 space-y-3">
        {open.length === 0 ? (
          <p className="card p-5 text-sm text-body">No open reports. 🎉</p>
        ) : (
          open.map((r) => {
            const reporter = people.get(r.reporter_id);
            return (
              <div key={r.id} className="card border-danger/30 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <Flag className="h-4 w-4 text-danger" /> {r.reason}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        r.source === "auto" ? "bg-violet/10 text-violet" : "bg-gold-soft text-gold-600"
                      }`}
                    >
                      {r.source === "auto" ? "Auto" : "Report"}
                    </span>
                    <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {r.source === "auto"
                    ? "Automatically flagged from a message in the conversation"
                    : `Reported by ${reporter?.full_name || "a member"} (${reporter?.email})`}
                </p>
                {r.details && <p className="mt-2 rounded-lg bg-canvas p-3 text-sm text-body">{r.details}</p>}
                <div className="mt-3 flex items-center gap-3">
                  {r.mentorship_id && (
                    <Link href={`/mentorships/${r.mentorship_id}`} className="btn btn-outline !py-1.5 !text-xs">
                      View conversation
                    </Link>
                  )}
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-primary !py-1.5 !text-xs">Mark resolved</button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {resolved.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-muted">Resolved</h2>
          <div className="mt-3 space-y-2">
            {resolved.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {r.reason}
                </span>
                <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
