import type { ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import { Button, Logo, Avatar } from "./ui";
import { ShellNav, type NavItem } from "./shell-nav";
import { LogOut, Building2 } from "lucide-react";

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
  return (
    <div className="dashboard-shell min-h-dvh flex flex-col">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 shadow-[0_4px_20px_rgba(23,37,29,0.03)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />

          {/* Right Header: User Info & Actions */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-full border border-line bg-surface-elevated/70 py-1 pl-1.5 pr-3 shadow-inner sm:flex">
              <Avatar name={who} size="sm" />
              <span className="max-w-40 truncate text-xs font-bold text-ink">
                {who}
              </span>
            </div>

            <form action={logoutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                icon={LogOut}
                className="h-9 px-3 text-xs text-ink-muted hover:text-danger"
              >
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        {nav && <ShellNav items={nav} />}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="dashboard-heading animate-rise mb-8 flex flex-col justify-between gap-4 border-b border-line/60 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand">
              <Building2 className="size-3.5" />
              <span>Workspace</span>
              {subtitle && (
                <>
                  <span className="text-line">•</span>
                  <span className="text-ink-muted">{subtitle}</span>
                </>
              )}
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-black tracking-tight text-ink sm:text-3xl lg:text-4xl">
              {title}
            </h1>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </div>

        <div className="dashboard-content space-y-8 animate-rise">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line/60 bg-surface/50 py-6 text-center text-xs text-ink-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} FIXIA GymOS &middot; Enterprise SaaS Platform</span>
          <span className="font-semibold text-brand">Tenant-isolated &middot; Neon PostgreSQL RLS Secured</span>
        </div>
      </footer>
    </div>
  );
}
