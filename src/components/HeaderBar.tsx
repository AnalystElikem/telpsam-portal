"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";

type NavLink = { href: string; label: string };

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
      {count}
    </span>
  );
}

export default function HeaderBar({
  links,
  badges,
  fullName,
  role,
}: {
  links: NavLink[];
  badges: Record<string, number>;
  fullName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const totalBadges = Object.values(badges).reduce((a, b) => a + b, 0);

  return (
    <header className="border-b border-line bg-white">
      {/* Top row */}
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" title="Home">
          <Image src="/telpsam-logo.png" alt="TELPSAM" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
          <span className="font-serif text-base font-bold text-ink">TELPSAM</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{fullName}</p>
            <p className="text-xs capitalize text-muted">{role}</p>
          </div>
          <form action={signOut}>
            <button className="btn btn-outline !px-3 !py-1.5" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {!open && totalBadges > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-coral" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop links row */}
      <nav className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-body hover:bg-canvas hover:text-navy"
            >
              {l.label}
              {badges[l.href] > 0 && <Badge count={badges[l.href]} />}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="border-t border-line md:hidden">
          <div className="flex flex-col px-3 py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-body hover:bg-canvas hover:text-navy"
              >
                {l.label}
                {badges[l.href] > 0 && <Badge count={badges[l.href]} />}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
