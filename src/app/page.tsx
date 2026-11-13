import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentContext, homeFor } from "@/server/auth/guards";

export const metadata = {
  title: "FIXIA GymOS | A calmer way to run your gym",
  description: "Manage gym members, memberships, collections and attendance in one clear workspace with FIXIA GymOS.",
  robots: { index: true, follow: true },
};
export const dynamic = "force-dynamic";

const features = [
  {
    number: "01",
    title: "Know every member",
    description: "Keep member details, active plans, renewals and attendance history together in one searchable workspace.",
  },
  {
    number: "02",
    title: "Make collections clear",
    description: "Record cash, UPI and bank payments, track partial balances and issue a receipt for each payment.",
  },
  {
    number: "03",
    title: "Make check-in simple",
    description: "Give your gym one dedicated QR code for member check-ins, with a history your team can review.",
  },
];

const steps = [
  ["01", "Request a workspace", "Share a few details about your gym. FIXIA reviews every request before setup."],
  ["02", "Set up your gym", "FIXIA configures your workspace and subscription; you set the plans and day-to-day operations."],
  ["03", "Run it in one place", "Manage members, renewals, payments and attendance from your gym dashboard."],
];

export default async function Home() {
  const context = await currentContext();
  if (context) redirect(homeFor(context));

  return (
    <main className="min-h-dvh overflow-hidden bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="FIXIA GymOS home" className="shrink-0"><Logo /></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            <a href="#platform" className="text-sm font-medium text-muted transition-colors hover:text-deep">Platform</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted transition-colors hover:text-deep">How it works</a>
            <a href="#for-gyms" className="text-sm font-medium text-muted transition-colors hover:text-deep">For your gym</a>
            <a href="#faq" className="text-sm font-medium text-muted transition-colors hover:text-deep">FAQ</a>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-soft sm:inline-flex">Sign in</Link>
            <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-deep px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-deeper">Request access</Link>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex gap-5 overflow-x-auto border-t border-line/70 px-4 py-2.5 text-xs font-medium text-muted md:hidden">
          <a href="#platform" className="whitespace-nowrap hover:text-deep">Platform</a>
          <a href="#how-it-works" className="whitespace-nowrap hover:text-deep">How it works</a>
          <a href="#for-gyms" className="whitespace-nowrap hover:text-deep">For your gym</a>
          <a href="#faq" className="whitespace-nowrap hover:text-deep">FAQ</a>
        </nav>
      </header>

      <section className="relative isolate">
        <div aria-hidden className="marketing-grid pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden className="pointer-events-none absolute -right-36 top-8 -z-10 size-[34rem] rounded-full bg-brand/10 blur-3xl" />
        <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="animate-rise max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-deep/10 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.13em] text-deep shadow-sm">
              <span aria-hidden className="size-2 rounded-full bg-brand" />
              The gym operations workspace
            </div>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[1.04] tracking-[-0.045em] text-ink sm:text-6xl lg:text-7xl">
              Your gym runs better when everything <span className="text-deep">has its place.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Members, memberships, collections and attendance—clear, connected and ready for the gym floor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-deep px-5 font-semibold text-white shadow-[0_8px_20px_rgba(22,122,69,0.2)] transition hover:-translate-y-0.5 hover:bg-deeper">
                Request a gym workspace <span aria-hidden>→</span>
              </Link>
              <a href="#platform" className="inline-flex min-h-12 items-center justify-center rounded-lg px-4 font-semibold text-ink transition hover:bg-white/80">Explore the platform</a>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted">Every gym request is reviewed by FIXIA. Subscription details are confirmed during onboarding.</p>
          </div>

          <div className="animate-fade relative mx-auto w-full max-w-[550px] lg:justify-self-end">
            <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-brand/15 via-transparent to-deep/10 blur-2xl" />
            <div className="neo-card relative overflow-hidden p-3 sm:p-4">
              <div className="rounded-[1rem] border border-line/80 bg-white/90 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-line pb-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-deep">Workspace preview</p>
                    <h2 className="mt-2 font-display text-xl font-extrabold">Today at your gym</h2>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1.5 text-xs font-semibold text-deeper">Illustrative</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Members", "One organized list"],
                    ["Memberships", "Plans and renewals"],
                    ["Collections", "Payments and dues"],
                    ["Attendance", "Gym QR check-in"],
                  ].map(([label, value], i) => (
                    <div key={label} className={`neo-inset min-h-28 p-4 ${i % 2 ? "animate-fade" : ""}`}>
                      <span className="grid size-8 place-items-center rounded-lg bg-white text-deep shadow-sm" aria-hidden>{["↗", "◷", "₹", "▦"][i]}</span>
                      <p className="mt-3 text-sm font-bold">{label}</p>
                      <p className="mt-1 text-xs text-muted">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-forest px-4 py-3.5 text-white">
                  <div><p className="text-xs font-semibold text-white/60">One clear daily workflow</p><p className="mt-1 text-sm font-semibold">Less register juggling. More focus on your members.</p></div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-bold text-forest" aria-hidden>✓</span>
                </div>
              </div>
              <p className="px-2 pt-3 text-center text-[11px] text-muted">A product illustration—not live gym data.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="scroll-mt-24 border-y border-line bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-deep">Built for everyday operations</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">The essentials, working together.</h2>
            <p className="mt-4 leading-7 text-muted">A practical system for independent gyms—without turning daily work into another complicated process.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="neo-card p-6 sm:p-7">
                <span className="grid size-10 place-items-center rounded-xl bg-soft font-display text-sm font-extrabold text-deep">{feature.number}</span>
                <h3 className="mt-6 font-display text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-deep">Getting started</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">A considered start. A smoother day.</h2>
            <p className="mt-4 leading-7 text-muted">FIXIA helps set up each gym workspace, while your team stays in control of gym plans and member operations.</p>
            <Link href="/register" className="mt-7 inline-flex items-center gap-2 font-semibold text-deep hover:text-deeper">Start with a request <span aria-hidden>→</span></Link>
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {steps.map(([number, title, description]) => (
              <li key={number} className="grid gap-3 py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-5">
                <span className="font-display text-sm font-extrabold text-deep">{number}</span>
                <div><h3 className="font-display text-lg font-bold">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="for-gyms" className="scroll-mt-24 bg-forest text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8 lg:py-20">
          <div className="md:col-span-3 md:max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">One platform, clear responsibilities</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Designed around the people who run your gym.</h2>
          </div>
          {[
            ["For owners", "See gym activity, manage members and plans, record payments, and review attendance from your workspace."],
            ["For members", "Check membership details, payment history and receipts, and use your gym’s QR code to check in."],
            ["For FIXIA", "Review gym requests and manage workspace subscriptions so each gym is onboarded deliberately."],
          ].map(([title, description]) => (
            <article key={title} className="border-t border-white/20 pt-5">
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-deep">Good to know</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight">A few common questions.</h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">How does my gym get access?<span className="text-xl text-deep transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Submit a workspace request. FIXIA reviews it, then configures the gym account and subscription before operational access is enabled.</p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">Can I set my own membership plans?<span className="text-xl text-deep transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Yes. Once your workspace is active, gym owners can create plans with their own duration and price, then assign and renew them for members.</p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">How are member payments handled?<span className="text-xl text-deep transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Owners record payments made by cash, UPI or bank transfer. GymOS tracks balances and receipts; it does not collect payments online.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-deep px-6 py-9 text-white sm:px-10 md:flex-row md:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">A better rhythm for your gym</p><h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Bring your daily operations together.</h2><p className="mt-2 text-sm text-white/70">Request a workspace and FIXIA will help you take the next step.</p></div>
          <Link href="/register" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-5 font-semibold text-deeper transition hover:-translate-y-0.5 hover:bg-soft">Request access <span className="ml-3" aria-hidden>→</span></Link>
        </div>
      </section>

      <footer className="border-t border-line bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link href="/" aria-label="FIXIA GymOS home"><Logo /></Link>
          <p className="text-muted">A clearer way to manage your gym, from FIXIA.</p>
          <div className="flex gap-5 text-muted"><Link href="/login" className="hover:text-deep">Sign in</Link><Link href="/register" className="hover:text-deep">Request a workspace</Link></div>
        </div>
      </footer>
    </main>
  );
}
