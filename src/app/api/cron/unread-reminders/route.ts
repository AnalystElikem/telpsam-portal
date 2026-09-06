import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/lib/email";

// Twice-daily reminder digest. Finds members who have UNREAD messages in an
// active mentorship (based on the `reads` table) and sends each ONE warm email.
// Invoked by a scheduler (Vercel Cron or Supabase pg_cron) at 7am & 7pm.
// Protected by CRON_SECRET: the scheduler must send `Authorization: Bearer <it>`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const firstName = (full?: string | null) => (full || "").trim().split(/\s+/)[0] || null;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const admin = createAdminClient();

  // Active, non-expired mentorships.
  const { data: ms } = await admin
    .from("mentorships")
    .select("id, mentor_id, mentee_id, status, expires_at")
    .eq("status", "active");
  const now = Date.now();
  const active = (ms ?? []).filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now);
  const ids = active.map((m) => m.id);
  if (ids.length === 0) return NextResponse.json({ sent: 0 });

  // Recent messages for these mentorships (90-day window keeps this light).
  const since = new Date(now - 90 * 86_400_000).toISOString();
  const { data: msgs } = await admin
    .from("messages")
    .select("mentorship_id, sender_id, created_at")
    .in("mentorship_id", ids)
    .gte("created_at", since);

  // Each participant's last-seen time per mentorship.
  const { data: reads } = await admin
    .from("reads")
    .select("user_id, ref_id, seen_at")
    .eq("scope", "mentorship")
    .in("ref_id", ids);
  const seenAt = new Map<string, number>();
  for (const r of reads ?? []) seenAt.set(`${r.user_id}|${r.ref_id}`, new Date(r.seen_at).getTime());

  const msgsByMentorship = new Map<string, { sender_id: string; created_at: string }[]>();
  for (const m of msgs ?? []) {
    const arr = msgsByMentorship.get(m.mentorship_id) ?? [];
    arr.push(m);
    msgsByMentorship.set(m.mentorship_id, arr);
  }

  // For each participant, collect the mentorships where they have unread inbound
  // messages (something from the other side newer than their last-seen).
  const unreadMentorships = new Map<string, string[]>(); // userId -> mentorshipIds
  for (const m of active) {
    const list = msgsByMentorship.get(m.id) ?? [];
    for (const recipient of [m.mentor_id, m.mentee_id]) {
      const seen = seenAt.get(`${recipient}|${m.id}`) ?? 0;
      const hasUnread = list.some(
        (x) => x.sender_id !== recipient && new Date(x.created_at).getTime() > seen
      );
      if (hasUnread) {
        const arr = unreadMentorships.get(recipient) ?? [];
        arr.push(m.id);
        unreadMentorships.set(recipient, arr);
      }
    }
  }
  if (unreadMentorships.size === 0) return NextResponse.json({ sent: 0 });

  // Names + emails for everyone involved (recipients and their partners).
  const partnerOf = (mentorshipId: string, userId: string) => {
    const m = active.find((x) => x.id === mentorshipId);
    if (!m) return null;
    return m.mentor_id === userId ? m.mentee_id : m.mentor_id;
  };
  const everyone = new Set<string>();
  for (const [uid, mids] of unreadMentorships) {
    everyone.add(uid);
    for (const mid of mids) {
      const p = partnerOf(mid, uid);
      if (p) everyone.add(p);
    }
  }
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", Array.from(everyone));
  const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

  let sent = 0;
  for (const [uid, mids] of unreadMentorships) {
    const me = profById.get(uid);
    if (!me?.email) continue;

    let opener: string;
    if (mids.length === 1) {
      const partner = partnerOf(mids[0], uid);
      const partnerName = partner ? firstName(profById.get(partner)?.full_name) : null;
      opener = partnerName
        ? `You have unread messages from ${partnerName} in your TELPSAM mentorship.`
        : `You have unread messages waiting in your TELPSAM mentorship.`;
    } else {
      opener = `You have unread messages waiting in ${mids.length} of your TELPSAM mentorship conversations.`;
    }

    await sendTemplatedEmail([me.email], "You have unread messages in your TELPSAM mentorship", {
      greetingName: firstName(me.full_name),
      paragraphs: [
        opener,
        "Mentorship grows best with a steady rhythm. Even a short reply, just a few honest lines, keeps the relationship warm and the encouragement flowing, and it means a great deal to the person on the other side who is waiting to hear from you.",
        "Please take a moment to read and reply when you can. Consistency is one of the greatest gifts you can offer in this walk together.",
      ],
      ctaText: "Read and reply",
      ctaPath: "/mentorships",
    });
    sent++;
  }

  return NextResponse.json({ sent });
}

// Supabase pg_cron calls this via net.http_post, so accept POST too.
export const POST = GET;
