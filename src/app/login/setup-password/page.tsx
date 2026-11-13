import { requireSignedIn } from "@/server/auth/guards";
import { SetupPasswordForm } from "./setup-password-form";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Set Your New Password · FIXIA GymOS",
  description: "Update your temporary password to secure your GymOS account.",
};

export default async function SetupPasswordPage() {
  await requireSignedIn();

  return (
    <main className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Set Your New Password
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your account was provisioned with a temporary password. Choose a secure, private password to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          <SetupPasswordForm />
        </div>
      </div>
    </main>
  );
}

