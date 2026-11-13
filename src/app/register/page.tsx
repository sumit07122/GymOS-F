import Link from "next/link";
import { Logo } from "@/components/ui";
import { Button, Field, Notice } from "@/components/ui";
import { submitRegistrationAction } from "./actions";

export const metadata = { title: "Request a GymOS workspace" };

export default async function RegistrationPage({ searchParams }: { searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const { error, submitted } = await searchParams;
  return (
    <main className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link href="/" aria-label="FIXIA GymOS home"><Logo /></Link><Link href="/login" className="text-sm font-medium text-deep hover:underline">Sign in</Link></header>
      <div className="mx-auto grid max-w-5xl gap-12 px-5 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-20">
        <section><p className="text-sm font-semibold uppercase text-deep">Gym onboarding</p><h1 className="mt-3 font-display text-4xl font-extrabold">Bring your gym onto one register.</h1><p className="mt-4 max-w-md text-muted">Send a workspace request to FIXIA. We review the gym, configure your account, and confirm the subscription before operations begin.</p><p className="mt-5 text-sm text-muted">Plans and pricing are provided by FIXIA during onboarding. Submitting a request does not activate a subscription.</p></section>
        <section>
          {submitted ? <Notice tone="ok">Request received. FIXIA will contact the gym owner using the details provided.</Notice> : <>
            {error && <Notice>{error === "limited" ? "Too many requests. Please try again later." : error === "phone" ? "Enter a valid Indian mobile number." : "Check the details and try again."}</Notice>}
            <form action={submitRegistrationAction} className="grid gap-4 border-y border-line py-6 sm:grid-cols-2">
              <Field label="Gym name" name="gymName" required maxLength={100} />
              <Field label="City" name="city" maxLength={80} />
              <Field label="Owner name" name="ownerName" required maxLength={80} />
              <Field label="Owner phone" name="ownerPhone" type="tel" required placeholder="98765 43210" />
              <div className="sm:col-span-2"><Field label="Owner email" name="ownerEmail" type="email" required /></div>
              <div className="sm:col-span-2"><Field label="Gym address" name="address" maxLength={200} /></div>
              <div className="sm:col-span-2"><label htmlFor="notes" className="block text-sm font-medium">Anything FIXIA should know?</label><textarea id="notes" name="notes" maxLength={500} rows={3} className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px]" /></div>
              <div className="sm:col-span-2"><Button type="submit">Submit workspace request</Button></div>
            </form>
          </>}
        </section>
      </div>
    </main>
  );
}