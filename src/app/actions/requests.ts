"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/email";

export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const alumnus_id = String(formData.get("alumnus_id") || "") || null;
  const kindRaw = String(formData.get("kind") || "mentorship");
  const kind = kindRaw === "question" ? "question" : "mentorship";
  const message = String(formData.get("message") || "").trim().slice(0, 3000);

  if (!message) {
    redirect(
      alumnus_id
        ? `/directory/${alumnus_id}?error=1`
        : `/requests?error=1`
    );
  }

  await supabase.from("mentorship_requests").insert({
    student_id: user.id,
    alumnus_id,
    kind,
    message,
  });

  if (kind === "question") {
    await notifyAdmins(
      "A new one-time question",
      "A member has asked a one-time question. Please connect them to a suitable alumnus on the Requests page — it opens a short, capacity-free conversation.",
      { text: "Open requests", path: "/admin/requests" }
    );
  } else {
    await notifyAdmins(
      "A new mentorship request",
      "A member has requested a mentorship. Please review it and propose a mentor on the Requests page.",
      { text: "Open requests", path: "/admin/requests" }
    );
  }

  redirect("/requests?sent=1");
}
