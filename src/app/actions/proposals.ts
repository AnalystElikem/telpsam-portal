"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins, notifyUserById } from "@/lib/email";

// A proposed mentor accepts or declines an invitation to mentor someone.
export async function respondToProposal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("proposal_id") || "");
  const decision = String(formData.get("decision") || "");
  if (!id) redirect("/mentorships");

  // Read the proposal first (RLS lets the proposed mentor see their own).
  const { data: proposal } = await supabase
    .from("mentorship_proposals")
    .select("mentee_id")
    .eq("id", id)
    .maybeSingle();

  if (decision === "accept") {
    const { error } = await supabase.rpc("accept_proposal", { p_id: id });
    if (error) {
      redirect(`/mentorships?error=${encodeURIComponent(error.message)}`);
    }
    // Let the mentee know they've been matched.
    if (proposal?.mentee_id) {
      await notifyUserById(
        proposal.mentee_id,
        "You've been matched with a TELPSAM mentor",
        "Wonderful news. A mentor has accepted to walk with you. Open the portal and say hello — a short, friendly introduction is a lovely way to begin.",
        { text: "Open the conversation", path: "/mentorships" }
      );
    }
    revalidatePath("/mentorships");
    redirect("/mentorships?accepted=1");
  }

  // Decline: hand the request back to the coordinators.
  const { error } = await supabase.rpc("decline_proposal", { p_id: id });
  if (error) {
    redirect(`/mentorships?error=${encodeURIComponent(error.message)}`);
  }
  await notifyAdmins(
    "A mentor declined a mentorship invitation",
    "A proposed mentor has declined. The request is back in the queue — please propose another mentor when you can.",
    { text: "Open requests", path: "/admin/requests" }
  );
  revalidatePath("/mentorships");
  redirect("/mentorships?declined=1");
}
