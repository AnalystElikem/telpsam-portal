import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Awaiting approval" };

export default async function PendingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.agreed_rules) redirect("/agree");
  if (profile.role !== "student") redirect("/dashboard");

  const supabase = await createClient();
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("is_approved")
    .eq("id", profile.id)
    .maybeSingle();
  if (!sp) redirect("/welcome");
  if (sp.is_approved) redirect("/directory");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold-600">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-ink">You&apos;re on the list</h1>
          <p className="mt-2 text-body">
            Thanks, {profile.full_name?.split(" ")[0] || "friend"}. Your profile has
            been submitted. A Program Coordinator will review and approve your
            account shortly. You&apos;ll be able to sign in and explore the network
            once you&apos;re approved.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link href="/welcome" className="btn btn-outline w-full">
              Edit my details
            </Link>
            <form action={signOut}>
              <button className="w-full py-2 text-sm font-medium text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>

        <p className="mt-5 text-xs text-muted">
          Questions? Speak with your TELPSAM Program Coordinators.
        </p>
      </div>
    </div>
  );
}
