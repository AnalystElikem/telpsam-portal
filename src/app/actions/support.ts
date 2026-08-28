"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/email";

// A member writes to the coordinators. Any coordinator can reply; the member is
// never told which one.
export async function sendSupportMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") || "").trim().slice(0, 5000);
  if (!body) return;

  // Debounce email: only alert if the member hasn't written in the last 30 min.
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { count: recent } = await supabase
    .from("support_messages")
    .select("*", { count: "exact", head: true })
    .eq("member_id", user.id)
    .eq("from_coordinator", false)
    .gte("created_at", since);

  await supabase.from("support_messages").insert({
    member_id: user.id,
    sender_id: user.id,
    from_coordinator: false,
    body,
  });

  if ((recent ?? 0) === 0) {
    await notifyAdmins(
      "TELPSAM alert: a member messaged the coordinators",
      "A member sent a message to the coordinators. Please reply from the Support inbox."
    );
  }

  revalidatePath("/support");
  redirect("/support");
}

// A coordinator replies to a member's thread (shown to the member anonymously).
export async function replyToSupport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const member_id = String(formData.get("member_id") || "");
  const body = String(formData.get("body") || "").trim().slice(0, 5000);
  if (!member_id || !body) return;

  await supabase.from("support_messages").insert({
    member_id,
    sender_id: user.id,
    from_coordinator: true,
    body,
  });

  revalidatePath(`/admin/support/${member_id}`);
  redirect(`/admin/support/${member_id}`);
}
