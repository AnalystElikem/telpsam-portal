import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Mentorship" };

type M = {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

export default async function MentorshipsPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  // Only conversations I'm actually part of (admins would otherwise see all via
  // their coordinator RLS — that's what /admin/mentorships is for).
  const { data } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, expires_at, created_at")
    .or(`mentor_id.eq.${me.id},mentee_id.eq.${me.id}`)
    .order("created_at", { ascending: false });
  const rows = (data as M[]) ?? [];
  const displayStatus = (r: M) =>
    r.status !== "ended" && r.expires_at && new Date(r.expires_at).getTime() < Date.now()
      ? "ended"
      : r.status;

  const otherIds = Array.from(
    new Set(rows.map((r) => (r.mentor_id === me.id ? r.mentee_id : r.mentor_id)))
  );
  const { data: peopleData } = otherIds.length
    ? await supabase.from("member_cards").select("id, full_name").in("id", otherIds)
    : { data: [] };
  const people = new Map((peopleData ?? []).map((p) => [p.id, p]));

  // Unread per conversation: messages from the other person after I last looked.
  const ids = rows.map((r) => r.id);
  const [{ data: myReads }, { data: msgs }] = await Promise.all([
    supabase.from("reads").select("ref_id, seen_at").eq("user_id", me.id).eq("scope", "mentorship"),
    ids.length
      ? supabase.from("messages").select("mentorship_id, created_at").in("mentorship_id", ids).neq("sender_id", me.id)
      : Promise.resolve({ data: [] as { mentorship_id: string; created_at: string }[] }),
  ]);
  const seen = new Map((myReads ?? []).map((r) => [r.ref_id, r.seen_at]));
  const unread = new Map<string, number>();
  for (const m of msgs ?? []) {
    const s = seen.get(m.mentorship_id);
    if (!s || new Date(m.created_at).getTime() > new Date(s).getTime()) {
      unread.set(m.mentorship_id, (unread.get(m.mentorship_id) ?? 0) + 1);
    }
  }

  const label = me.role === "alumnus" ? "mentees" : "mentors";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">My mentorship</h1>
      <p className="mt-1 text-body">
        Conversations with your {label}. Everything stays inside the portal.
      </p>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <div className="card p-6 text-center text-body">
            You don&apos;t have any mentorships yet.
            {me.role === "student" && (
              <>
                {" "}
                <Link href="/directory" className="text-navy underline">
                  Browse the directory
                </Link>{" "}
                to request one.
              </>
            )}
          </div>
        ) : (
          rows.map((r) => {
            const other = people.get(r.mentor_id === me.id ? r.mentee_id : r.mentor_id);
            return (
              <Link key={r.id} href={`/mentorships/${r.id}`} className="card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-semibold text-ink">{other?.full_name || "Member"}</p>
                  <p className="text-sm capitalize text-body">
                    {me.role === "alumnus" ? "Mentee" : "Mentor"} · {displayStatus(r)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(unread.get(r.id) ?? 0) > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
                      {unread.get(r.id)}
                    </span>
                  )}
                  <MessagesSquare className="h-5 w-5 text-navy" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
