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

// Simple one-line alert (used for coordinator alerts). Keeps a plain look.
async function sendEmail(to: string[], subject: string, message: string): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const link = appUrl ? `${appUrl}/login` : "";
  const html =
    `<p>${escapeHtml(message)}</p>` +
    (link ? `<p><a href="${link}">Sign in to the TELPSAM Portal</a></p>` : "") +
    `<p style="color:#888;font-size:12px">TELPSAM Portal. For your privacy, we never include message content in emails.</p>`;
  const text = message + (link ? `\n\n${link}` : "");
  await dispatch(to, subject, html, text);
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

// Alert every coordinator (admin). Needs the service-role key to read admin
// emails past RLS; skips quietly if it isn't set.
export async function notifyAdmins(subject: string, message: string): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("email").eq("role", "admin");
    await sendEmail((data ?? []).map((r) => r.email), subject, message);
  } catch {
    /* best effort */
  }
}

// Email a single member (by user id), looking up their address with the
// service-role client so we never rely on exposing emails through RLS.
export async function notifyUserById(userId: string, subject: string, message: string): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (data?.email) await sendEmail([data.email], subject, message);
  } catch {
    /* best effort */
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
