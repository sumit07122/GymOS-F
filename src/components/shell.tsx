import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { type NavItem } from "./shell-nav";
import { Building2 } from "lucide-react";

export const OWNER_NAV: readonly NavItem[] = [
  ["Overview", "/owner"],
  ["Members", "/owner/members"],
  ["Plans", "/owner/plans"],
  ["Payments", "/owner/payments"],
  ["Attendance", "/owner/attendance"],
  ["Reports", "/owner/reports"],
  ["Settings", "/owner/settings"],
] as const;

export const MEMBER_NAV: readonly NavItem[] = [
  ["Overview", "/member"],
  ["Payments", "/member/payments"],
  ["Attendance", "/member/attendance"],
  ["Profile", "/member/profile"],
] as const;

export const ADMIN_NAV: readonly NavItem[] = [
  ["Platform overview", "/admin"],
  ["Onboarding Wizard", "/admin/onboard"],
] as const;

export function Shell({
  title,
  subtitle,
  who,
  nav,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  who: string;
  nav?: readonly NavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const cleanSubtitle = subtitle?.replace(/&middot;/g, "·");

  return (
    <div className="dashboard-shell min-h-screen flex flex-col lg:flex-row">
      {/* Neumorphic Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        items={nav}
        who={who}
        workspaceName={title.length > 20 ? title.slice(0, 20) + "…" : title}
        workspaceSubtitle={cleanSubtitle || "GymOS Portal"}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Desktop Top Bar with Breadcrumbs & Global Quick Action Slot */}
        <header className="hidden lg:flex sticky top-0 z-10 h-16 border-b border-line/60 bg-surface/75 backdrop-blur-md px-6 xl:px-8 items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-ink">{title}</span>
            {cleanSubtitle && (
              <>
                <span className="text-line">/</span>
                <span className="text-ink-muted">{cleanSubtitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted shadow-xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[11px]">System Online</span>
            </div>
            {actions}
          </div>
        </header>

        {/* Page Content Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-rise">
          {/* Mobile Title Banner */}
          <div className="lg:hidden flex flex-col justify-between gap-3 border-b border-line/60 pb-4">
            <div>
              {cleanSubtitle && (
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand mb-1">
                  <Building2 className="size-3.5" />
                  <span>{cleanSubtitle}</span>
                </div>
              )}
              <h1 className="font-display text-2xl font-black text-ink">{title}</h1>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>

          {/* Children Dashboard Views */}
          <div className="space-y-6">{children}</div>
        </main>

        {/* Subtle Footer */}
        <footer className="border-t border-line/60 bg-surface/40 py-4 px-6 text-center text-[11px] text-ink-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} FIXIA GymOS &middot; Enterprise SaaS Platform</span>
          <span className="font-semibold text-brand">Tenant-isolated &middot; Neon PostgreSQL RLS Secured</span>
        </footer>
      </div>
    </div>
  );
}
