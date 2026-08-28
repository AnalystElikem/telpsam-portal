import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignMentorship, updateRequestStatus } from "@/app/actions/admin";
import { MAX_MENTEES } from "@/lib/constants";

export const metadata: Metadata = { title: "Requests · Admin" };

type Req = {
  id: string;
  student_id: string;
  alumnus_id: string | null;
  kind: string;
  message: string;
  status: string;
  created_at: string;
};

export default async function AdminRequests({
  searchParams,
}: {
  searchParams: Promise<{ assigned?: string; error?: string }>;
}) {
  await requireRole("admin");
  const { assigned, error } = await searchParams;
  const supabase = await createClient();

  const { data: reqData } = await supabase
    .from("mentorship_requests")
    .select("id, student_id, alumnus_id, kind, message, status, created_at")
    .order("created_at", { ascending: false });
  const requests = (reqData as Req[]) ?? [];

  // Names for everyone involved.
  const ids = Array.from(
    new Set(
      requests.flatMap((r) => [r.student_id, r.alumnus_id].filter(Boolean) as string[])
    )
  );
  const { data: peopleData } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const people = new Map(
    (peopleData ?? []).map((p) => [p.id, p as { id: string; full_name: string; email: string }])
  );

  // Approved alumni for the mentor dropdown.
  const { data: mentorsData } = await supabase
    .from("alumni_profiles")
    .select("id, profiles(full_name)")
    .eq("is_approved", true);
  // Current active load per mentor, to enforce and show the capacity limit.
  const { data: activeMs } = await supabase
    .from("mentorships")
    .select("mentor_id")
    .eq("status", "active");
  const load = new Map<string, number>();
  for (const m of activeMs ?? []) load.set(m.mentor_id, (load.get(m.mentor_id) ?? 0) + 1);

  const mentors = ((mentorsData as unknown as { id: string; profiles: { full_name: string } | null }[]) ?? []).map(
    (m) => {
      const n = load.get(m.id) ?? 0;
      return { id: m.id, name: m.profiles?.full_name || "Alumnus", load: n, full: n >= MAX_MENTEES };
    }
  );

  const active = requests.filter((r) => r.status === "new");
  const done = requests.filter((r) => r.status !== "new");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Mentorship requests</h1>
      <p className="mt-1 text-body">Match each student to an approved mentor. Pairings are created only here.</p>

      {assigned && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Mentorship created. Both parties can now message in the portal.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
      )}

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">New</h2>
      <div className="mt-3 space-y-4">
        {active.length === 0 ? (
          <p className="card p-5 text-sm text-body">No new requests.</p>
        ) : (
          active.map((r) => {
            const student = people.get(r.student_id);
            const wanted = r.alumnus_id ? people.get(r.alumnus_id) : null;
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{student?.full_name || "Student"}</p>
                  <span className="chip capitalize">{r.kind}</span>
                </div>
                <p className="text-xs text-muted">{student?.email}</p>
                {wanted && (
                  <p className="mt-1 text-sm text-body">
                    Interested in: <span className="font-medium text-ink">{wanted.full_name}</span>
                  </p>
                )}
                <p className="mt-2 rounded-lg bg-canvas p-3 text-sm text-body">{r.message}</p>

                <form action={assignMentorship} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="mentee_id" value={r.student_id} />
                  <input type="hidden" name="request_id" value={r.id} />
                  <div className="flex-1 min-w-[180px]">
                    <label className="mb-1 block text-xs font-medium text-muted">Assign mentor</label>
                    <select name="mentor_id" defaultValue={r.alumnus_id || ""} required className="field">
                      <option value="" disabled>Choose an approved alumnus…</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.full}>
                          {m.name} ({m.load}/{MAX_MENTEES}{m.full ? " · full" : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary">Create pairing</button>
                </form>

                <form action={updateRequestStatus} className="mt-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button className="text-xs text-muted underline hover:text-danger">Decline this request</button>
                </form>
              </div>
            );
          })
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-muted">Handled</h2>
          <div className="mt-3 space-y-2">
            {done.map((r) => {
              const student = people.get(r.student_id);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2 text-sm">
                  <span className="text-ink">{student?.full_name || "Student"}</span>
                  <span className="chip capitalize">{r.status}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
