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
      "Welcome aboard. Your alumni profile has been approved. Sign in to publish it and start mentoring students."
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
      "Good news — a Program Coordinator has approved your account. Sign in to explore the alumni network and request mentorship."
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
      ? "Your mentorship has been extended by 2 weeks. Sign in to continue the conversation."
      : "Your extension request wasn't approved this time. Thank you for taking part, we encourage the relationship to continue through your branch or chapter.";
    await Promise.all([
      notifyUserById(m.mentee_id, subject, body),
      notifyUserById(m.mentor_id, subject, body),
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

export async function assignMentorship(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const mentor_id = String(formData.get("mentor_id") || "");
  const mentee_id = String(formData.get("mentee_id") || "");
  const request_id = String(formData.get("request_id") || "") || null;

  if (!mentor_id || !mentee_id) redirect("/admin/requests?error=1");

  // Capacity: a mentor may hold at most MAX_MENTEES active mentorships.
  const { count } = await supabase
    .from("mentorships")
    .select("*", { count: "exact", head: true })
    .eq("mentor_id", mentor_id)
    .eq("status", "active");
  if ((count ?? 0) >= MAX_MENTEES) {
    redirect(`/admin/requests?error=${encodeURIComponent(`That mentor already has ${MAX_MENTEES} active mentees.`)}`);
  }

  // Mentorships are time-bound: they run for 3 months, then end automatically.
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 3);

  const { data: created } = await supabase
    .from("mentorships")
    .insert({ mentor_id, mentee_id, request_id, created_by: adminId, expires_at: expires.toISOString() })
    .select("id")
    .single();

  if (request_id) {
    await supabase.from("mentorship_requests").update({ status: "assigned" }).eq("id", request_id);
  }

  await logAudit(supabase, adminId, "assign_mentorship", {
    targetType: "mentorship",
    targetId: created?.id ?? null,
    detail: `mentor ${mentor_id} ↔ mentee ${mentee_id}`,
  });

  // Tell both people they've been matched (no private content).
  await Promise.all([
    notifyUserById(mentee_id, "You've been matched with a TELPSAM mentor", "Good news — the Program Coordinators have matched you with a mentor. Sign in to start the conversation."),
    notifyUserById(mentor_id, "You've been matched with a TELPSAM mentee", "The Program Coordinators have matched you with a mentee. Sign in to say hello and get started."),
  ]);

  revalidatePath("/admin/requests");
  redirect("/admin/requests?assigned=1");
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
  await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
  await logAudit(supabase, adminId, "resolve_report", { targetType: "report", targetId: id });
  revalidatePath("/admin/reports");
}
