import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StudentProfileForm, { type StudentInitial } from "@/components/StudentProfileForm";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.agreed_rules) redirect("/agree");
  if (profile.role !== "student") redirect("/dashboard");

  const supabase = await createClient();
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("id", profile.id)
    .maybeSingle();
  if (sp?.is_approved) redirect("/directory");

  const initial: StudentInitial = {
    full_name: profile.full_name || "",
    gender: sp?.gender || "",
    phone: sp?.phone || "",
    school: sp?.school || "",
    education_level: sp?.education_level || "",
    class_level: sp?.class_level || "",
    church_branch: sp?.church_branch || "",
    parent_name: sp?.parent_name || "",
    parent_contact: sp?.parent_contact || "",
    avatar_url: profile.avatar_url || "",
  };

  return (
    <div className="min-h-screen bg-canvas px-5 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink">Complete your student profile</h1>
          <p className="mt-2 text-body">
            A few details so the Program Coordinators can get to know you. Once you
            submit, a coordinator will review and approve your account before you
            can explore the alumni network.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
          )}

          <div className="mt-6">
            <StudentProfileForm initial={initial} returnTo="/welcome" />
          </div>
        </div>
      </div>
    </div>
  );
}
