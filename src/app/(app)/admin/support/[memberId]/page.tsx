import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { replyToSupport } from "@/app/actions/support";

export const metadata: Metadata = { title: "Support thread · Admin" };

type Msg = { id: string; from_coordinator: boolean; body: string; created_at: string };

export default async function AdminSupportThread({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  await requireRole("admin");
  const { memberId } = await params;
  const supabase = await createClient();

  const [{ data: member }, { data: msgData }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, role").eq("id", memberId).maybeSingle(),
    supabase
      .from("support_messages")
      .select("id, from_coordinator, body, created_at")
      .eq("member_id", memberId)
      .order("created_at", { ascending: true }),
  ]);
  const messages = (msgData as Msg[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> All support threads
      </Link>

      <div className="mt-4">
        <h1 className="text-xl font-bold text-ink">{member?.full_name || "Member"}</h1>
        <p className="text-sm text-muted capitalize">
          {member?.role} · {member?.email}
        </p>
      </div>

      <div className="card mt-4 space-y-3 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No messages.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.from_coordinator ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.from_coordinator ? "bg-navy text-white" : "bg-canvas text-ink"
                }`}
              >
                {m.from_coordinator && (
                  <p className="mb-0.5 text-[11px] font-bold text-white/70">Coordinators (shown anonymously)</p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.from_coordinator ? "text-white/60" : "text-muted"}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form action={replyToSupport} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="member_id" value={memberId} />
        <textarea name="body" rows={2} required className="field flex-1" placeholder="Reply as the coordinators…" />
        <button className="btn btn-primary !px-4" title="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-muted">The member sees replies as “the Program Coordinators”, not your name.</p>
    </div>
  );
}
