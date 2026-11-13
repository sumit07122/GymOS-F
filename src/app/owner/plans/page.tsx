import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMembershipPlans } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { createMembershipPlanAction, setMembershipPlanStatusAction } from "../actions";

export const metadata = { title: "Membership plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, plans] = await Promise.all([searchParams, getMembershipPlans(me.gymId)]);
  return (
    <Shell title="Membership plans" subtitle="Set gym pricing and membership duration" who={me.name} nav={OWNER_NAV}>
      {error && <Notice>{error === "plan-status" ? "That plan could not be updated." : "Check the plan name, price, and duration."}</Notice>}
      {notice && <Notice tone="ok">{notice === "plan-status-updated" ? "Plan status updated." : "Membership plan created."}</Notice>}
      <section className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Create plan</h2>
          <form action={createMembershipPlanAction} className="mt-4 grid gap-4">
            <Field label="Plan name" name="name" required maxLength={80} placeholder="Monthly" />
            <Field label="Price (INR)" name="priceInr" type="number" min="0" step="0.01" required />
            <Field label="Duration (days)" name="durationDays" type="number" min="1" max="3650" step="1" required />
            <Button type="submit">Create membership plan</Button>
          </form>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Plans</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {plans.map((plan) => <article key={plan.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div><h3 className="font-semibold">{plan.name} {plan.active ? <span className="text-xs font-medium text-deep">ACTIVE</span> : <span className="text-xs font-medium text-muted">ARCHIVED</span>}</h3><p className="mt-1 text-sm text-muted">{plan.durationDays} days · {formatInr(plan.priceInr)}</p></div>
              <form action={setMembershipPlanStatusAction}><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="active" value={String(!plan.active)} /><Button variant="ghost" type="submit" className="h-9 px-3 text-sm">{plan.active ? "Archive" : "Reactivate"}</Button></form>
            </article>)}
            {plans.length === 0 && <p className="py-6 text-sm text-muted">Create a plan to assign memberships.</p>}
          </div>
        </div>
      </section>
    </Shell>
  );
}