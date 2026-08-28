"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveAlumniProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const campus = String(formData.get("campus") || "").trim();
  const avatar_url = String(formData.get("avatar_url") || "").trim() || null;
  const returnTo = String(formData.get("return_to") || "/profile");

  const gradYearRaw = String(formData.get("grad_year") || "").trim();
  const grad_year = gradYearRaw ? Number(gradYearRaw) : null;
  const qualifications = String(formData.get("qualifications") || "").trim();
  const job_title = String(formData.get("job_title") || "").trim();
  const organization = String(formData.get("organization") || "").trim();
  const industry = String(formData.get("industry") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const church_branch = String(formData.get("church_branch") || "").trim();
  const interests = String(formData.get("interests") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const is_published = formData.get("is_published") === "on";

  // Every field is required except interests (defence behind client validation).
  const yearOk =
    grad_year !== null && grad_year >= 1970 && grad_year <= new Date().getFullYear();
  const phoneOk = /^\+\d{7,15}$/.test(phone);
  const bioWords = bio.split(/\s+/).filter(Boolean).length;
  const bioOk = bioWords >= 30 && bioWords <= 150;
  const complete =
    full_name && title && (gender === "Male" || gender === "Female") && campus &&
    yearOk && qualifications && job_title && organization && industry && bioOk &&
    church_branch && phoneOk;
  if (!complete) {
    const msg = !bioOk
      ? "Your short bio should be between 30 and 150 words."
      : "Please complete every field with valid details.";
    redirect(`${returnTo}?error=${encodeURIComponent(msg)}`);
  }

  // Update the base profile (name, campus, photo).
  await supabase
    .from("profiles")
    .update({ full_name, campus, avatar_url })
    .eq("id", user.id);

  // Upsert the alumni-specific details.
  await supabase.from("alumni_profiles").upsert({
    id: user.id,
    title,
    gender,
    grad_year,
    qualifications,
    job_title,
    organization,
    industry,
    interests,
    bio,
    church_branch,
    is_published,
    updated_at: new Date().toISOString(),
  });

  // Phone lives in a separate coordinator-only table (never directory-readable).
  await supabase.from("alumni_contact").upsert({
    id: user.id,
    phone,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
