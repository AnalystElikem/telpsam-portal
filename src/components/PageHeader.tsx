// Consistent page header across the app: a gold eyebrow, a serif title, and an
// optional subtitle — the same energy the public pages carry. An optional action
// slot (children) sits to the right on wider screens.
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 font-serif text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl leading-relaxed text-body">{subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
