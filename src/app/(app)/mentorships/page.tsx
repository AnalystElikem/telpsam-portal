import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Inbox, Check, X, CheckCircle2, AlertCircle } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { respondToProposal } from "@/app/actions/proposals";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { titleCaseName } from "@/lib/format";

export const metadata: Metadata = { title: "My Mentorship" };

type M = {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  kind: string;
  expires_at: string | null;
  created_at: string;
};
type Proposal = {
  id: string;
  mentee_name: string | null;
  mentee_role: string | null;
  request_kind: string | null;
  request_message: string | null;
};

export default async function MentorshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string; declined?: string; error?: string }>;
}) {
  const me = await requireProfile();
  const { accepted, declined, error } = await searchParams;
  const supabase = await createClient();

  // Pending invitations for me as a proposed mentor.
  const { data: propData } = await supabase
    .from("my_proposals")
    .select("id, mentee_name, mentee_role, request_kind, request_message")
    .order("created_at", { ascending: true });
  const proposals = (propData as Proposal[]) ?? [];

  const { data } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, kind, expires_at, created_at")
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

  // Unread per conversation.
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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Your conversations"
        title="My mentorship"
        subtitle="Your mentorship conversations. Everything stays inside the portal."
      />

      {accepted && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> You&apos;ve accepted. The mentorship is now active — say hello below.
        </p>
      )}
      {declined && (
        <p className="mt-4 rounded-lg bg-canvas p-3 text-sm text-body">
          You&apos;ve declined the invitation. The coordinators have been notified.
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Pending invitations to mentor */}
      {proposals.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy">
            <Inbox className="h-4 w-4" /> Invitations to mentor ({proposals.length})
          </h2>
          <p className="mt-1 text-xs text-muted">
            The coordinators have asked you to mentor the person below. Accept only if you can walk with them well.
          </p>
          <div className="mt-3 space-y-3">
            {proposals.map((p) => (
              <div key={p.id} className="card border-navy/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{titleCaseName(p.mentee_name) || "A member"}</p>
                  <span className="chip capitalize">{p.mentee_role || "member"}</span>
                </div>
                {p.request_message && (
                  <p className="mt-2 rounded-lg bg-canvas p-3 text-sm text-body">
                    {p.request_kind === "question" ? "They have a specific question: " : "What they're hoping for: "}
                    {p.request_message}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <form action={respondToProposal}>
                    <input type="hidden" name="proposal_id" value={p.id} />
                    <input type="hidden" name="decision" value="accept" />
                    <button className="btn btn-primary !py-1.5 !text-sm">
                      <Check className="h-4 w-4" /> Accept
                    </button>
                  </form>
                  <form action={respondToProposal}>
                    <input type="hidden" name="proposal_id" value={p.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <button className="btn btn-outline !py-1.5 !text-sm">
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            hint="When you're matched with a mentor or connected for a question, it appears here."
          >
            <Link href="/directory" className="btn btn-outline !py-1.5 !text-sm">Browse the directory</Link>
          </EmptyState>
        ) : (
          rows.map((r) => {
            const iAmMentor = r.mentor_id === me.id;
            const other = people.get(iAmMentor ? r.mentee_id : r.mentor_id);
            return (
              <Link key={r.id} href={`/mentorships/${r.id}`} className="card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-semibold text-ink">{titleCaseName(other?.full_name) || "Member"}</p>
                  <p className="text-sm capitalize text-body">
                    {r.kind === "question"
                      ? `Quick question · ${displayStatus(r)}`
                      : `${iAmMentor ? "Mentee" : "Mentor"} · ${displayStatus(r)}`}
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
