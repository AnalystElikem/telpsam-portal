import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, HeartHandshake, Sprout } from "lucide-react";
import { signUp } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Join" };

const promises = [
  { icon: HeartHandshake, text: "Personally introduced to the right person by a coordinator." },
  { icon: ShieldCheck, text: "Private and safeguarded — every conversation stays in the portal." },
  { icon: Sprout, text: "A space built for growth, not exposure." },
];

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const { role: roleParam, error } = await searchParams;
  const role = roleParam === "alumnus" ? "alumnus" : "student";

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative isolate hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Image src="/images/telpsam-event-2.jpg" alt="" fill className="absolute inset-0 object-cover" sizes="50vw" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/85 via-forest/80 to-forest/90" aria-hidden />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-honey/15 blur-2xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-clay/15 blur-2xl" aria-hidden />
        <Link href="/" className="relative flex items-center gap-2.5">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={38} height={38} className="h-9 w-9 object-contain" />
          <span className="font-serif text-lg font-bold text-white">TELPSAM</span>
        </Link>
        <div className="relative">
          <h2 className="max-w-sm font-serif text-3xl font-bold leading-tight text-white">
            Someone has already walked the path ahead of you.
          </h2>
          <p className="mt-4 max-w-sm text-white/80">
            Join the TELPSAM network and let a coordinator help you find them.
          </p>
          <ul className="mt-8 space-y-4">
            {promises.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <p.icon className="h-4 w-4 text-honey" />
                </span>
                <span className="text-sm text-white/85">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">TELPSAM Alumni &amp; Mentorship Portal</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <Image src="/telpsam-logo.png" alt="TELPSAM" width={38} height={38} className="h-9 w-9 object-contain" />
            <span className="font-serif text-lg font-bold text-forest">TELPSAM</span>
          </Link>

          <div className="rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-8">
            <h1 className="font-serif text-2xl font-bold text-forest">Create your account</h1>
            <p className="mt-1 text-sm text-body">
              Joining as{" "}
              <span className="font-semibold text-forest">
                {role === "alumnus" ? "an alumnus" : "a student"}
              </span>
              .{" "}
              <Link
                href={`/join?role=${role === "alumnus" ? "student" : "alumnus"}`}
                className="font-semibold text-clay hover:underline"
              >
                Switch to {role === "alumnus" ? "student" : "alumnus"}
              </Link>
            </p>

            {role === "student" && (
              <p className="mt-4 rounded-2xl bg-honey-soft p-3 text-xs text-ink">
                After signing up you&apos;ll complete a short profile. A Program
                Coordinator reviews and welcomes every student before they join the
                network.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-danger">{error}</p>
            )}

            <form action={signUp} className="mt-6 space-y-4">
              <input type="hidden" name="role" value={role} />
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Full name</label>
                <input name="full_name" required className="field" placeholder="Your full name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Email</label>
                <input name="email" type="email" required className="field" placeholder="you@email.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Password</label>
                <input name="password" type="password" required minLength={8} className="field" placeholder="At least 8 characters" />
              </div>
              <button type="submit" className="btn btn-forest w-full !py-3">Create account</button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              By joining you agree to the{" "}
              <Link href="/rules" className="font-semibold text-clay hover:underline">Rules of Engagement</Link>.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-body">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-forest hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
