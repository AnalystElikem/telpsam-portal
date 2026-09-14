import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Landing point for links in Supabase auth emails (password reset, and — if you
// re-enable it — signup confirmation and magic links). It verifies the one-time
// token, which establishes a session, then forwards to `next`.
//
// IMPORTANT: this needs the Supabase email templates to use the token-hash form:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/account/update-password
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, "");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${base}${next.startsWith("/") ? next : `/${next}`}`);
    }
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent("That link is invalid or has expired. Please request a new one.")}`
  );
}
