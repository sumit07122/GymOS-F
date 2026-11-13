import { requirePlatformAdmin } from "@/server/auth/guards";
import { getOnboardingProgress, listActiveSubscriptionPlans } from "@/server/admin/onboarding";
import { OnboardWizard } from "./onboard-wizard";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export const metadata = {
  title: "Managed Gym Onboarding · FIXIA Admin",
  description: "Guided onboarding wizard for new gyms, plans, and bulk member provisioning.",
};

export default async function OnboardGymPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string; step?: string; error?: string; notice?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;

  let progress = null;
  if (params.gymId) {
    progress = await getOnboardingProgress(params.gymId);
  }

  // Fetch available subscription plans for workspace activation
  const subPlans = await listActiveSubscriptionPlans();

  return (
    <main className="min-h-screen bg-canvas p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-ink hover:bg-canvas transition-colors shadow-xs"
              title="Return to FIXIA Admin"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">
                  <Building2 className="size-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  Managed Onboarding Engine
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {progress?.gym ? `Onboarding: ${progress.gym.name}` : "Onboard New Gym"}
              </h1>
            </div>
          </div>

          {progress?.gym && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-ink-muted">Workspace:</span>
              <span className="font-mono bg-canvas-subtle px-2 py-1 rounded-md border border-line">
                {progress.gym.slug}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                  progress.isActivated ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {progress.isActivated ? "Active" : "Draft / Onboarding"}
              </span>
            </div>
          )}
        </div>

        {params.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {params.error}
          </div>
        )}

        {params.notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {params.notice === "gym-profile-created" ? "Gym profile and plans created successfully! Proceed with member import." : params.notice}
          </div>
        )}

        {/* Interactive Guided Wizard */}
        <OnboardWizard
          initialGymId={params.gymId}
          initialStep={params.step}
          progress={progress}
          subscriptionPlans={subPlans.map(p => ({
            ...p,
            priceInr: Number(p.priceInr)
          }))}
        />
      </div>
    </main>
  );
}

