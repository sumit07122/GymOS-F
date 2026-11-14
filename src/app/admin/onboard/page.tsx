import { requirePlatformAdmin } from "@/server/auth/guards";
import { getOnboardingProgress, listActiveSubscriptionPlans } from "@/server/admin/onboarding";
import { OnboardWizard } from "./onboard-wizard";
import { ADMIN_NAV, Shell } from "@/components/shell";
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
  const me = await requirePlatformAdmin();
  const params = await searchParams;

  let progress = null;
  if (params.gymId) {
    progress = await getOnboardingProgress(params.gymId);
  }

  // Fetch available subscription plans for workspace activation
  const subPlans = await listActiveSubscriptionPlans();

  return (
    <Shell
      title={progress?.gym ? `Onboarding: ${progress.gym.name}` : "Onboard New Gym"}
      subtitle="Managed Onboarding Wizard"
      who={me.name}
      nav={ADMIN_NAV}
      actions={
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink hover:bg-canvas transition-colors shadow-xs"
        >
          <ArrowLeft className="size-3.5" /> Back to Overview
        </Link>
      }
    >
      <div className="space-y-6">
        {params.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {params.error}
          </div>
        )}

        {params.notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {params.notice === "gym-profile-created"
              ? "Gym profile and plans created successfully! Proceed with member import."
              : params.notice}
          </div>
        )}

        {/* Interactive Guided Wizard */}
        <OnboardWizard
          initialGymId={params.gymId}
          initialStep={params.step}
          progress={progress}
          subscriptionPlans={subPlans.map((p) => ({
            ...p,
            priceInr: Number(p.priceInr),
          }))}
        />
      </div>
    </Shell>
  );
}
