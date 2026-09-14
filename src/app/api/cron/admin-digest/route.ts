import { NextResponse } from "next/server";
import { sendAdminDigest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rolls up the queued routine coordinator notifications into a single digest
// email. Scheduled every few hours by Supabase pg_cron (see docs/OPERATIONS.md).
// Protected by CRON_SECRET: the scheduler sends `Authorization: Bearer <secret>`.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const sent = await sendAdminDigest();
  return NextResponse.json({ sent });
}

export async function GET(request: Request) {
  return run(request);
}
export const POST = GET;
