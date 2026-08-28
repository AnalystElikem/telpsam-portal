import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log · Admin" };

type Row = {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

const LABELS: Record<string, string> = {
  view_flagged_conversation: "Opened a flagged conversation",
  approve_student: "Approved a student",
  revoke_student: "Revoked a student",
  approve_alumnus: "Approved an alumnus",
  revoke_alumnus: "Revoked an alumnus",
  assign_mentorship: "Assigned a mentorship",
  resolve_report: "Resolved a report",
  mark_call_handled: "Handled a call request",
};

export default async function AdminAudit() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, detail, created_at, actor:actor_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <ScrollText className="h-6 w-6 text-navy" /> Audit log
      </h1>
      <p className="mt-1 text-body">
        A record of sensitive coordinator actions, for accountability. Most recent first.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-body">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="text-sm">
                  <p className="text-ink">
                    <span className="font-semibold">{r.actor?.full_name || "A coordinator"}</span>{" "}
                    {LABELS[r.action] || r.action}
                  </p>
                  {r.detail && <p className="text-xs text-muted">{r.detail}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
