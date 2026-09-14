"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyUserById } from "@/lib/email";
import { MAX_MENTEES } from "@/lib/constants";

// All admin actions rely on the "admin ... all" row-level security policies —
// they only succeed when the signed-in user's profile role is 'admin'.

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/dashboard");
  return { supabase, adminId: user.id };
}

// When someone loses their approval, stop any mentorship they're actively in.
async function endActiveMentorshipsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personId: string,
  adminId: string
) {
  await supabase
    .from("mentorships")
    .update({ status: "ended", ended_at: new Date().toISOString(), ended_by: adminId })
    .or(`mentor_id.eq.${personId},mentee_id.eq.${personId}`)
    .eq("status", "active");
}

export async function approveAlumnus(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");
  const approve = String(formData.get("approve") || "true") === "true";
  await supabase.from("alumni_profiles").update({ is_approved: approve }).eq("id", id);
  await logAudit(supabase, adminId, approve ? "approve_alumnus" : "revoke_alumnus", {
    targetType: "alumnus",
    targetId: id,
  });
  if (approve) {
    await notifyUserById(
      id,
      "Your TELPSAM alumni profile is approved",
      "Welcome aboard, and thank you for stepping forward to give back. Your alumni profile has been approved by the coordinators. You can now publish it and begin mentoring students who are walking the path you have already travelled. Your experience and encouragement will mean a great deal to them.",
      { text: "Set up your profile", path: "/profile" }
    );
  } else {
    await endActiveMentorshipsFor(supabase, id, adminId);
  }
  revalidatePath("/admin/alumni");
  revalidatePath("/admin/mentorships");
}

export async function approveStudent(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");
  const approve = String(formData.get("approve") || "true") === "true";
  const consent = formData.get("guardian_consent") === "on";

  if (approve && !consent) {
    redirect(`/admin/students?error=${encodeURIComponent("Confirm guardian consent before approving a student.")}`);
  }

  await supabase
    .from("student_profiles")
    .update(
      approve
        ? {
            is_approved: true,
            guardian_consent_confirmed: true,
            guardian_consent_by: adminId,
            guardian_consent_at: new Date().toISOString(),
          }
        : { is_approved: false }
    )
    .eq("id", id);

  await logAudit(supabase, adminId, approve ? "approve_student" : "revoke_student", {
    targetType: "student",
    targetId: id,
    detail: approve ? "guardian consent confirmed" : undefined,
  });
  if (approve) {
    await notifyUserById(
      id,
      "Your TELPSAM account is approved",
      "Good news, and welcome to TELPSAM. A coordinator has reviewed and approved your account. You can now explore the alumni network and request a mentor to walk with you. We are glad to have you with us, and we look forward to seeing you grow.",
      { text: "Explore the network", path: "/dashboard" }
    );
  } else {
    await endActiveMentorshipsFor(supabase, id, adminId);
  }
  revalidatePath("/admin/students");
  revalidatePath("/admin/mentorships");
}

