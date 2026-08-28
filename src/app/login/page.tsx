import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; check?: string }>;
}) {
  const { error, check } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-body">Sign in to your portal.</p>

          {check && (
            <p className="mt-4 rounded-lg bg-gold-soft/60 p-3 text-sm text-ink">
              Almost there. Check your email to confirm your account, then sign in.
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>
          )}

          <form action={signIn} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input name="email" type="email" required className="field" placeholder="you@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Password</label>
              <input name="password" type="password" required className="field" placeholder="Your password" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Sign in</button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-body">
          New here?{" "}
          <Link href="/join" className="font-semibold text-navy underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
