// Display helpers for people's names and titles.

// Title-case a name for display, so "EMMANUEL MUDEY" and "michael thompson"
// both render as "Emmanuel Mudey". Words that are already mixed-case
// (e.g. "McKee", "DeShawn", "IsaacHayford") are left untouched, so we never
// mangle an intentional capital. Handles hyphens and apostrophes.
export function titleCaseName(name?: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const isAllUpper = word === word.toUpperCase();
      const isAllLower = word === word.toLowerCase();
      if (!isAllUpper && !isAllLower) return word; // keep intentional casing
      return word
        .toLowerCase()
        .replace(/(^|[-'’])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
    })
    .join(" ");
}

// Normalize a title/honorific for a uniform look: trim and drop any trailing
// period(s), so "Mr.", "Dr" and "Ps" all render without a full stop.
export function cleanTitle(title?: string | null): string {
  if (!title) return "";
  return title.trim().replace(/\.+$/, "");
}
