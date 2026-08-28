import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import TransitionPrompt from "@/components/TransitionPrompt";

// Tertiary students see the "transition to alumni" nudge once their account is
// roughly a year old (and they haven't snoozed it).
const TRANSITION_AFTER_DAYS = 330;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  let showTransition = false;
  let transitionClass: string | null = null;

  // Students must complete a profile and be approved before entering the portal.
  if (profile.role === "student") {
    const supabase = await createClient();
    const { data: sp } = await supabase
      .from("student_profiles")
      .select("is_approved, education_level, class_level, created_at, transition_snoozed_until")
      .eq("id", profile.id)
      .maybeSingle();
    if (!sp) redirect("/welcome");
    if (!sp.is_approved) redirect("/pending");

    if (sp.education_level === "Tertiary") {
      const ageDays = (Date.now() - new Date(sp.created_at).getTime()) / 86_400_000;
      const snoozed =
        sp.transition_snoozed_until &&
        new Date(sp.transition_snoozed_until).getTime() > Date.now();
      if (ageDays >= TRANSITION_AFTER_DAYS && !snoozed) {
        showTransition = true;
        transitionClass = sp.class_level;
      }
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        {showTransition && <TransitionPrompt classLevel={transitionClass} />}
        {children}
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-sm sm:flex-row">
          <p className="flex items-center gap-2 text-muted">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Keep every conversation in the portal. No money, contacts, or meet-ups.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/rules" className="font-semibold text-navy hover:underline">
              Rules of Engagement
            </Link>
            <Link href="/privacy" className="text-muted hover:text-navy">Privacy</Link>
            <Link href="/terms" className="text-muted hover:text-navy">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
