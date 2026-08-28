"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/email";

const LEVELS = ["SHS 3", "Completed SHS", "Tertiary"];

export async function saveStudentProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const school = String(formData.get("school") || "").trim();
  const education_level = String(formData.get("education_level") || "").trim();
  const class_level = String(formData.get("class_level") || "").trim();
  const church_branch = String(formData.get("church_branch") || "").trim();
  const parent_name = String(formData.get("parent_name") || "").trim();
  const parent_contact = String(formData.get("parent_contact") || "").trim();
  const returnTo = String(formData.get("return_to") || "/welcome");

  // Every field is required. Defence-in-depth behind the client-side validation.
  const level = LEVELS.includes(education_level) ? education_level : "";
  const phoneOk = /^\+\d{7,15}$/.test(phone);
  const parentOk = /^\+\d{7,15}$/.test(parent_contact);
  const complete =
    full_name && (gender === "Male" || gender === "Female") && school && level &&
    class_level && church_branch && parent_name && phoneOk && parentOk;
  if (!complete) {
    redirect(`${returnTo}?error=${encodeURIComponent("Please complete every field with valid details.")}`);
  }

  await supabase.from("profiles").update({ full_name }).eq("id", user.id);

  await supabase.from("student_profiles").upsert({
    id: user.id,
    gender,
    phone,
    parent_name,
    parent_contact,
    church_branch,
    school,
    education_level: level,
    class_level,
    updated_at: new Date().toISOString(),
  });

  // Approved students edit in place; everyone else goes to the waiting screen.
  const { data } = await supabase
    .from("student_profiles")
    .select("is_approved")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/profile");
  if (data?.is_approved) redirect("/profile?saved=1");

  await notifyAdmins(
    "TELPSAM alert: a student is awaiting approval",
    `${full_name || "A student"} submitted their profile and is waiting to be approved. Review them on the Students page.`
  );
  redirect("/pending");
}

// A tertiary student who has completed can transition to an alumnus. Carries
// their gender, church branch and phone across, then sends them to complete the
// fuller alumni profile (which a coordinator still reviews before publishing).
export async function transitionToAlumnus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("gender, phone, church_branch")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("profiles").update({ role: "alumnus" }).eq("id", user.id);

  await supabase.from("alumni_profiles").upsert({
    id: user.id,
    gender: sp?.gender ?? null,
    church_branch: sp?.church_branch ?? null,
    is_approved: false,
    is_published: false,
    updated_at: new Date().toISOString(),
  });

  if (sp?.phone) {
    await supabase.from("alumni_contact").upsert({
      id: user.id,
      phone: sp.phone,
      updated_at: new Date().toISOString(),
    });
  }

  redirect("/profile?transitioned=1");
}

// "Not yet" — snooze the transition prompt for 30 days.
export async function snoozeTransition() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const until = new Date();
  until.setDate(until.getDate() + 30);
  await supabase
    .from("student_profiles")
    .update({ transition_snoozed_until: until.toISOString() })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/directory");
}
