"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = readonly [label: string, href: string];

export function ShellNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {items.map(([label, href]) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-deep bg-soft/70 text-deeper"
                : "border-transparent text-muted hover:border-line hover:bg-canvas/80 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
