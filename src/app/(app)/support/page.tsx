import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Send, LifeBuoy } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendSupportMessage } from "@/app/actions/support";

export const metadata: Metadata = { title: "Contact Coordinators" };

type Msg = { id: string; from_coordinator: boolean; body: string; created_at: string };

export default async function SupportPage() {
  const me = await requireProfile();
  if (me.role === "admin") redirect("/admin/support");
  const supabase = await createClient();

  const { data } = await supabase
    .from("my_support_thread")
    .select("id, from_coordinator, body, created_at")
    .order("created_at", { ascending: true });
  const messages = (data as Msg[]) ?? [];

  // Mark the support thread read (drives the unread badge).
  await supabase.from("reads").upsert(
    { user_id: me.id, scope: "support", ref_id: me.id, seen_at: new Date().toISOString() },
    { onConflict: "user_id,scope,ref_id" }
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <LifeBuoy className="h-6 w-6 text-teal" /> Message the coordinators
      </h1>
      <p className="mt-1 text-body">
        Ask the Program Coordinators anything, a question about the programme, a
        concern, or help with your account. Any coordinator may reply.
      </p>

      <div className="card mt-6 space-y-3 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No messages yet. Send the coordinators a note below.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.from_coordinator ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.from_coordinator ? "bg-gold-soft text-ink" : "bg-navy text-white"
                }`}
              >
                {m.from_coordinator && (
                  <p className="mb-0.5 text-[11px] font-bold text-gold-600">TELPSAM Program Coordinators</p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.from_coordinator ? "text-muted" : "text-white/60"}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form action={sendSupportMessage} className="mt-3 flex items-end gap-2">
        <textarea name="body" rows={2} required className="field flex-1" placeholder="Write to the coordinators…" />
        <button className="btn btn-primary !px-4" title="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
