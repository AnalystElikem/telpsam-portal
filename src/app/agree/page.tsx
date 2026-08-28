import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { agreeToRules } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Rules of Engagement" };

const points = [
  "All conversations stay inside the portal. Don't share phone numbers, emails, or social handles directly. If a phone call would help, you can request one and a coordinator will arrange it safely.",
  "Mentorship pairings are assigned and overseen by the TELPSAM Program Coordinators.",
  "No requests for money, gifts, or favours, from anyone, ever.",
  "No private meet-ups arranged through the portal.",
  "Your conversations are private. Coordinators don't read them, but anything that breaks these rules is flagged automatically.",
  "Treat one another with respect; report anything that feels wrong.",
];

export default async function AgreePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.agreed_rules) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="card p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">Before you continue</h1>
          <p className="mt-2 text-body">
            The TELPSAM portal is a safe, guided space. Please agree to these rules
            to take part. You can read the{" "}
            <Link href="/rules" className="text-gold-600 underline" target="_blank">
              full Rules of Engagement
            </Link>{" "}
            any time.
          </p>

          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-body">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <form action={agreeToRules} className="mt-7">
            <label className="mb-4 flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" required className="mt-0.5" />
              <span>
                I have read and agree to the Rules of Engagement, and I will keep
                all interactions within the portal.
              </span>
            </label>
            <button type="submit" className="btn btn-primary w-full">
              I agree, enter the portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
