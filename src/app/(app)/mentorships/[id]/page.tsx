import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Flag, Send, Lock, Phone, LogOut } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import MentorshipGuide from "@/components/MentorshipGuide";
import { sendMessage, reportConcern, endMentorship, requestCall, submitCheckin, requestExtension } from "@/app/actions/messages";

export const metadata: Metadata = { title: "Conversation" };

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type FlagRow = { id: string; source: string; reason: string; status: string; created_at: string };

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string; call?: string; ended?: string; checkin?: string; slow?: string; extension?: string }>;
}) {
  const me = await requireProfile();
  const { id } = await params;
  const { reported, call, ended, checkin, slow, extension } = await searchParams;
  const supabase = await createClient();

  const { data: mentorship } = await supabase
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, ended_at, ended_by, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!mentorship) notFound();

  const isParticipant =
    mentorship.mentor_id === me.id || mentorship.mentee_id === me.id;
  const isCoordinatorView = me.role === "admin" && !isParticipant;
  if (!isParticipant && !isCoordinatorView) notFound();

  const expiresAt = mentorship.expires_at ? new Date(mentorship.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const isEnded = mentorship.status === "ended" || isExpired;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;

  // A mentorship can be extended only ONCE. Read any existing request (either
  // participant can see it) to decide what to show.
  const { data: extReq } = isParticipant
    ? await supabase
        .from("extension_requests")
        .select("status")
        .eq("mentorship_id", id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const hasPendingExtension = extReq?.status === "pending";
  const extensionUsed = Boolean(extReq); // one-time: any prior request blocks another
  const canRequestExtension =
    isParticipant &&
    mentorship.status !== "ended" &&
    !extensionUsed &&
    (isExpired || (daysLeft !== null && daysLeft <= 14));

  const otherId =
    mentorship.mentor_id === me.id ? mentorship.mentee_id : mentorship.mentor_id;
  const { data: peopleData } = await supabase
    .from("member_cards")
    .select("id, full_name")
    .in("id", [mentorship.mentor_id, mentorship.mentee_id]);
  const names = new Map((peopleData ?? []).map((p) => [p.id, p.full_name]));
  const otherName = names.get(otherId) || "Member";
  const menteeName = names.get(mentorship.mentee_id) || "Student";
  const mentorName = names.get(mentorship.mentor_id) || "Alumnus";

  let flags: FlagRow[] = [];
  if (isCoordinatorView) {
    const { data: reportData } = await supabase
      .from("reports")
      .select("id, source, reason, status, created_at")
      .eq("mentorship_id", id)
      .order("created_at", { ascending: false });
    flags = (reportData as FlagRow[]) ?? [];
  }
  const isFlagged = flags.length > 0;
  const canSeeThread = isParticipant || (isCoordinatorView && isFlagged);

  // Record when a coordinator reads a flagged conversation (deduped ~10 min).
  if (isCoordinatorView && isFlagged) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", me.id)
      .eq("action", "view_flagged_conversation")
      .eq("target_id", id)
      .gte("created_at", since);
    if ((count ?? 0) === 0) {
      await logAudit(supabase, me.id, "view_flagged_conversation", {
        targetType: "mentorship",
        targetId: id,
      });
    }
  }

  const { data: msgData } = canSeeThread
    ? await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("mentorship_id", id)
        .order("created_at", { ascending: true })
    : { data: [] };
  const messages = (msgData as Msg[]) ?? [];

  const canPost = !isEnded && (isParticipant || (isCoordinatorView && isFlagged));

  // Periodic check-in: ask a participant how it's going if they haven't in ~14 days.
  let checkinDue = false;
  if (isParticipant && !isEnded) {
    const { data: lastCheckin } = await supabase
      .from("checkins")
      .select("created_at")
      .eq("mentorship_id", id)
      .eq("respondent_id", me.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ageDays = lastCheckin
      ? (Date.now() - new Date(lastCheckin.created_at).getTime()) / 86_400_000
      : Infinity;
    checkinDue = ageDays >= 14;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={isCoordinatorView ? "/admin/reports" : "/mentorships"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />{" "}
        {isCoordinatorView ? "Back to flags" : "All conversations"}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">
            {isCoordinatorView ? `${menteeName} & ${mentorName}` : otherName}
          </h1>
          <p className="text-sm capitalize text-muted">
            {isCoordinatorView
              ? `Coordinator review · ${mentorship.status}`
              : `${mentorship.mentor_id === me.id ? "Your mentee" : "Your mentor"} · ${mentorship.status}`}
          </p>
        </div>
      </div>

      {isEnded && (
        <p className="mt-3 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-body">
          {isExpired && mentorship.status !== "ended"
            ? "This mentorship has reached the end of its 3-month period, so the conversation is now read-only."
            : "This mentorship has ended. The conversation is now read-only."}
          {isCoordinatorView && mentorship.ended_by && (
            <>
              {" "}
              Ended by{" "}
              <span className="font-semibold">
                {names.get(mentorship.ended_by) || "a participant"}
              </span>
              {mentorship.ended_at
                ? ` on ${new Date(mentorship.ended_at).toLocaleDateString()}`
                : ""}
              .
            </>
          )}
        </p>
      )}

      {isParticipant && !isEnded && expiresAt && (
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">
          This mentorship runs until {expiresAt.toLocaleDateString()}
          {daysLeft !== null && daysLeft <= 14 ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : ""}.
          It ends automatically then. A one-time 2-week extension can be requested.
        </p>
      )}

      {hasPendingExtension && (
        <p className="mt-3 rounded-lg bg-gold-soft/50 px-3 py-2 text-xs text-ink">
          An extension request is with the Program Coordinators.
        </p>
      )}

      {isParticipant && extensionUsed && !hasPendingExtension && (
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">
          This mentorship has already used its one-time extension and can&apos;t be extended again.
        </p>
      )}

      {canRequestExtension && (
        <form action={requestExtension} className="mt-3">
          <input type="hidden" name="mentorship_id" value={id} />
          <button className="btn btn-outline !py-1.5 !text-sm">Request a one-time 2-week extension</button>
        </form>
      )}

      {extension && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-success">
          Your extension request has been sent to the Program Coordinators.
        </p>
      )}

      {isParticipant && !isEnded && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-gold-soft/50 px-3 py-2 text-xs text-ink">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-600" />
          This is a private space, your conversation is not read by anyone else.
          Please keep it here: no phone numbers, money, or meet-ups. Anything that
          breaks these rules is flagged for the Program Coordinators, and you can
          report a concern anytime.
        </p>
      )}

      {isCoordinatorView && isFlagged && (
        <div className="mt-3 rounded-lg border border-coral/40 bg-coral/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-coral">
            <Flag className="h-4 w-4" /> This conversation was flagged
          </p>
          <ul className="mt-2 space-y-1 text-xs text-ink">
            {flags.map((f) => (
              <li key={f.id}>
                <span className="font-semibold">
                  {f.source === "auto" ? "Automatic" : "Reported"}:
                </span>{" "}
                {f.reason}{" "}
                <span className="text-muted">
                  ({new Date(f.created_at).toLocaleDateString()}
                  {f.status === "resolved" ? " · resolved" : ""})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkinDue && (
        <div className="mt-3 rounded-lg border border-teal/30 bg-teal-soft/40 p-3">
          <p className="text-sm font-semibold text-ink">Quick check-in: how is this mentorship going?</p>
          <p className="mt-0.5 text-xs text-body">Your answer is private. Choose “I have a concern” if anything feels off.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { rating: "good", label: "Going well" },
              { rating: "okay", label: "It's okay" },
              { rating: "concern", label: "I have a concern" },
            ].map((o) => (
              <form key={o.rating} action={submitCheckin}>
                <input type="hidden" name="mentorship_id" value={id} />
                <input type="hidden" name="rating" value={o.rating} />
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    o.rating === "concern"
                      ? "border-danger/40 text-danger hover:bg-red-50"
                      : "border-line text-body hover:bg-white"
                  }`}
                >
                  {o.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {checkin && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-success">
          Thanks for the check-in.
        </p>
      )}
      {slow && (
        <p className="mt-3 rounded-lg bg-gold-soft/60 p-3 text-sm text-ink">
          You&apos;re sending messages very quickly. Please give it a moment and try again.
        </p>
      )}

      {reported && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-success">
          Thank you. Your report has been sent to the Program Coordinators.
        </p>
      )}
      {call && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-success">
          Your call request has been sent to the Program Coordinators. They will be
          in touch if it goes ahead.
        </p>
      )}
      {ended && (
        <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-body">
          This mentorship has ended.
        </p>
      )}

      {isCoordinatorView && !isFlagged ? (
        <div className="card mt-4 flex flex-col items-center gap-2 p-10 text-center">
          <Lock className="h-6 w-6 text-muted" />
          <p className="text-sm font-semibold text-ink">This conversation is private</p>
          <p className="max-w-sm text-sm text-body">
            Nothing has been flagged or reported here, so its messages are not shown.
            You will be able to review it only if the portal flags a rule breach or
            someone files a report.
          </p>
        </div>
      ) : (
        <>
          {isParticipant && !isEnded && <MentorshipGuide open={messages.length === 0} />}

          {/* Thread */}
          <div className="card mt-4 space-y-3 p-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No messages yet. Say hello and introduce yourself.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === me.id;
                const fromOffice = !names.has(m.sender_id);
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-navy text-white"
                          : fromOffice
                            ? "bg-gold-soft text-ink"
                            : "bg-canvas text-ink"
                      }`}
                    >
                      {fromOffice && <p className="mb-0.5 text-[11px] font-bold text-gold-600">TELPSAM Program Coordinators</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-muted"}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send */}
          {canPost && (
            <form action={sendMessage} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="mentorship_id" value={id} />
              <textarea
                name="body"
                rows={2}
                required
                className="field flex-1"
                placeholder={isCoordinatorView ? "Write as the Program Coordinators…" : "Write a message…"}
              />
              <button className="btn btn-primary !px-4" title="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
          {canPost && (
            <p className="mt-1.5 text-[11px] text-muted">
              Please keep messages at a natural pace, very rapid bursts are limited to keep the space healthy.
            </p>
          )}
        </>
      )}

      {/* Participant tools */}
      {isParticipant && !isEnded && (
        <div className="mt-5 space-y-3 border-t border-line pt-5">
          <div className="flex flex-wrap gap-3">
            {/* Request a phone call */}
            <details className="text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-body hover:text-navy">
                <Phone className="h-4 w-4" /> Request a phone call
              </summary>
              <form action={requestCall} className="card mt-3 max-w-md space-y-3 p-4">
                <input type="hidden" name="mentorship_id" value={id} />
                <p className="text-sm text-body">
                  Ask the Program Coordinators to arrange a phone call. Your request
                  is private, the other person is not told. A coordinator will check
                  it is appropriate before any number is shared.
                </p>
                <button className="btn btn-outline !py-1.5 !text-sm">Send call request</button>
              </form>
            </details>

            {/* Report a concern */}
            <details className="text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-muted hover:text-danger">
                <Flag className="h-4 w-4" /> Report a concern
              </summary>
              <form action={reportConcern} className="card mt-3 max-w-md space-y-3 p-4">
                <input type="hidden" name="mentorship_id" value={id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">What&apos;s the concern?</label>
                  <select name="reason" className="field">
                    <option>Asked for money or a favour</option>
                    <option>Asked for contact details / to meet outside</option>
                    <option>Inappropriate or uncomfortable messages</option>
                    <option>Other</option>
                  </select>
                </div>
                <textarea name="details" rows={3} className="field" placeholder="Anything you'd like the Program Coordinators to know (optional)" />
                <button className="btn btn-outline !text-danger">Send report to the Program Coordinators</button>
              </form>
            </details>

            {/* End mentorship */}
            <details className="text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-muted hover:text-danger">
                <LogOut className="h-4 w-4" /> End this mentorship
              </summary>
              <form action={endMentorship} className="card mt-3 max-w-md space-y-3 p-4">
                <input type="hidden" name="mentorship_id" value={id} />
                <p className="text-sm text-body">
                  You can end this mentorship at any time, for any reason. The other
                  person will not be told. The Program Coordinators are notified so
                  they can follow up if needed. This closes the conversation.
                </p>
                <button className="btn btn-outline !text-danger">End mentorship</button>
              </form>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
