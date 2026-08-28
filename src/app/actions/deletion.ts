"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") redirect("/dashboard");
  return { supabase, adminId: user.id };
}

const back = (msg: string) => `/admin/deletions?error=${encodeURIComponent(msg)}`;

// Coordinator A requests that a member's data be deleted.
export async function requestDeletion(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const subject_id = String(formData.get("subject_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!subject_id) redirect(back("Choose a member to delete."));
  if (subject_id === adminId) redirect(back("You cannot request deletion of your own account here."));

  const { data: subject } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", subject_id)
    .maybeSingle();

  await supabase.from("deletion_requests").insert({
    subject_id,
    subject_name: subject?.full_name ?? null,
    subject_email: subject?.email ?? null,
    reason: reason || null,
    requested_by: adminId,
  });

  await logAudit(supabase, adminId, "request_deletion", {
    targetType: "member",
    targetId: subject_id,
    detail: subject?.full_name ?? undefined,
  });

  revalidatePath("/admin/deletions");
  redirect("/admin/deletions?requested=1");
}

// Coordinator B (must be different) approves — this actually erases the member.
export async function approveDeletion(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");

  const { data: req } = await supabase
    .from("deletion_requests")
    .select("id, subject_id, requested_by, status")
    .eq("id", id)
    .maybeSingle();
  if (!req || req.status !== "pending") redirect(back("That request is no longer pending."));
  if (req.requested_by === adminId) {
    redirect(back("A different coordinator must approve a deletion. Ask a colleague to confirm."));
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(back("Deletion needs the service-role key configured on the server."));
  }

  // Erase the auth user; profiles + all child rows cascade from there.
  if (req.subject_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(req.subject_id);
  }

  await supabase
    .from("deletion_requests")
    .update({ status: "completed", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", id);

  await logAudit(supabase, adminId, "approve_deletion", {
    targetType: "member",
    targetId: req.subject_id,
  });

  revalidatePath("/admin/deletions");
  redirect("/admin/deletions?done=1");
}

export async function rejectDeletion(formData: FormData) {
  const { supabase, adminId } = await assertAdmin();
  const id = String(formData.get("id") || "");
  await supabase
    .from("deletion_requests")
    .update({ status: "rejected", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  await logAudit(supabase, adminId, "reject_deletion", { targetType: "deletion_request", targetId: id });
  revalidatePath("/admin/deletions");
  redirect("/admin/deletions?rejected=1");
}
