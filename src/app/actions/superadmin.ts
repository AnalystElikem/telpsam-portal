"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// Only the super admin may promote or demote coordinators.
async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();
  if (!data?.is_superadmin) redirect("/dashboard");
  return { supabase, actorId: user.id };
}

const back = (msg: string) => `/admin/coordinators?error=${encodeURIComponent(msg)}`;

export async function promoteToCoordinator(formData: FormData) {
  const { supabase, actorId } = await assertSuperAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect(back("Choose a member to promote."));

  await supabase.from("profiles").update({ role: "admin" }).eq("id", id);
  await logAudit(supabase, actorId, "promote_coordinator", { targetType: "member", targetId: id });

  revalidatePath("/admin/coordinators");
  redirect("/admin/coordinators?promoted=1");
}

export async function demoteCoordinator(formData: FormData) {
  const { supabase, actorId } = await assertSuperAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect(back("Choose a coordinator to remove."));
  if (id === actorId) redirect(back("You cannot demote yourself."));

  // Never demote another super admin.
  const { data: target } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", id)
    .maybeSingle();
  if (target?.is_superadmin) redirect(back("You cannot demote another super admin."));

  await supabase.from("profiles").update({ role: "alumnus" }).eq("id", id);
  await logAudit(supabase, actorId, "demote_coordinator", { targetType: "member", targetId: id });

  revalidatePath("/admin/coordinators");
  redirect("/admin/coordinators?demoted=1");
}
