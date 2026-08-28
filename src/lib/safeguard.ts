// Auto-flag scanner for the TELPSAM portal.
// Conversations are private by default. Coordinators do not read chats. Instead,
// every message is scanned for the specific behaviours the Rules of Engagement
// forbid, and a match raises a flag for the Program Coordinators to review.
//
// This is a safety net, not a censor: it never blocks a message, it only flags.
// Patterns are deliberately broad; a coordinator makes the final judgement.

export type FlagCategory =
  | "Possible phone number"
  | "Possible money or gift request"
  | "Possible contact details / off-platform"
  | "Possible meet-up request";

const MONEY =
  /\b(momo|mobile\s*money|cash|money|payment|\bpay\b|loan|deposit|transfer|western\s*union|cedis?|ghs|dollars?|\bfee\b|gift|sponsor|account\s*(number|details)|send\s*(me\s*)?(some\s*)?(money|cash|cedis?|momo|funds))\b|[$₵£€]\s?\d/i;

const OFF_PLATFORM =
  /\b(whats\s?app|wa\.me|telegram|snapchat|snap|instagram|\big\b|facebook|\bfb\b|tiktok|zoom|gmail|yahoo|hotmail|outlook|e-?mail|call\s*me|text\s*me|(my|your|ur)\s*(number|contact|line|digits)|reach\s*me\s*on|send\s*(me\s*)?(your|ur)\s*(number|contact))\b|[\w.+-]+@[\w-]+\.\w+/i;

const MEETUP =
  /\b(meet\s*(up|me|you)?|come\s*(to|over|and\s*see)|my\s*(place|house|home|hostel|room|office)|your\s*(place|house)|in\s*person|see\s*you\s*(at|in|on)|link\s*up|hang\s*out|pick\s*you\s*up|hotel|address)\b/i;

// 7+ digits, allowing spaces, dashes, dots, parens and a leading +/00.
// Requires at least 7 actual digits so years/short numbers don't trip it.
function looksLikePhone(text: string): boolean {
  const candidates = text.match(/(?:\+|00)?[\d][\d\s().-]{5,}\d/g) || [];
  return candidates.some((c) => (c.replace(/\D/g, "").length >= 7));
}

/** Returns the list of red-line categories a message triggers (empty if clean). */
export function scanMessage(body: string): FlagCategory[] {
  const flags: FlagCategory[] = [];
  if (looksLikePhone(body)) flags.push("Possible phone number");
  if (MONEY.test(body)) flags.push("Possible money or gift request");
  if (OFF_PLATFORM.test(body)) flags.push("Possible contact details / off-platform");
  if (MEETUP.test(body)) flags.push("Possible meet-up request");
  return flags;
}
