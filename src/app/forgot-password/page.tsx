import { ForgotPasswordForm } from "./forgot-password-form";
import { KeyRound } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Forgot Password · FIXIA GymOS",
  description: "Recover access to your FIXIA GymOS account.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm">
          <KeyRound className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Reset Your Password
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter your registered Indian mobile number to receive a secure password reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          <ForgotPasswordForm />
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-xs text-ink-muted hover:text-ink font-medium"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

