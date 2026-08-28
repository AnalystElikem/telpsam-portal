"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanMessage } from "@/lib/safeguard";
import { notifyAdmins, notifyUserById } from "@/lib/email";
import { MESSAGES_PER_MINUTE } from "@/lib/constants";

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "");
  const body = String(formData.get("body") || "").trim().slice(0, 5000);
  if (!mentorship_id || !body) return;

  // No new messages once a mentorship has ended.
  const { data: m } = await supabase
    .from("mentorships")
    .select("status, mentor_id, mentee_id")
    .eq("id", mentorship_id)
    .maybeSingle();
  if (!m || m.status === "ended") return;

  // Generous rate limit: block a burst beyond MESSAGES_PER_MINUTE per minute.
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: lastMinute } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("mentorship_id", mentorship_id)
    .eq("sender_id", user.id)
    .gte("created_at", oneMinAgo);
  if ((lastMinute ?? 0) >= MESSAGES_PER_MINUTE) {
    redirect(`/mentorships/${mentorship_id}?slow=1`);
  }

  // Debounce new-message emails: only notify if this sender hasn't messaged in
  // this thread in the last 30 minutes (so a burst of quick texts = one email).
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { count: recentBySender } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("mentorship_id", mentorship_id)
    .eq("sender_id", user.id)
    .gte("created_at", since);

  const { data: inserted } = await supabase
    .from("messages")
    .insert({ mentorship_id, sender_id: user.id, body })
    .select("id")
    .single();

  // Notify the other participant (content-free), respecting the debounce.
  if ((recentBySender ?? 0) === 0) {
    const recipientId = m.mentor_id === user.id ? m.mentee_id : m.mentor_id;
    await notifyUserById(
      recipientId,
      "New message in your TELPSAM mentorship",
      "You have a new message in your mentorship conversation. Sign in to read and reply."
    );
  }

  // Private by default: coordinators don't read chats. But if this message
  // trips a Rule-of-Engagement red line, raise an automatic flag for review.
  const flags = scanMessage(body);
  if (flags.length > 0) {
    await supabase.from("reports").insert({
      reporter_id: user.id,
      mentorship_id,
      message_id: inserted?.id ?? null,
      source: "auto",
      reason: `Automatic flag: ${flags.join(", ")}`,
      details: body.slice(0, 1000),
    });
    await notifyAdmins(
      "TELPSAM alert: a conversation was auto-flagged",
      `The portal automatically flagged a message for possible: ${flags.join(", ")}. Please review it on the alerts page.`
    );
  }

  revalidatePath(`/mentorships/${mentorship_id}`);
}

export async function reportConcern(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "") || null;
  const reason = String(formData.get("reason") || "Concern").trim();
  const details = String(formData.get("details") || "").trim().slice(0, 3000);

  await supabase.from("reports").insert({
    reporter_id: user.id,
    mentorship_id,
    reason,
    details,
  });

  await notifyAdmins(
    "TELPSAM alert: a concern was reported",
    `A member reported a concern (${reason}). Please review it on the alerts page.`
  );

  redirect(
    mentorship_id ? `/mentorships/${mentorship_id}?reported=1` : "/dashboard"
  );
}

// Either participant may end the mentorship. The other party is NOT notified;
// only coordinators are. Handled by a SECURITY DEFINER function that checks the
// caller is a participant.
export async function endMentorship(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "");
  if (!mentorship_id) return;

  await supabase.rpc("end_mentorship", { m_id: mentorship_id });

  await notifyAdmins(
    "TELPSAM alert: a mentorship has ended",
    "A mentorship was ended by one of its participants. You can review recently ended mentorships on the alerts page."
  );

  revalidatePath(`/mentorships/${mentorship_id}`);
  redirect(`/mentorships/${mentorship_id}?ended=1`);
}

// Periodic check-in. Records how a participant feels; a concern raises a flag
// to the coordinators (and, like all flags, keeps the conversation reviewable).
export async function submitCheckin(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "");
  const rating = String(formData.get("rating") || "");
  if (!mentorship_id || !["good", "okay", "concern"].includes(rating)) return;

  await supabase.from("checkins").insert({
    mentorship_id,
    respondent_id: user.id,
    rating,
  });

  if (rating === "concern") {
    await supabase.from("reports").insert({
      reporter_id: user.id,
      mentorship_id,
      reason: "Check-in: a participant flagged a concern",
    });
    await notifyAdmins(
      "TELPSAM alert: a check-in concern",
      "A member flagged a concern in a mentorship check-in. Please review it on the alerts page."
    );
  }

  revalidatePath(`/mentorships/${mentorship_id}`);
  redirect(`/mentorships/${mentorship_id}?checkin=1`);
}

// A participant asks for a phone call. The other party is NOT told; a
// coordinator reviews it and shares the number manually if appropriate.
export async function requestCall(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "");
  if (!mentorship_id) return;

  await supabase
    .from("call_requests")
    .insert({ mentorship_id, requester_id: user.id });

  await notifyAdmins(
    "TELPSAM alert: a phone-call request",
    "A member requested a phone call. Please review it on the alerts page and facilitate it if appropriate."
  );

  redirect(`/mentorships/${mentorship_id}?call=1`);
}
