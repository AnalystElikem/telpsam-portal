"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessMessage } from "@/lib/safeguard";
import { classifyMessage } from "@/lib/moderation";
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

  // No new messages once a mentorship has ended or its 3-month period is up.
  const { data: m } = await supabase
    .from("mentorships")
    .select("status, mentor_id, mentee_id, expires_at")
    .eq("id", mentorship_id)
    .maybeSingle();
  const expired = m?.expires_at ? new Date(m.expires_at).getTime() < Date.now() : false;
  if (!m || m.status === "ended" || expired) return;

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

  // FAST PATH: insert the message and refresh, then return immediately. Nothing
  // slow (AI classify, email) is awaited here, so the send feels instant.
  const { data: inserted } = await supabase
    .from("messages")
    .insert({ mentorship_id, sender_id: user.id, body })
    .select("id")
    .single();

  revalidatePath(`/mentorships/${mentorship_id}`);

  // DEFERRED: safeguarding scan, flag recording, and notifications run AFTER the
  // response is sent (Next's `after`), so they never delay the user's message.
  // Uses the service-role client because the request/cookie context is gone by
  // the time this runs.
  const recipientId = m.mentor_id === user.id ? m.mentee_id : m.mentor_id;
  const messageId = inserted?.id ?? null;
  after(async () => {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
      const admin = createAdminClient();

      // Debounce new-message emails: one email per 30-min burst per sender.
      const since = new Date(Date.now() - 30 * 60_000).toISOString();
      const { count: recentBySender } = await admin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("mentorship_id", mentorship_id)
        .eq("sender_id", user.id)
        .gte("created_at", since);
      // The just-inserted message is included, so "first in 30 min" == count 1.
      if ((recentBySender ?? 1) <= 1) {
        await notifyUserById(
          recipientId,
          "New message in your TELPSAM mentorship",
          "You have a new message in your mentorship conversation. Sign in to read and reply."
        );
      }

      // Two-layer safeguarding: fast regex, then AI for the uncertain cases.
      const regex = assessMessage(body);
      let assessment = regex;
      if (regex.severity !== "high") {
        const ai = await classifyMessage(body);
        if (ai) assessment = ai;
      }
      if (!assessment.flag) return;

      // Record every offending message so coordinators see the whole pattern.
      const { count: openHigh } = await admin
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("mentorship_id", mentorship_id)
        .eq("source", "auto")
        .eq("status", "open")
        .eq("severity", "high");

      await admin.from("reports").insert({
        reporter_id: user.id,
        mentorship_id,
        message_id: messageId,
        source: "auto",
        severity: assessment.severity,
        reason: assessment.reason || `Automatic flag: ${assessment.categories.join(", ")}`,
        details: body.slice(0, 1000),
      });
      revalidatePath("/admin/alerts");

      // Email only for HIGH flags, once per open conversation.
      if (assessment.severity === "high" && (openHigh ?? 0) === 0) {
        await notifyAdmins(
          "TELPSAM alert: a conversation was auto-flagged",
          `The portal flagged a message for possible: ${assessment.categories.join(", ")}. Please review it on the alerts page.`
        );
      }
    } catch {
      // Best effort — never surface deferred failures to the user.
    }
  });
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

// A participant asks to extend a time-bound mentorship. A coordinator decides.
export async function requestExtension(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentorship_id = String(formData.get("mentorship_id") || "");
  if (!mentorship_id) return;

  // A mentorship may be extended only once — block if any request already exists
  // (pending, approved, or declined).
  const { data: existing } = await supabase
    .from("extension_requests")
    .select("id")
    .eq("mentorship_id", mentorship_id)
    .limit(1)
    .maybeSingle();
  if (!existing) {
    await supabase
      .from("extension_requests")
      .insert({ mentorship_id, requester_id: user.id });
    await notifyAdmins(
      "TELPSAM alert: a mentorship extension request",
      "A member asked to extend their mentorship beyond its 3-month period. Please review it on the alerts page."
    );
  }

  redirect(`/mentorships/${mentorship_id}?extension=1`);
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