export async function resolveExtension(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");
  const approve = String(formData.get("approve") || "") === "true";

  const { data: req } = await supabase
    .from("extension_requests")
    .select("id, mentorship_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!req || req.status !== "pending") redirect("/admin/alerts");

  const { data: m } = await supabase
    .from("mentorships")
    .select("expires_at, mentor_id, mentee_id")
    .eq("id", req.mentorship_id)
    .maybeSingle();

  if (approve) {
    // Extend by 2 weeks from now (or from the current expiry, whichever is later)
    // and reopen the mentorship.
    const from = m?.expires_at && new Date(m.expires_at).getTime() > Date.now()
      ? new Date(m.expires_at)
      : new Date();
    from.setDate(from.getDate() + 14);
    await supabase
      .from("mentorships")
      .update({ status: "active", expires_at: from.toISOString(), ended_at: null, ended_by: null })
      .eq("id", req.mentorship_id);
  }

  await supabase
    .from("extension_requests")
    .update({ status: approve ? "approved" : "declined", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", id);

  await logAudit(supabase, adminId, approve ? "approve_extension" : "decline_extension", {
    targetType: "mentorship",
    targetId: req.mentorship_id,
  });

  // Let both participants know the decision (content-free).
  if (m) {
    const subject = approve
      ? "Your TELPSAM mentorship was extended"
      : "Update on your TELPSAM mentorship extension";
    const body = approve
      ? "Good news. Your mentorship has been extended by two weeks, so there is more time to keep the conversation going. Please make the most of it."
      : "Thank you for taking part in this mentorship. Your extension request was not approved this time, but we warmly encourage the relationship to continue through your branch or chapter.";
    const cta = { text: "Open your mentorship", path: "/mentorships" };
    await Promise.all([
      notifyUserById(m.mentee_id, subject, body, cta),
      notifyUserById(m.mentor_id, subject, body, cta),
    ]);
  }

  revalidatePath("/admin/alerts");
  redirect("/admin/alerts");
}

export async function markCallHandled(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");
  await supabase.from("call_requests").update({ status: "handled" }).eq("id", id);
  await logAudit(supabase, adminId, "mark_call_handled", { targetType: "call_request", targetId: id });
  revalidatePath("/admin/alerts");
}

// The coordinator PROPOSES a mentor for a request. The mentorship is not created
// yet — the mentor is asked to accept first (see accept_proposal / decline_proposal
// and respondToProposal). This gives the mentor a say before being assigned.
export async function assignMentorship(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const mentor_id = String(formData.get("mentor_id") || "");
  const mentee_id = String(formData.get("mentee_id") || "");
  const request_id = String(formData.get("request_id") || "") || null;

  if (!mentor_id || !mentee_id) redirect("/admin/requests?error=1");
  if (mentor_id === mentee_id) {
    redirect(`/admin/requests?error=${encodeURIComponent("A person can't be paired with themselves.")}`);
  }

  // Capacity counts active mentorships AND already-pending invitations.
  const [{ count: activeCount }, { count: pendingCount }] = await Promise.all([
    supabase.from("mentorships").select("*", { count: "exact", head: true }).eq("mentor_id", mentor_id).eq("status", "active"),
    supabase.from("mentorship_proposals").select("*", { count: "exact", head: true }).eq("mentor_id", mentor_id).eq("status", "pending"),
  ]);
  if (((activeCount ?? 0) + (pendingCount ?? 0)) >= MAX_MENTEES) {
    redirect(`/admin/requests?error=${encodeURIComponent(`That mentor is at capacity (${MAX_MENTEES}), counting pending invitations.`)}`);
  }

  // Don't propose the same pair twice while one is still pending.
  const { count: dup } = await supabase
    .from("mentorship_proposals")
    .select("*", { count: "exact", head: true })
    .eq("mentor_id", mentor_id)
    .eq("mentee_id", mentee_id)
    .eq("status", "pending");
  if ((dup ?? 0) > 0) {
    redirect(`/admin/requests?error=${encodeURIComponent("That mentor already has a pending invitation for this person.")}`);
  }

  await supabase.from("mentorship_proposals").insert({ request_id, mentee_id, mentor_id, created_by: adminId });

  if (request_id) {
    await supabase.from("mentorship_requests").update({ status: "proposed" }).eq("id", request_id);
  }

  await logAudit(supabase, adminId, "propose_mentor", {
    targetType: "proposal",
    detail: `mentor ${mentor_id} ↔ mentee ${mentee_id}`,
  });

  // Ask the mentor for consent (no private content).
  await notifyUserById(
    mentor_id,
    "You've been asked to mentor someone in TELPSAM",
    "The coordinators would like to pair you with a new mentee. Please open the portal to see who it is, then accept or decline. There's no pressure — only accept if you have the capacity to walk with them well.",
    { text: "Review the invitation", path: "/mentorships" }
  );

  revalidatePath("/admin/requests");
  redirect("/admin/requests?proposed=1");
}

export async function updateRequestStatus(formData: FormData) {
  const { supabase } = await assertAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!["new", "assigned", "declined", "closed"].includes(status)) return;
  await supabase.from("mentorship_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/requests");
}

export async function resolveReport(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");

  // A conversation can accumulate several auto-flags (one per offending message).
  // Resolving one clears them all for that conversation, so a coordinator only
  // has to act once instead of dismissing each flagged message separately.
  const { data: r } = await supabase
    .from("reports")
    .select("mentorship_id, source")
    .eq("id", id)
    .maybeSingle();

  if (r?.mentorship_id && r.source === "auto") {
    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("mentorship_id", r.mentorship_id)
      .eq("source", "auto")
      .eq("status", "open");
  } else {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
  }

  await logAudit(supabase, adminId, "resolve_report", { targetType: "report", targetId: id });
  revalidatePath("/admin/reports");
  revalidatePath("/admin/alerts");
}
