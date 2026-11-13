import { requireSignedIn } from "@/server/auth/guards";
import { EnrollEmailForm } from "./enroll-email-form";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Verify Your Email · FIXIA GymOS",
  description: "Link a verified email to your account for secure self-service password recovery.",
};

export default async function EnrollEmailPage() {
  await requireSignedIn();

  return (
    <main className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Secure Your Account
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Add and verify your email address. This allows you to recover your account if you ever forget your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          <EnrollEmailForm />
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/member"
            className="text-xs text-ink-muted hover:text-ink font-medium"
          >
            Skip for now &amp; go to dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}

