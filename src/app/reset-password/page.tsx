import { ResetPasswordForm } from "./reset-password-form";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Set New Password · FIXIA GymOS",
  description: "Create a new password for your FIXIA GymOS account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm">
          <LockKeyhole className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Choose a New Password
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter and confirm your new secure password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          <ResetPasswordForm token={token ?? ""} />
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

