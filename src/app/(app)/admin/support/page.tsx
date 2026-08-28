import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Support · Admin" };

type Row = { id: string; member_id: string; from_coordinator: boolean; body: string; created_at: string };

export default async function AdminSupport() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("support_messages")
    .select("id, member_id, from_coordinator, body, created_at")
    .order("created_at", { ascending: false });
  const all = (data as Row[]) ?? [];

  // Latest message per member.
  const latest = new Map<string, Row>();
  for (const m of all) if (!latest.has(m.member_id)) latest.set(m.member_id, m);
  const threads = Array.from(latest.values());

  const memberIds = threads.map((t) => t.member_id);
  const { data: people } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", memberIds)
    : { data: [] };
  const pById = new Map((people ?? []).map((p) => [p.id, p]));

  const needsReply = threads.filter((t) => !t.from_coordinator);
  const answered = threads.filter((t) => t.from_coordinator);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <LifeBuoy className="h-6 w-6 text-teal" /> Support
      </h1>
      <p className="mt-1 text-body">
        Messages from members to the coordinators. Any coordinator can reply; the
        member is never told which one.
      </p>

      <Section title={`Needs a reply (${needsReply.length})`} rows={needsReply} pById={pById} highlight />
      <Section title="Answered" rows={answered} pById={pById} />
    </div>
  );
}

function Section({
  title,
  rows,
  pById,
  highlight = false,
}: {
  title: string;
  rows: Row[];
  pById: Map<string, { full_name: string; role: string }>;
  highlight?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="card p-5 text-sm text-body">Nothing here.</p>
        ) : (
          rows.map((t) => {
            const p = pById.get(t.member_id);
            return (
              <Link
                key={t.id}
                href={`/admin/support/${t.member_id}`}
                className={`card flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md ${highlight ? "border-teal/40" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {p?.full_name || "Member"}
                    <span className="ml-2 text-xs font-normal capitalize text-muted">{p?.role}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {t.from_coordinator ? "You: " : ""}
                    {t.body}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-navy" />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
