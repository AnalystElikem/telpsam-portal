import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Requests" };

const STATUS: Record<string, { label: string; className: string }> = {
  new: { label: "With the Coordinators", className: "bg-gold-soft text-gold-600" },
  assigned: { label: "Matched", className: "bg-green-100 text-success" },
  declined: { label: "Not matched", className: "bg-red-50 text-danger" },
  closed: { label: "Closed", className: "bg-line-soft text-muted" },
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  await requireRole("student");
  const { sent } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("mentorship_requests")
    .select("id, kind, message, status, created_at")
    .order("created_at", { ascending: false });

  const requests = data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">My requests</h1>
      <p className="mt-1 text-body">
        Requests you&apos;ve sent to the Program Coordinators. When you&apos;re matched, your
        mentorship appears under{" "}
        <Link href="/mentorships" className="text-gold-600 underline">My Mentorship</Link>.
      </p>

      {sent && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Request sent. The Program Coordinators will review it.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {requests.length === 0 ? (
          <div className="card p-6 text-center text-body">
            You haven&apos;t sent any requests yet.{" "}
            <Link href="/directory" className="text-navy underline">Browse the directory</Link>.
          </div>
        ) : (
          requests.map((r) => {
            const s = STATUS[r.status] ?? STATUS.new;
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold capitalize text-ink">{r.kind}</span>
                  <span className={`chip ${s.className}`}>{s.label}</span>
                </div>
                <p className="mt-2 text-sm text-body">{r.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
