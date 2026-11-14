"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { Logo, Avatar } from "./ui";
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
  Building2,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "./shell-nav";

const ICONS: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Members: Users,
  Plans: CreditCard,
  Payments: Receipt,
  Attendance: CalendarCheck,
  Reports: BarChart3,
  Settings: Settings,
  "Platform overview": ShieldCheck,
  "Onboarding Wizard": Sparkles,
  Profile: UserCheck,
};

interface SidebarProps {
  items?: readonly NavItem[];
  who: string;
  workspaceName?: string;
  workspaceSubtitle?: string;
}

export function Sidebar({
  items = [],
  who,
  workspaceName = "Workspace",
  workspaceSubtitle = "Operational Access",
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile drawer on route navigation (React 19 pattern)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      {/* Top: Logo & Workspace Info */}
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <Logo />
          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-xl neu-inset text-ink-muted hover:text-ink"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Soft Neumorphic Workspace Pill */}
        <div className="neu-inset p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand border border-brand/20">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate leading-tight">
                {workspaceName}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {workspaceSubtitle}
              </p>
            </div>
          </div>
          <span className="inline-flex size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" title="System Live" />
        </div>
      </div>

      {/* Middle: Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-muted/80">
          Main Menu
        </p>
        <nav aria-label="Sidebar navigation" className="space-y-1.5">
          {items.map(([label, href]) => {
            const active =
              pathname === href || (href !== "/" && href !== "/owner" && href !== "/admin" && href !== "/member" && pathname.startsWith(`${href}/`));
            const Icon = ICONS[label] ?? LayoutDashboard;

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-150 ${
                  active
                    ? "bg-surface text-brand shadow-[inset_0_2px_4px_rgba(22,131,74,0.06),0_2px_6px_rgba(23,37,29,0.04)] border border-brand/25"
                    : "text-ink-muted hover:text-ink hover:bg-surface-elevated/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${
                      active
                        ? "bg-brand text-white shadow-xs"
                        : "bg-canvas-subtle text-ink-muted group-hover:text-brand group-hover:bg-brand/10"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="truncate">{label}</span>
                </div>

                {active && (
                  <div className="size-1.5 rounded-full bg-brand shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Card & Sign Out */}
      <div className="p-4 border-t border-line/60 bg-canvas-subtle/40 space-y-2">
        <div className="neu-card p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={who} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate leading-tight">{who}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-brand" />
                <span className="text-[10px] text-ink-muted font-medium">Logged in</span>
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-colors shadow-xs"
              title="Sign out of GymOS"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-line bg-surface/75 backdrop-blur-xl z-20 flex-col shadow-[4px_0_24px_rgba(23,37,29,0.02)]">
        {navContent}
      </aside>

      {/* Mobile Top Header Bar with Hamburger Trigger */}
      <div className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-xl neu-inset text-ink hover:text-brand"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
        </div>

        <div className="flex items-center gap-2">
          <Avatar name={who} size="sm" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-danger"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Sliding Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-2xl border-r border-line flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
