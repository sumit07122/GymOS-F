"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  CalendarCheck,
  BarChart3,
  Settings,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = readonly [label: string, href: string];

const ICONS: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Members: Users,
  Plans: CreditCard,
  Payments: Receipt,
  Attendance: CalendarCheck,
  Reports: BarChart3,
  Settings: Settings,
  "Platform overview": ShieldCheck,
  Profile: UserCheck,
};

export function ShellNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="border-t border-line/60 bg-surface-elevated/80 backdrop-blur-md">
      <nav
        aria-label="Workspace navigation"
        className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 no-scrollbar"
      >
        {items.map(([label, href]) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          const Icon = ICONS[label] ?? LayoutDashboard;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 sm:text-sm ${
                active
                  ? "bg-brand text-white shadow-[0_2px_8px_rgba(22,131,74,0.3)]"
                  : "text-ink-muted hover:bg-surface hover:text-ink hover:shadow-sm"
              }`}
            >
              <Icon
                className={`size-4 transition-transform group-hover:scale-110 ${
                  active ? "text-white" : "text-ink-muted group-hover:text-brand"
                }`}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
