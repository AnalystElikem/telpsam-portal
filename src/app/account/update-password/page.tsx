import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Set a new password" };
export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Must be in a session — either a recovery session (from the reset email) or a
  // normal signed-in user changing their password.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Please sign in, or use a fresh reset link, to change your password."));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="font-serif text-lg font-bold text-ink">TELPSAM Portal</span>
        </Link>

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
          <p className="mt-1 text-sm text-body">Choose a new password for your account.</p>

          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}

          <form action={updatePassword} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">New password</label>
              <input name="password" type="password" required minLength={8} className="field" placeholder="At least 8 characters" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Confirm new password</label>
              <input name="confirm" type="password" required minLength={8} className="field" placeholder="Re-enter the password" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Update password</button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-body">
          <Link href="/dashboard" className="font-semibold text-navy underline">Back to the portal</Link>
        </p>
      </div>
    </div>
  );
}
