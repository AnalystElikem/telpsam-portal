import { createAdminClient } from "@/lib/supabase/admin";

// Low-level dispatcher. Uses Resend's REST API (no extra dependency). If email
// isn't configured (no RESEND_API_KEY / ALERT_FROM_EMAIL), it silently does
// nothing. Emails never contain private message content — only a heads-up.
async function dispatch(to: string[], subject: string, html: string, text: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;
    if (!apiKey || !from) return;
    const recipients = to.filter((e): e is string => !!e);
    if (recipients.length === 0) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html, text }),
    });
  } catch {
    // Never let an email failure break the caller's action.
  }
}

// Warm, branded member email: salutation, body paragraphs, a call-to-action
// button, and a sign-off from the coordinators. Used for reminders and other
// member-facing notes where tone matters.
export async function sendTemplatedEmail(
  to: string[],
  subject: string,
  opts: { greetingName?: string | null; paragraphs: string[]; ctaText?: string; ctaPath?: string }
): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const greeting = opts.greetingName ? `Dear ${escapeHtml(opts.greetingName)},` : "Hello,";
  const bodyHtml = opts.paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p)}</p>`)
    .join("");
  const ctaUrl = appUrl ? `${appUrl}${opts.ctaPath || "/mentorships"}` : "";
  const button =
    ctaUrl && opts.ctaText
      ? `<p style="margin:20px 0"><a href="${ctaUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">${escapeHtml(
          opts.ctaText
        )}</a></p>`
      : "";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;font-size:15px">` +
    `<p style="margin:0 0 14px">${greeting}</p>` +
    bodyHtml +
    button +
    `<p style="margin:22px 0 0;line-height:1.6">Warm regards,<br/><strong>The TELPSAM Programme Coordinators</strong></p>` +
    `<hr style="border:none;border-top:1px solid #eee;margin:22px 0"/>` +
    `<p style="color:#888;font-size:12px;line-height:1.5">TELPSAM Alumni &amp; Mentorship Portal. For your privacy, we never include message content in emails. You are receiving this because you are part of a TELPSAM mentorship.</p>` +
    `</div>`;
  const text =
    `${greeting}\n\n` +
    opts.paragraphs.join("\n\n") +
    (ctaUrl ? `\n\n${opts.ctaText || "Open the portal"}: ${ctaUrl}` : "") +
    `\n\nWarm regards,\nThe TELPSAM Programme Coordinators`;
  await dispatch(to, subject, html, text);
}

const firstName = (full?: string | null) => (full || "").trim().split(/\s+/)[0] || null;

// Read every coordinator's email (service-role, bypasses RLS).
async function adminEmails(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data } = await admin.from("profiles").select("email").eq("role", "admin");
  return (data ?? []).map((r) => r.email).filter((e): e is string => !!e);
}

// ROUTINE coordinator notifications (a signup to approve, a mentorship request,
// a declined invitation, a support message…) are NOT emailed one-by-one. They're
// queued and rolled up into a periodic digest (see /api/cron/admin-digest), so
// coordinators get a few tidy summaries a day instead of a flood.
export async function notifyAdmins(
  subject: string,
  message: string,
  cta?: { text: string; path: string }
): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    await admin.from("admin_notifications").insert({
      subject,
      body: message,
      cta_text: cta?.text ?? null,
      cta_path: cta?.path ?? null,
    });
  } catch {
    /* best effort */
  }
}

// URGENT coordinator alerts (safeguarding flags) go out immediately, warmly
// templated. Reserve this for things that can't wait for the next digest.
export async function notifyAdminsUrgent(
  subject: string,
  message: string,
  cta?: { text: string; path: string }
): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    const emails = await adminEmails(admin);
    if (emails.length === 0) return;
    await sendTemplatedEmail(emails, subject, {
      greetingName: "Coordinator",
      paragraphs: message.split(/\n\n+/),
      ctaText: cta?.text ?? "Open the coordinator dashboard",
      ctaPath: cta?.path ?? "/admin/alerts",
    });
  } catch {
    /* best effort */
  }
}

// Send the queued routine notifications as one digest. Returns how many items
// were rolled up (0 if nothing was waiting). Used by the digest cron.
export async function sendAdminDigest(): Promise<number> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("admin_notifications")
    .select("id, subject, body, cta_path")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (!items || items.length === 0) return 0;

  const emails = await adminEmails(admin);
  if (emails.length === 0) return 0;

  // Group identical subjects and count them, keeping order of first appearance.
  const groups: { subject: string; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const it of items) {
    const subj = it.subject as string;
    if (seen.has(subj)) {
      groups[seen.get(subj)!].count++;
    } else {
      seen.set(subj, groups.length);
      groups.push({ subject: subj, count: 1 });
    }
  }

  const total = items.length;
  const paragraphs = [
    `Here is a summary of what needs a coordinator's attention — ${total} update${total === 1 ? "" : "s"} since the last digest:`,
    ...groups.map((g) => `• ${g.subject}${g.count > 1 ? ` (×${g.count})` : ""}`),
    "Open the portal to review and act on these. Anything urgent (such as a safeguarding flag) is always sent to you right away, separately.",
  ];

  await sendTemplatedEmail(emails, `TELPSAM: ${total} update${total === 1 ? "" : "s"} for the coordinators`, {
    greetingName: "Coordinator",
    paragraphs,
    ctaText: "Open the coordinator dashboard",
    ctaPath: "/admin",
  });

  const ids = items.map((i) => i.id);
  await admin.from("admin_notifications").update({ sent_at: new Date().toISOString() }).in("id", ids);
  return total;
}

// Email a single member (by user id) with the warm template, greeting them by
// first name. Looks up their address with the service-role client so we never
// rely on exposing emails through RLS.
export async function notifyUserById(
  userId: string,
  subject: string,
  message: string,
  cta?: { text: string; path: string }
): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
    if (!data?.email) return;
    await sendTemplatedEmail([data.email], subject, {
      greetingName: firstName(data.full_name),
      paragraphs: message.split(/\n\n+/),
      ctaText: cta?.text ?? "Open the TELPSAM portal",
      ctaPath: cta?.path ?? "/login",
    });
  } catch {
    /* best effort */
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
