import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentContext, homeFor } from "@/server/auth/guards";
import { LoginForms } from "./login-forms";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const ctx = await currentContext();
  if (ctx) redirect(homeFor(ctx));
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        <div aria-hidden className="absolute -bottom-40 -left-24 size-[32rem] rounded-full bg-brand/20 blur-3xl" />
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            Your whole gym, <span className="text-brand">one register</span> that never gets lost.
          </h1>
          <p className="mt-5 text-lg text-white/70">Members, memberships, payments and attendance — organised, counted and always up to date.</p>
        </div>
        <p className="relative text-sm text-white/50">© FIXIA</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Sign in to continue.</p>
          <LoginForms initialTab={as === "staff" ? "staff" : "member"} />
        </div>
      </section>
    </main>
  );
}
