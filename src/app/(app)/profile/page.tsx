import type { Metadata } from "next";
import { CheckCircle2, Clock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProfileForm, { type ProfileInitial } from "@/components/ProfileForm";
import StudentProfileForm, { type StudentInitial } from "@/components/StudentProfileForm";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; transitioned?: string }>;
}) {
  const profile = await requireProfile();
  const { saved, error, transitioned } = await searchParams;
  const supabase = await createClient();

  // Students edit their own (private) student profile here.
  if (profile.role === "student") {
    const { data: sp } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", profile.id)
      .maybeSingle();

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
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">My profile</h1>
        <p className="mt-1 text-body">
          Keep your details up to date. Your phone and parent or guardian details
          stay private to the Program Coordinators.
        </p>

        {saved && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Profile saved.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
        )}

        <div className="card mt-6 p-6">
          <StudentProfileForm initial={initial} returnTo="/profile" submitLabel="Save changes" />
        </div>

        <DataRights />
      </div>
    );
  }

  // Alumni (and admins who also hold an alumni profile) edit the directory profile.
  const [{ data: alumni }, { data: contact }] = await Promise.all([
    supabase.from("alumni_profiles").select("*").eq("id", profile.id).maybeSingle(),
    supabase.from("alumni_contact").select("phone").eq("id", profile.id).maybeSingle(),
  ]);

  const initial: ProfileInitial = {
    userId: profile.id,
    title: alumni?.title || "",
    gender: alumni?.gender || "",
    full_name: profile.full_name || "",
    campus: profile.campus || "",
    avatar_url: profile.avatar_url || "",
    grad_year: alumni?.grad_year ? String(alumni.grad_year) : "",
    qualifications: alumni?.qualifications || "",
    job_title: alumni?.job_title || "",
    organization: alumni?.organization || "",
    industry: alumni?.industry || "",
    interests: (alumni?.interests || []).join(", "),
    bio: alumni?.bio || "",
    phone: contact?.phone || "",
    church_branch: alumni?.church_branch || "",
    is_published: alumni?.is_published ?? false,
  };

  const isApproved = alumni?.is_approved ?? false;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">My alumni profile</h1>
      <p className="mt-1 text-body">
        Share your journey so students can learn from you. The Program Coordinators review new
        profiles before they appear.
      </p>

      {transitioned && (
        <p className="mt-4 rounded-lg bg-teal-soft/50 p-3 text-sm text-ink">
          Welcome to the alumni network! Please complete your profile below. A
          Program Coordinator will review it before it appears to students.
        </p>
      )}

      {saved && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Profile saved.
        </p>
      )}

      <div className="mt-4">
        {isApproved ? (
          <span className="chip bg-green-100 text-success">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approved
          </span>
        ) : (
          <span className="chip bg-gold-soft text-gold-600">
            <Clock className="mr-1 h-3.5 w-3.5" /> Awaiting review
          </span>
        )}
      </div>

      <div className="card mt-6 p-6">
        <ProfileForm initial={initial} />
      </div>

      <DataRights />
    </div>
  );
}

function DataRights() {
  return (
    <div className="mt-8 border-t border-line pt-6 text-sm text-body">
      <p className="font-semibold text-ink">Your data</p>
      <p className="mt-1">
        You can{" "}
        <a href="/api/export" className="font-semibold text-navy underline">download a copy of your data</a>{" "}
        at any time. To delete your account and data, contact the Program Coordinators. See our{" "}
        <a href="/privacy" className="text-navy underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
