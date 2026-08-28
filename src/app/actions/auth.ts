"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Retired. Coordinators are now appointed by the super admin from
// Admin → Coordinators; there is no public code-based admin self-signup.
// Kept as a disabled stub so any stale reference simply goes to the login page.
export async function signUpAdmin() {
  redirect("/login");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const roleRaw = String(formData.get("role") || "student");
  const role = roleRaw === "alumnus" ? "alumnus" : "student";

  if (!email || password.length < 8 || !full_name) {
    redirect(
      `/join?role=${role}&error=${encodeURIComponent(
        "Please enter your name, a valid email, and a password of at least 8 characters."
      )}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role } },
  });

  if (error) {
    redirect(`/join?role=${role}&error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is on, there's no session yet.
  if (data.session) redirect("/agree");
  redirect("/login?check=1");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function agreeToRules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ agreed_rules: true, agreed_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/dashboard");
}
