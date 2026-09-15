import Image from "next/image";

// A person's avatar: their photo if we have one, otherwise their initials on a
// soft, name-derived colour. Deterministic, so the same person always gets the
// same colour across the portal.
const PALETTE = [
  { bg: "#e8e5fb", fg: "#4c3fb5" }, // violet
  { bg: "#d6f2ee", fg: "#0b6b62" }, // teal
  { bg: "#f6ead0", fg: "#96701f" }, // gold
  { bg: "#fde3dd", fg: "#b23a26" }, // coral
  { bg: "#dbe3f7", fg: "#2a3b6b" }, // navy
  { bg: "#dff3e6", fg: "#2f855a" }, // green
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const label = (name || "").trim();
  const dim = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        style={dim}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const { bg, fg } = colorFor(label || "?");
  return (
    <div
      aria-hidden
      style={{ ...dim, backgroundColor: bg, color: fg, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {label ? initials(label) : "?"}
    </div>
  );
}
