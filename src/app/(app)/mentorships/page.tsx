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

  const { data } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, expires_at, created_at")
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
                <MessagesSquare className="h-5 w-5 text-navy" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
