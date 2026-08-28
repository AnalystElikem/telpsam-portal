import type { Metadata } from "next";
import { ShieldCheck, Star } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { promoteToCoordinator, demoteCoordinator } from "@/app/actions/superadmin";

export const metadata: Metadata = { title: "Coordinators · Super admin" };

type P = { id: string; full_name: string; email: string; role: string; is_superadmin: boolean };

export default async function AdminCoordinators({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; promoted?: string; demoted?: string }>;
}) {
  const me = await requireSuperAdmin();
  const { error, promoted, demoted } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_superadmin")
    .order("full_name");
  const all = (data as P[]) ?? [];
  const coordinators = all.filter((p) => p.role === "admin");
  const members = all.filter((p) => p.role === "student" || p.role === "alumnus");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <Star className="h-6 w-6 text-gold-600" /> Coordinators
      </h1>
      <p className="mt-1 text-body">
        As super admin, you can appoint and remove Program Coordinators. Only you see this page.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {promoted && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-success">Coordinator appointed.</p>}
      {demoted && <p className="mt-4 rounded-lg bg-canvas p-3 text-sm text-body">Coordinator removed (moved to alumnus).</p>}

      {/* Current coordinators */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Current coordinators</h2>
      <div className="mt-3 space-y-2">
        {coordinators.map((c) => (
          <div key={c.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="flex items-center gap-2 font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-navy" />
                {c.full_name || "Coordinator"}
                {c.is_superadmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase text-gold-600">
                    <Star className="h-3 w-3" /> Super admin
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">{c.email}</p>
            </div>
            {c.id === me.id || c.is_superadmin ? (
              <span className="text-xs text-muted">{c.id === me.id ? "You" : "Protected"}</span>
            ) : (
              <form action={demoteCoordinator}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn btn-outline !py-1.5 !text-xs !text-danger">Remove</button>
              </form>
            )}
          </div>
        ))}
      </div>

      {/* Appoint a new coordinator */}
      <div className="card mt-8 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Appoint a coordinator</h2>
        <p className="mt-1 text-xs text-muted">Promotes a member to a Program Coordinator. They keep any alumni profile they hold.</p>
        <form action={promoteToCoordinator} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="mb-1 block text-sm font-medium text-ink">Member</label>
            <select name="id" required defaultValue="" className="field">
              <option value="" disabled>Choose a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "Member"} · {m.role} · {m.email}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">Appoint</button>
        </form>
      </div>
    </div>
  );
}
