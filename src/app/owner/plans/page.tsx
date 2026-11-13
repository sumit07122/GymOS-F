import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  Notice,
  Card,
  Badge,
  StatCard,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMembershipPlans } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  createMembershipPlanAction,
  setMembershipPlanStatusAction,
} from "../actions";
import {
  CreditCard,
  PlusCircle,
  Calendar,
  IndianRupee,
  Sparkles,
  Archive,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Membership plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, plans] = await Promise.all([
    searchParams,
    getMembershipPlans(me.gymId),
  ]);

  const activePlans = plans.filter((p) => p.active);
  const archivedPlans = plans.filter((p) => !p.active);

  return (
    <Shell
      title="Membership Plans"
      subtitle="Pricing tiers, durations, and member plan catalog"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error && (
        <Notice tone="danger">
          {error === "plan-status"
            ? "That membership plan could not be updated."
            : "Check the plan name, price, and duration values."}
        </Notice>
      )}

      {notice && (
        <Notice tone="ok">
          {notice === "plan-status-updated"
            ? "Plan status updated successfully."
            : "New membership plan created."}
        </Notice>
      )}

      {/* Top Stats Overview */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Plans"
          value={plans.length}
          icon={CreditCard}
          tone="brand"
          subtext="Catalog tiers configured"
        />
        <StatCard
          label="Active Plans"
          value={activePlans.length}
          icon={CheckCircle2}
          tone="success"
          subtext="Available for member assignment"
        />
        <StatCard
          label="Archived Plans"
          value={archivedPlans.length}
          icon={Archive}
          tone="neutral"
          subtext="Hidden from registration"
        />
      </section>

      {/* Main Grid: Create Plan & Existing Plans */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left: Create Plan Card */}
        <div className="lg:col-span-5">
          <Card className="p-6 sticky top-28">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <PlusCircle className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Create Plan</h2>
                <p className="text-xs text-ink-muted">Define a new pricing and duration tier</p>
              </div>
            </div>

            <form action={createMembershipPlanAction} className="space-y-4">
              <Field
                label="Plan name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. 1 Month Gold, Quarterly VIP"
              />

              <Field
                label="Price (INR)"
                name="priceInr"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="1500.00"
                icon={IndianRupee}
              />

              <Field
                label="Duration (in days)"
                name="durationDays"
                type="number"
                min="1"
                max="3650"
                step="1"
                required
                placeholder="30"
                icon={Calendar}
                hint="e.g. 30 days = 1 month, 90 days = quarter, 365 days = year"
              />

              <div className="pt-2">
                <Button type="submit" icon={Sparkles} className="w-full">
                  Create Membership Plan
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Existing Plans Grid */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <div>
                <h3 className="font-display text-base font-bold text-ink">Plan Catalog</h3>
                <p className="text-xs text-ink-muted">Configured membership tiers and rates</p>
              </div>
              <Badge tone="brand" size="sm">
                {plans.length} configured
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((plan) => {
                const dailyRate =
                  plan.durationDays > 0
                    ? Number(plan.priceInr) / plan.durationDays
                    : 0;

                return (
                  <Card
                    key={plan.id}
                    className={`p-5 flex flex-col justify-between transition-all ${
                      plan.active
                        ? "border-line bg-surface hover:shadow-md hover:border-brand/30"
                        : "border-line/60 bg-surface-elevated/60 opacity-75"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-display text-base font-bold text-ink">
                          {plan.name}
                        </h4>
                        <Badge
                          tone={plan.active ? "success" : "neutral"}
                          size="sm"
                          dot
                        >
                          {plan.active ? "Active" : "Archived"}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <span className="font-display text-2xl font-extrabold text-ink">
                          {formatInr(plan.priceInr)}
                        </span>
                        <span className="text-xs text-ink-muted block mt-0.5">
                          for {plan.durationDays} days (~₹{dailyRate.toFixed(0)}/day)
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-line/60 pt-3">
                      <form action={setMembershipPlanStatusAction} className="w-full">
                        <input type="hidden" name="planId" value={plan.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(!plan.active)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          type="submit"
                          icon={plan.active ? Archive : RefreshCw}
                          className="w-full text-xs"
                        >
                          {plan.active ? "Archive Plan" : "Reactivate Plan"}
                        </Button>
                      </form>
                    </div>
                  </Card>
                );
              })}

              {plans.length === 0 && (
                <div className="sm:col-span-2 py-12 text-center text-sm text-ink-muted">
                  No membership plans have been created yet. Use the form to configure your first plan.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
