// AI safeguarding classifier.
//
// This is the "intelligent" layer that catches what keyword rules miss:
// euphemisms, spelled-out numbers, grooming intent, veiled money asks. It reads
// the message IN CONTEXT and returns a structured judgement.
//
// It is OPTIONAL: if no API key is configured, callers fall back to the regex
// assessment in safeguard.ts. Set OPENAI_API_KEY (and optionally
// OPENAI_MODERATION_MODEL, default gpt-4o-mini) to enable it.

import type { Assessment, Severity } from "@/lib/safeguard";

const SYSTEM = `You are a child-safeguarding classifier for a Christian youth mentorship chat platform. Adults (alumni mentors) message students (some minors) in a supervised one-to-one channel. The Rules of Engagement forbid, and you must flag:
- sharing or requesting phone numbers, emails, social handles, or moving the chat off-platform (WhatsApp, Telegram, Snapchat, Instagram, DM, etc.), including spelled-out numbers ("zero two four ...");
- asking for, offering, lending, or transferring money, gifts, fees, loans, or "help with" money;
- arranging to meet in person, visit, or share a location/address;
- any grooming, secrecy ("don't tell anyone", "our secret"), flattery of a sexual/romantic nature, requests for photos, or manipulative/predatory intent.

Do NOT flag ordinary, healthy mentorship: discussing money as a life-skills TOPIC, "nice to meet you", faith, studies, encouragement, prayer, careers. Judge intent in context, not keywords.

Return ONLY a JSON object: {"flag": boolean, "severity": "high" | "low", "categories": string[], "reason": string}. Use "high" for a clear or probable breach that a coordinator should see now; "low" for something ambiguous worth a quiet review; flag=false for clearly fine messages. "reason" must be one short sentence and MUST NOT quote sensitive data like the actual number.`;

export async function classifyMessage(body: string): Promise<Assessment | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODERATION_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: body.slice(0, 2000) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt: string | undefined = data?.choices?.[0]?.message?.content;
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    const severity: Severity = parsed?.severity === "high" ? "high" : "low";
    const categories = Array.isArray(parsed?.categories) ? parsed.categories.map(String).slice(0, 8) : [];
    return {
      flag: Boolean(parsed?.flag),
      severity,
      categories,
      reason: String(parsed?.reason || "AI safeguarding review").slice(0, 300),
    };
  } catch {
    // Network error, timeout, bad JSON — fail closed to the regex fallback.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
