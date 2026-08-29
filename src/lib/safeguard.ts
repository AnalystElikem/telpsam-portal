// Auto-flag scanner for the TELPSAM portal.
//
// Goal: catch genuine breaches of the Rules of Engagement WITHOUT drowning
// coordinators in false positives. So we do NOT flag the bare mention of a word
// like "money" or "meet" — normal mentorship talks about money, meetings, and
// callings all the time. We only flag when there's a real signal: an actual
// phone number, a contact handle/email, a money request WITH an amount or an
// exchange verb, or a concrete arrangement to meet in person / move off-platform.

export type FlagCategory =
  | "Possible phone number"
  | "Possible contact details / off-platform"
  | "Possible money request"
  | "Possible meet-up arrangement";

// 7+ digits (allowing spaces, dashes, dots, parens, +, 00) — a real number, not
// a year or a small figure.
function looksLikePhone(text: string): boolean {
  const candidates = text.match(/(?:\+|00)?\d[\d\s().-]{5,}\d/g) || [];
  return candidates.some((c) => c.replace(/\D/g, "").length >= 7);
}

// Contact handles / social apps / email / "add me on…", "my number is…".
const CONTACT =
  /\b(whats\s?app|wa\.me|telegram|snapchat|\bsnap\b|instagram|\big\b|tiktok|\bfb\b|facebook|messenger|imo|viber|signal)\b|[\w.+-]+@[\w-]+\.\w{2,}|\b(my|your|ur)\s*(number|contact|line|digits|handle|email)\b|\b(add|reach|find|dm|text|message)\s*me\s*(on|at)\b/i;

// Money ONLY when there's an amount or an exchange verb tied to money.
const CURRENCY_AMOUNT = /[$₵£€]\s?\d|\b\d[\d,.]*\s?(cedis?|ghc|ghs|dollars?|usd|pounds?|euros?|naira)\b/i;
const MONEY_EXCHANGE =
  /\b(send|give|lend|borrow|transfer|pay|repay|deposit|wire|sponsor|loan|momo|mobile\s*money)\b[^.!?\n]{0,25}\b(money|cash|cedis?|ghs|momo|funds?|account|amount|fee|gift|\d)/i;
const MONEY_ASK =
  /\b(money|cash|cedis?|momo|funds?)\b[^.!?\n]{0,20}\b(please|send|give|transfer|pay|help|need|urgent)\b/i;

// Meet-up ONLY when it's arranging an in-person meeting or a place/pickup — not
// "nice to meet you" or "meet with God".
const MEETUP =
  /\bmeet\s*(up|me\s*(at|by|on|tomorrow|today|this|next)|at\b)|\bcome\s*(to|over|and\s*see)\b|\bmy\s*(place|house|home|hostel|room|hotel)\b|\byour\s*(place|house|hostel)\b|\bsee\s*you\s*(at|on|this|next|tomorrow|by)\b|\blink\s*up\b|\bpick\s*(you|u)\s*up\b|\bin\s*person\b/i;

/** Returns the red-line categories a message triggers (empty if clean). */
export function scanMessage(body: string): FlagCategory[] {
  const flags: FlagCategory[] = [];
  if (looksLikePhone(body)) flags.push("Possible phone number");
  if (CONTACT.test(body)) flags.push("Possible contact details / off-platform");
  if (CURRENCY_AMOUNT.test(body) || MONEY_EXCHANGE.test(body) || MONEY_ASK.test(body))
    flags.push("Possible money request");
  if (MEETUP.test(body)) flags.push("Possible meet-up arrangement");
  return flags;
}
