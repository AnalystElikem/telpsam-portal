"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  redirect("/requests?sent=1");
}
