import { createAdminClient } from "@/lib/supabase/admin";

// Low-level sender. Uses Resend's REST API (no extra dependency). If email isn't
// configured (no RESEND_API_KEY / ALERT_FROM_EMAIL), it silently does nothing.
// Emails never contain private message content — only a heads-up and a link.
async function sendEmail(to: string[], subject: string, message: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;
    if (!apiKey || !from) return;
    const recipients = to.filter((e): e is string => !!e);
    if (recipients.length === 0) return;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const link = appUrl ? `${appUrl}/login` : "";
    const html =
      `<p>${escapeHtml(message)}</p>` +
      (link ? `<p><a href="${link}">Sign in to the TELPSAM Portal</a></p>` : "") +
      `<p style="color:#888;font-size:12px">TELPSAM Portal. For your privacy, we never include message content in emails.</p>`;
    const text = message + (link ? `\n\n${link}` : "");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html, text }),
    });
  } catch {
    // Never let an email failure break the user's action.
  }
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
