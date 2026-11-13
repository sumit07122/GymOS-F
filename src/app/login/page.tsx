import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentContext, homeFor } from "@/server/auth/guards";
import { LoginForms } from "./login-forms";
import { ShieldCheck, Sparkles, Building2, Users } from "lucide-react";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const ctx = await currentContext();
  if (ctx) redirect(homeFor(ctx));

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr] bg-canvas">
      {/* Brand Hero Panel (Desktop) */}
      <section className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 size-[36rem] rounded-full bg-brand/25 blur-3xl"
        />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="size-3.5 text-brand-secondary" />
            <span>Next-Gen Gym Intelligence</span>
          </div>

          <h1 className="font-display text-5xl font-black leading-[1.08] tracking-tight">
            Your whole gym, <span className="text-brand-secondary">one register</span> that never gets lost.
          </h1>

          <p className="text-base text-white/75 leading-relaxed">
            Members, subscriptions, payments, and QR attendance &mdash; perfectly organized, counted, and always up to date.
          </p>

          <div className="pt-4 grid grid-cols-2 gap-4 border-t border-white/15">
            <div className="flex items-center gap-2.5 text-xs text-white/80">
              <ShieldCheck className="size-4 text-brand-secondary shrink-0" />
              <span>Multi-tenant Isolation</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/80">
              <Users className="size-4 text-brand-secondary shrink-0" />
              <span>Instant Member OTP</span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/50">
          <span>&copy; {new Date().getFullYear()} FIXIA SaaS Platform</span>
          <span className="font-mono text-[11px]">v1.0 Production Ready</span>
        </div>
      </section>

      {/* Login Card Form Area */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="neu-card p-8 sm:p-10 border border-line bg-surface">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-black tracking-tight text-ink">
                Welcome back
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Choose your role to access your workspace or member pass.
              </p>
            </div>

            <LoginForms initialTab={as === "staff" ? "staff" : "member"} />
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted">
            Need a workspace for your gym?{" "}
            <a href="/register" className="font-bold text-brand hover:underline">
              Register your gym with FIXIA &rarr;
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
