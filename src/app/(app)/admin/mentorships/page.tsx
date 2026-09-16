import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flag, Lock, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import { titleCaseName } from "@/lib/format";

export const metadata: Metadata = { title: "Mentorships · Admin" };

type M = { id: string; mentor_id: string; mentee_id: string; status: string; kind: string; created_at: string };

export default async function AdminMentorships() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, kind, created_at")
    .order("created_at", { ascending: false });
  const rows = (data as M[]) ?? [];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.mentor_id, r.mentee_id])));
  const { data: peopleData } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = new Map((peopleData ?? []).map((p) => [p.id, p.full_name]));

  // Which conversations carry a flag/report (the only ones a coordinator can open).
  const { data: flagRows } = rows.length
    ? await supabase
        .from("reports")
        .select("mentorship_id")
        .in("mentorship_id", rows.map((r) => r.id))
    : { data: [] };
  const flagged = new Set((flagRows ?? []).map((f) => f.mentorship_id));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Coordinator</p>
      <h1 className="mt-1.5 text-2xl font-bold text-navy sm:text-3xl">Mentorships</h1>
      <p className="mt-2 text-body">
        Every active pairing. Conversations are private, you can only open and read
        a thread once it has been flagged or reported.
      </p>

      <div className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No mentorships yet" hint="Active pairings and one-time questions will appear here once you connect members." />
        ) : (
          rows.map((r) => {
            const isFlagged = flagged.has(r.id);
            const inner = (
              <>
                <div className="text-sm">
                  <span className="font-semibold text-ink">{titleCaseName(names.get(r.mentee_id)) || "Student"}</span>
                  <span className="text-muted">{r.kind === "question" ? " asking " : " mentored by "}</span>
                  <span className="font-semibold text-ink">{titleCaseName(names.get(r.mentor_id)) || "Alumnus"}</span>
                </div>
                <div className="flex items-center gap-3">
                  {r.kind === "question" && (
                    <span className="chip chip-gold">Question</span>
                  )}
                  {isFlagged ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-semibold text-coral">
                      <Flag className="h-3 w-3" /> Flagged
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Lock className="h-3 w-3" /> Private
                    </span>
                  )}
                  <span
                    className={`chip capitalize ${
                      r.status === "active" ? "chip-success" : r.status === "ended" ? "chip-muted" : "chip-gold"
                    }`}
                  >
                    {r.status}
                  </span>
                  {isFlagged && <ArrowRight className="h-4 w-4 text-navy" />}
                </div>
              </>
            );
            return isFlagged ? (
              <Link key={r.id} href={`/mentorships/${r.id}`} className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                {inner}
              </Link>
            ) : (
              <div key={r.id} className="card flex items-center justify-between p-4 opacity-80">
                {inner}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
