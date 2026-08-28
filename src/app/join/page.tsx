import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { signUp } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const { role: roleParam, error } = await searchParams;
  const role = roleParam === "alumnus" ? "alumnus" : "student";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-body">
            Joining as{" "}
            <span className="font-semibold text-navy">
              {role === "alumnus" ? "an alumnus" : "a student"}
            </span>
            .{" "}
            <Link
              href={`/join?role=${role === "alumnus" ? "student" : "alumnus"}`}
              className="text-gold-600 underline"
            >
              Switch to {role === "alumnus" ? "student" : "alumnus"}
            </Link>
          </p>

          {role === "student" && (
            <p className="mt-4 rounded-lg bg-gold-soft/50 p-3 text-xs text-ink">
              After signing up you&apos;ll complete a short profile. A Program
              Coordinator reviews and approves every student before they join the
              network.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
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
            <button type="submit" className="btn btn-primary w-full">Create account</button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            By joining you agree to the{" "}
            <Link href="/rules" className="text-gold-600 underline">Rules of Engagement</Link>.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-body">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-navy underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
