import type { LucideIcon } from "lucide-react";

// A friendly, centered empty state: a soft icon, a short title, and an optional
// line of guidance (or any children, e.g. a link/button).
export default function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-body">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
