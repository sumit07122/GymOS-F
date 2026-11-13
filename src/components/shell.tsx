import type { ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import { Button, Logo } from "./ui";
import { ShellNav } from "./shell-nav";

export const OWNER_NAV = [
  ["Overview", "/owner"],
  ["Members", "/owner/members"],
  ["Plans", "/owner/plans"],
  ["Payments", "/owner/payments"],
  ["Attendance", "/owner/attendance"],
  ["Reports", "/owner/reports"],
  ["Settings", "/owner/settings"],
] as const;

export const MEMBER_NAV = [
  ["Overview", "/member"],
  ["Payments", "/member/payments"],
  ["Attendance", "/member/attendance"],
  ["Profile", "/member/profile"],
] as const;

export const ADMIN_NAV = [["Platform overview", "/admin"]] as const;

export function Shell({ title, subtitle, who, nav, children }: { title: string; subtitle?: string; who: string; nav?: readonly (readonly [string, string])[]; children: ReactNode }) {
  return (
    <div className="dashboard-shell min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 shadow-[0_8px_24px_rgba(27,52,37,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-48 truncate rounded-full bg-canvas px-3 py-1.5 text-sm font-medium text-muted sm:inline">{who}</span>
            <form action={logoutAction}><Button variant="ghost" type="submit" className="h-9 px-4 text-sm">Sign out</Button></form>
          </div>
        </div>
        {nav && <ShellNav items={nav} />}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="dashboard-heading animate-rise">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-deep">GymOS workspace</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        </div>
        <div className="dashboard-content mt-8 space-y-6">{children}</div>
      </main>
    </div>
  );
}
