import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "alumnus" | "admin";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  campus: string | null;
  program: string | null;
  avatar_url: string | null;
  agreed_rules: boolean;
  is_superadmin: boolean;
};

/** The signed-in user's profile, or null if not signed in. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

/** Require a signed-in user who has accepted the rules; else redirect. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.agreed_rules) redirect("/agree");
  return profile;
}

/** Require one of the given roles; else send back to the dashboard. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

/** Require the super admin; else send back to the dashboard. */
export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_superadmin) redirect("/dashboard");
  return profile;
}
