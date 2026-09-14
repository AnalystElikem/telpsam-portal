import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
          {sent ? (
            <div className="mt-3 rounded-lg bg-gold-soft/60 p-4 text-sm text-ink">
              If an account exists for that email, we&apos;ve sent a link to reset your password. Check your
              inbox (and your spam folder), then follow the link to set a new one.
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-body">
                Enter the email you signed up with and we&apos;ll send you a link to set a new password.
              </p>
              <form action={requestPasswordReset} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Email</label>
                  <input name="email" type="email" required className="field" placeholder="you@email.com" autoFocus />
                </div>
                <button type="submit" className="btn btn-primary w-full">Send reset link</button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-body">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-navy underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
