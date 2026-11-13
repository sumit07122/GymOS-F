import { ADMIN_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { deriveGymAccess } from "@/server/subscriptions/access";
import { getAdminOverview } from "@/server/platform/admin";
import { getPendingRegistrationRequests } from "@/server/platform/registration";
import { formatInr } from "@/server/money";
import { activateOrRenewAction, addOwnerAction, approveRegistrationAction, createGymAction, createPlanAction, rejectRegistrationAction, resetOwnerPasswordAction, setGymStatusAction, setSubscriptionPlanStatusAction } from "./actions";

export const metadata = { title: "FIXIA Admin" };
export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; registrationError?: string }> }) {
  const me = await requirePlatformAdmin();
  const [{ error, notice, registrationError }, overview, requests] = await Promise.all([searchParams, getAdminOverview(), getPendingRegistrationRequests()]);
  const gyms = overview.gyms.map((gym) => ({
    ...gym,
    access: deriveGymAccess({ gymStatus: gym.status, subscriptions: gym.subscriptions, now: new Date() }),
    latest: gym.subscriptions[0],
  }));
  const active = gyms.filter((gym) => gym.access === "ACTIVE").length;
  const pending = gyms.filter((gym) => gym.access === "PENDING").length;
  const errors: Record<string, string> = {
    slug: "That gym URL is already in use.",
    email: "An account already uses that owner email.",
    invalid: "Check the gym and owner details, then try again.",
    plan: "Check the plan name, price, and duration.",
    subscription: "Choose an active plan and try again.",
    "gym-status": "The gym status could not be updated.",
    "plan-status": "The subscription plan status could not be updated.",
    owner: "The additional owner could not be added.",
    "owner-password": "Owner password could not be reset.",
  };
  const notices: Record<string, string> = {
    "gym-created": "Gym and owner account created. The gym is pending activation.",
    "plan-created": "Subscription plan created.",
    "subscription-updated": "Gym subscription activated or renewed.",
    "gym-status-updated": "Gym status updated.",
    "request-approved": "Request approved. Gym and owner account created pending subscription activation.",
    "request-rejected": "Registration request rejected.",
    "plan-status-updated": "Subscription plan status updated.",
    "owner-created": "Additional gym owner added.",
    "password-reset": "Owner password reset. Their existing sessions have been signed out.",
  };
  const registrationErrors: Record<string, string> = {
    slug: "That workspace URL is already in use.",
    password: "Set a temporary password to create a new owner account.",
    account: "The existing account is disabled or cannot be assigned as a gym owner.",
    request: "That request is no longer pending or could not be reviewed.",
  };

  return (
    <Shell title="FIXIA Admin" subtitle="Gym accounts and platform subscriptions" who={me.name} nav={ADMIN_NAV}>
      {error && errors[error] && <Notice>{errors[error]}</Notice>}
      {notice && notices[notice] && <Notice tone="ok">{notices[notice]}</Notice>}

      <section aria-label="Platform overview" className="grid gap-4 sm:grid-cols-3">
        {[["Registered gyms", gyms.length], ["Operational", active], ["Awaiting activation", pending]].map(([label, count]) => (
          <div key={label} className="neo-card p-5">
            <p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-2xl font-bold">{count}</p>
          </div>
        ))}
      </section>

      <section className="neo-card p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-xl font-bold">Registration requests</h2><p className="mt-1 text-sm text-muted">Review owner details, then create the workspace and account.</p></div><span className="text-sm text-muted">{requests.length} pending</span></div>
        {registrationError && registrationErrors[registrationError] && <div className="mt-4"><Notice>{registrationErrors[registrationError]}</Notice></div>}
        <div className="mt-4 divide-y divide-line border-y border-line">
          {requests.map((request) => {
            const slug = request.gymName.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "new-gym";
            return <article key={request.id} className="grid gap-5 py-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div><h3 className="font-semibold">{request.gymName}</h3><p className="mt-1 text-sm text-muted">{request.ownerName} · {request.ownerEmail}</p><p className="text-sm text-muted">{request.ownerPhone} · {request.city || "City not provided"}</p>{request.address && <p className="mt-2 text-sm text-muted">{request.address}</p>}{request.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{request.notes}</p>}<p className="mt-2 text-xs text-muted">Submitted {date(request.createdAt)}</p></div>
              <div className="flex flex-wrap items-end gap-3">
                <form action={approveRegistrationAction} className="grid flex-1 gap-3 sm:grid-cols-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Field label="Workspace slug" name="slug" defaultValue={slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                  <Field label="Temporary password for a new owner" name="ownerPassword" type="password" minLength={10} maxLength={128} hint="Leave blank to link the email to an existing account." />
                  <div className="sm:col-span-2"><Button type="submit">Approve and create pending gym</Button></div>
                </form>
                <form action={rejectRegistrationAction}><input type="hidden" name="requestId" value={request.id} /><Button type="submit" variant="ghost">Reject</Button></form>
              </div>
            </article>;
          })}
          {requests.length === 0 && <p className="py-6 text-sm text-muted">No pending registration requests.</p>}
        </div>
      </section>

      <section className="neo-card grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Register a gym</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Creates a pending workspace and its first owner login.</p>
          <form action={createGymAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" name="name" required maxLength={100} />
            <Field label="Workspace URL slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" hint="Lowercase letters, numbers, and hyphens." />
            <Field label="Gym phone" name="phone" type="tel" />
            <Field label="City" name="city" />
            <div className="sm:col-span-2"><Field label="Address" name="address" /></div>
            <div className="sm:col-span-2 mt-2 border-t border-line pt-4"><h3 className="font-semibold">Owner login</h3></div>
            <Field label="Owner name" name="ownerName" required />
            <Field label="Owner email" name="ownerEmail" type="email" required />
            <div className="sm:col-span-2"><Field label="Temporary password" name="ownerPassword" type="password" minLength={10} maxLength={128} required hint="At least 10 characters. Share it with the owner securely." /></div>
            <div className="sm:col-span-2"><Button type="submit">Create pending gym</Button></div>
          </form>
        </div>

        <div className="border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h2 className="font-display text-xl font-bold">Subscription plans</h2>
          <p className="mb-5 mt-1 text-sm text-muted">FIXIA sets the price and duration for each plan.</p>
          <form action={createPlanAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Plan name" name="name" required maxLength={80} /></div>
            <Field label="Price (INR)" name="priceInr" type="number" min="0" step="0.01" required />
            <Field label="Duration (days)" name="durationDays" type="number" min="1" max="3650" step="1" required />
            <div className="sm:col-span-2"><Button type="submit">Add plan</Button></div>
          </form>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {overview.plans.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{plan.name} · {plan.durationDays} days · <strong>{formatInr(plan.priceInr)}</strong>{plan.active ? "" : " · archived"}</span><form action={setSubscriptionPlanStatusAction}><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="active" value={String(!plan.active)} /><Button variant="ghost" type="submit" className="h-8 px-3 text-xs">{plan.active ? "Archive" : "Reactivate"}</Button></form></li>)}
            {overview.plans.length === 0 && <li className="py-3 text-sm text-muted">No subscription plans yet.</li>}
          </ul>
        </div>
      </section>

      <section className="neo-card p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="font-display text-xl font-bold">Gym accounts</h2><p className="mt-1 text-sm text-muted">Activation and renewal history stays attached to each gym.</p></div>
          <span className="text-sm text-muted">{gyms.length} total</span>
        </div>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {gyms.map((gym) => (
            <article key={gym.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-semibold">{gym.name}</h3><span className="text-sm text-muted">/{gym.slug}</span>
                  <span className="rounded-sm bg-soft px-2 py-0.5 text-xs font-semibold text-deeper">{gym.access}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{gym.city || "City not set"} · {gym.gymUsers.map((entry) => `${entry.user.name} (${entry.user.email ?? "no email"})`).join(", ") || "No owner assigned"}</p>
                <p className="mt-1 text-xs text-muted">{gym.latest ? `${gym.latest.plan.name} · ends ${date(gym.latest.endsAt)}` : "No subscription"}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {overview.plans.some((plan) => plan.active) && (
                  <form action={activateOrRenewAction} className="flex items-end gap-2">
                    <input type="hidden" name="gymId" value={gym.id} />
                    <label className="grid gap-1 text-xs font-medium text-muted">Plan<select name="planId" required className="h-10 min-w-36 rounded-lg border border-line bg-surface px-2 text-sm text-ink">{overview.plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
                    <Button type="submit" className="h-10 px-3 text-sm">{gym.access === "ACTIVE" ? "Renew" : "Activate"}</Button>
                  </form>
                )}
                {gym.status !== "SUSPENDED" ? (
                  <form action={setGymStatusAction}><input type="hidden" name="gymId" value={gym.id} /><input type="hidden" name="suspended" value="true" /><Button type="submit" variant="ghost" className="h-10 px-3 text-sm">Suspend</Button></form>
                ) : (
                  <form action={setGymStatusAction}><input type="hidden" name="gymId" value={gym.id} /><input type="hidden" name="suspended" value="false" /><Button type="submit" variant="ghost" className="h-10 px-3 text-sm">Reactivate</Button></form>
                )}
              </div>
              <details className="lg:col-span-2"><summary className="cursor-pointer text-sm font-medium text-deep">Manage gym owners</summary>
                <div className="mt-4 grid gap-6 border-l-2 border-line pl-4 md:grid-cols-2">
                  <div className="space-y-4">{gym.gymUsers.map((entry) => <div key={entry.userId} className="border-b border-line pb-3"><p className="text-sm font-semibold">{entry.user.name}</p><p className="text-xs text-muted">{entry.user.email ?? "No email"}</p><form action={resetOwnerPasswordAction} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="gymId" value={gym.id} /><input type="hidden" name="ownerUserId" value={entry.userId} /><label className="grid gap-1 text-xs">New temporary password<input name="password" type="password" minLength={10} maxLength={128} required className="h-9 rounded-lg border border-line bg-surface px-2 text-sm" /></label><Button variant="ghost" type="submit" className="h-9 px-3 text-xs">Reset password</Button></form></div>)}</div>
                  <form action={addOwnerAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="gymId" value={gym.id} /><Field label="Owner name" name="name" required maxLength={80} /><Field label="Owner email" name="email" type="email" required /><div className="sm:col-span-2"><Field label="Temporary password for a new account" name="password" type="password" minLength={10} maxLength={128} hint="Leave blank to link an existing account." /></div><div className="sm:col-span-2"><Button variant="ghost" type="submit">Add owner</Button></div></form>
                </div>
              </details>
            </article>
          ))}
          {gyms.length === 0 && <p className="py-8 text-sm text-muted">No gyms have been registered.</p>}
        </div>
      </section>

      <section className="neo-card p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold">Recent platform activity</h2>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {overview.activity.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.action}</span><time className="text-muted" dateTime={item.createdAt.toISOString()}>{date(item.createdAt)}</time></li>)}
          {overview.activity.length === 0 && <li className="py-3 text-sm text-muted">No platform events yet.</li>}
        </ul>
      </section>
    </Shell>
  );
}
