import type { Metadata } from "next";
import { Trash2, ShieldAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requestDeletion, approveDeletion, rejectDeletion } from "@/app/actions/deletion";

export const metadata: Metadata = { title: "Data deletions · Admin" };

type Req = {
  id: string;
  subject_name: string | null;
  subject_email: string | null;
  reason: string | null;
  status: string;
  requested_by: string | null;
  created_at: string;
};

export default async function AdminDeletions({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; requested?: string; done?: string; rejected?: string }>;
}) {
  const me = await requireRole("admin");
  const { error, requested, done, rejected } = await searchParams;
  const supabase = await createClient();

  const [{ data: members }, { data: reqRows }, { data: requesters }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").in("role", ["student", "alumnus"]).order("full_name"),
    supabase.from("deletion_requests").select("id, subject_name, subject_email, reason, status, requested_by, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "admin"),
  ]);

  const requesterName = new Map((requesters ?? []).map((r) => [r.id, r.full_name]));
  const rows = (reqRows as Req[]) ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <Trash2 className="h-6 w-6 text-danger" /> Data deletions
      </h1>
      <p className="mt-1 text-body">
        Permanently erase a member and all their data. This is a two-coordinator
        action: one requests it, a different coordinator must approve. It cannot be undone.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {requested && <p className="mt-4 rounded-lg bg-gold-soft/60 p-3 text-sm text-ink">Deletion requested. A different coordinator must approve it.</p>}
      {done && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-success">Member permanently deleted.</p>}
      {rejected && <p className="mt-4 rounded-lg bg-canvas p-3 text-sm text-body">Deletion request rejected.</p>}

      {/* Request a deletion */}
      <div className="card mt-6 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Request a deletion</h2>
        <form action={requestDeletion} className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Member</label>
            <select name="subject_id" required className="field" defaultValue="">
              <option value="" disabled>Choose a member…</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "Member"} · {m.role} · {m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Reason</label>
            <input name="reason" className="field" placeholder="e.g. member requested account removal" />
          </div>
          <button className="btn btn-outline !text-danger">Request deletion</button>
        </form>
      </div>

      {/* Pending approvals */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Awaiting a second coordinator</h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 ? (
          <p className="card p-5 text-sm text-body">No pending deletion requests.</p>
        ) : (
          pending.map((r) => {
            const mine = r.requested_by === me.id;
            return (
              <div key={r.id} className="card border-danger/30 p-5">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <ShieldAlert className="h-4 w-4 text-danger" /> {r.subject_name || "Member"}
                </p>
                <p className="text-xs text-muted">{r.subject_email}</p>
                {r.reason && <p className="mt-2 text-sm text-body">{r.reason}</p>}
                <p className="mt-1 text-xs text-muted">
                  Requested by {requesterName.get(r.requested_by ?? "") || "a coordinator"} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <form action={approveDeletion}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      disabled={mine}
                      className="btn btn-primary !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      title={mine ? "A different coordinator must approve" : undefined}
                    >
                      Approve &amp; delete
                    </button>
                  </form>
                  <form action={rejectDeletion}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-outline !py-1.5 !text-xs">Reject</button>
                  </form>
                  {mine && <span className="text-xs text-muted">You requested this — a colleague must approve.</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-muted">History</h2>
          <div className="mt-3 space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2 text-sm">
                <span className="text-ink">{r.subject_name || "Member"}</span>
                <span className="chip capitalize">{r.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
