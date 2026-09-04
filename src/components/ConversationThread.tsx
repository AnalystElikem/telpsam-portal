"use client";

import { useOptimistic, useRef, useState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Send, UserRound } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; full_name: string; avatar_url: string | null };
type Msg = { id: string; sender_id: string; body: string; created_at: string; pending?: boolean };

function Avatar({ person }: { person: Person | undefined }) {
  if (person?.avatar_url) {
    return (
      <Image src={person.avatar_url} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
      <UserRound className="h-4 w-4" />
    </div>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary !px-4" title="Send" disabled={pending}>
      <Send className="h-4 w-4" />
    </button>
  );
}

export default function ConversationThread({
  mentorshipId,
  meId,
  people,
  initialMessages,
  canPost,
  otherId,
  otherSeenAt,
}: {
  mentorshipId: string;
  meId: string;
  people: Person[];
  initialMessages: Msg[];
  canPost: boolean;
  otherId: string | null;
  otherSeenAt: string | null;
}) {
  const byId = new Map(people.map((p) => [p.id, p]));

  // Realtime: the OTHER participant's new messages, streamed in live so they
  // appear without a refresh. My own messages are handled by the optimistic
  // update + revalidate, so we ignore my own inserts here to avoid a flicker.
  // Only participants subscribe (they have `otherId`); this respects RLS, and if
  // realtime is ever unavailable it fails silently — the chat still works on
  // refresh exactly as before.
  const [live, setLive] = useState<Msg[]>([]);
  useEffect(() => {
    if (!otherId) return;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`msgs-${mentorshipId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `mentorship_id=eq.${mentorshipId}` },
          (payload: { new: Msg }) => {
            const m = payload.new;
            if (!m?.id || m.sender_id === meId) return;
            setLive((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          }
        )
        .subscribe();
    } catch {
      /* realtime unavailable — silent fallback to refresh-to-see */
    }
    return () => {
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [mentorshipId, otherId, meId]);

  // Base = server messages + live inserts, deduped by id and time-ordered.
  const baseMessages = useMemo(() => {
    const map = new Map<string, Msg>();
    for (const m of initialMessages) map.set(m.id, m);
    for (const m of live) if (!map.has(m.id)) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [initialMessages, live]);

  const [messages, addOptimistic] = useOptimistic<Msg[], string>(
    baseMessages,
    (state, body) => [
      ...state,
      { id: `temp-${Date.now()}`, sender_id: meId, body, created_at: new Date().toISOString(), pending: true },
    ]
  );
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    const body = String(formData.get("body") || "").trim();
    if (!body) return;
    addOptimistic(body);
    formRef.current?.reset();
    await sendMessage(formData);
  }

  // "Seen" indicator: my last message read if the other party's last-seen is
  // after it.
  const myMsgs = messages.filter((m) => m.sender_id === meId && !m.pending);
  const lastMine = myMsgs[myMsgs.length - 1];
  let receipt: "Sent" | "Seen" | null = null;
  if (otherId && lastMine) {
    receipt = otherSeenAt && new Date(otherSeenAt).getTime() >= new Date(lastMine.created_at).getTime() ? "Seen" : "Sent";
  }

  return (
    <>
      <div className="card mt-4 space-y-3 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No messages yet. Say hello and introduce yourself.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            const person = byId.get(m.sender_id);
            const fromCoordinator = !person; // sender isn't a participant
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <Avatar person={person} />}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-navy text-white" : fromCoordinator ? "bg-gold-soft text-ink" : "bg-canvas text-ink"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  {fromCoordinator && <p className="mb-0.5 text-[11px] font-bold text-gold-600">TELPSAM Program Coordinators</p>}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-muted"}`}>
                    {m.pending ? "Sending…" : new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                {mine && <Avatar person={byId.get(meId)} />}
              </div>
            );
          })
        )}
      </div>

      {receipt && (
        <p className="mt-1 pr-1 text-right text-[11px] text-muted">
          {receipt === "Seen" ? "Seen" : "Sent"}
        </p>
      )}

      {canPost && (
        <>
          <form ref={formRef} action={action} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="mentorship_id" value={mentorshipId} />
            <textarea name="body" rows={2} required className="field flex-1" placeholder="Write a message…" />
            <SendButton />
          </form>
          <p className="mt-1.5 text-[11px] text-muted">
            Please keep messages at a natural pace, very rapid bursts are limited to keep the space healthy.
          </p>
        </>
      )}
    </>
  );
}
