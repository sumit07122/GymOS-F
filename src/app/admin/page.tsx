import { ADMIN_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  SelectField,
  Notice,
  Card,
  Badge,
  StatCard,
  Avatar,
} from "@/components/ui";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { deriveGymAccess } from "@/server/subscriptions/access";
import { getAdminOverview } from "@/server/platform/admin";
import { getPendingRegistrationRequests } from "@/server/platform/registration";
import { formatInr } from "@/server/money";
import {
  activateOrRenewAction,
  addOwnerAction,
  approveRegistrationAction,
  createGymAction,
  createPlanAction,
  rejectRegistrationAction,
  resetOwnerPasswordAction,
  setGymStatusAction,
  setSubscriptionPlanStatusAction,
} from "./actions";
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  CreditCard,
  UserCheck,
  Activity,
  KeyRound,
  RefreshCw,
  Archive,
  UserPlus,
} from "lucide-react";

export const metadata = { title: "FIXIA Admin" };
export const dynamic = "force-dynamic";

const date = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    registrationError?: string;
  }>;
}) {
  const me = await requirePlatformAdmin();
  const [{ error, notice, registrationError }, overview, requests] =
    await Promise.all([
      searchParams,
      getAdminOverview(),
      getPendingRegistrationRequests(),
    ]);

  const gyms = overview.gyms.map((gym) => ({
    ...gym,
    access: deriveGymAccess({
      gymStatus: gym.status,
      subscriptions: gym.subscriptions,
      now: new Date(),
    }),
    latest: gym.subscriptions[0],
  }));

  const activeCount = gyms.filter((gym) => gym.access === "ACTIVE").length;
  const pendingCount = gyms.filter((gym) => gym.access === "PENDING").length;

  const errors: Record<string, string> = {
    slug: "That gym URL slug is already in use.",
    email: "An account already exists with that owner email.",
    invalid: "Check the gym and owner details, then try again.",
    plan: "Check the plan name, price, and duration values.",
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
    "request-approved":
      "Request approved. Gym and owner account created pending subscription activation.",
    "request-rejected": "Registration request rejected.",
    "plan-status-updated": "Subscription plan status updated.",
    "owner-created": "Additional gym owner added.",
    "password-reset":
      "Owner password reset. Their existing sessions have been signed out.",
  };

  const registrationErrors: Record<string, string> = {
    slug: "That workspace URL slug is already in use.",
    password: "Set a temporary password to create a new owner account.",
    account:
      "The existing account is disabled or cannot be assigned as a gym owner.",
    request: "That request is no longer pending or could not be reviewed.",
  };

  return (
    <Shell
      title="FIXIA Platform Command Center"
      subtitle="Multi-tenant gym accounts, subscriptions, and platform governance"
      who={me.name}
      nav={ADMIN_NAV}
    >
      {/* Alert Notices */}
      {error && errors[error] && <Notice tone="danger">{errors[error]}</Notice>}
      {notice && notices[notice] && <Notice tone="ok">{notices[notice]}</Notice>}

      {/* Platform KPIs */}
      <section aria-label="Platform overview" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Registered Gyms"
          value={gyms.length}
          icon={Building2}
          tone="brand"
          subtext="Total onboarded workspaces"
        />
        <StatCard
          label="Active & Operational"
          value={activeCount}
          icon={CheckCircle2}
          tone="success"
          subtext="Valid active subscriptions"
        />
        <StatCard
          label="Awaiting Activation"
          value={pendingCount}
          icon={Clock}
          tone="warning"
          subtext="Pending payment or admin review"
        />
      </section>

      {/* Pending Registration Requests */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning">
              <Clock className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Pending Registration Requests
              </h2>
              <p className="text-xs text-ink-muted">
                Review owner submissions, assign URL slug, and provision workspace
              </p>
            </div>
          </div>
          <Badge tone="warning" size="sm">
            {requests.length} pending
          </Badge>
        </div>

        {registrationError && registrationErrors[registrationError] && (
          <div className="mb-4">
            <Notice tone="danger">{registrationErrors[registrationError]}</Notice>
          </div>
        )}

        <div className="space-y-4 divide-y divide-line/60">
          {requests.map((request) => {
            const slug =
              request.gymName
                .normalize("NFKD")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 60) || "new-gym";

            return (
              <div
                key={request.id}
                className="grid gap-5 pt-4 first:pt-0 lg:grid-cols-12 items-start"
              >
                <div className="lg:col-span-5 space-y-1 text-sm">
                  <h3 className="font-display font-bold text-base text-ink">
                    {request.gymName}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {request.ownerName} &middot;{" "}
                    <strong className="text-ink">{request.ownerEmail}</strong>
                  </p>
                  <p className="text-xs text-ink-muted">
                    {request.ownerPhone} &middot; {request.city || "City not provided"}
                  </p>
                  {request.address && (
                    <p className="text-xs text-ink-muted">{request.address}</p>
                  )}
                  {request.notes && (
                    <p className="mt-2 text-xs bg-surface-elevated p-2 rounded-lg border border-line text-ink">
                      &ldquo;{request.notes}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-ink-subtle mt-1">
                    Submitted on {date(request.createdAt)}
                  </p>
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-end gap-3">
                  <form
                    action={approveRegistrationAction}
                    className="grid flex-1 gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    <Field
                      label="Workspace slug"
                      name="slug"
                      defaultValue={slug}
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    />
                    <Field
                      label="Temporary password"
                      name="ownerPassword"
                      type="password"
                      minLength={10}
                      maxLength={128}
                      hint="Leave blank if email already has account"
                    />
                    <div className="sm:col-span-2">
                      <Button type="submit" size="sm" className="w-full">
                        Approve & Provision Gym
                      </Button>
                    </div>
                  </form>

                  <form action={rejectRegistrationAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button variant="ghost" size="sm" type="submit" className="text-danger">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}

          {requests.length === 0 && (
            <div className="py-8 text-center text-sm text-ink-muted">
              No pending registration requests waiting for review.
            </div>
          )}
        </div>
      </Card>

      {/* Manual Gym Registration & Platform SaaS Subscription Plans */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Register Gym Form */}
        <div className="lg:col-span-7">
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  Provision a New Gym
                </h2>
                <p className="text-xs text-ink-muted">
                  Create a new gym workspace and assign the initial owner login
                </p>
              </div>
            </div>

            <form action={createGymAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gym business name" name="name" required maxLength={100} />
                <Field
                  label="Workspace URL slug"
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="e.g. matrix-gym"
                  hint="Lowercase letters, numbers, and hyphens"
                />
                <Field label="Gym contact phone" name="phone" type="tel" />
                <Field label="City" name="city" />
                <div className="sm:col-span-2">
                  <Field label="Address" name="address" />
                </div>
              </div>

              <div className="border-t border-line/60 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Initial Owner Account
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Owner full name" name="ownerName" required />
                  <Field label="Owner email" name="ownerEmail" type="email" required />
                  <div className="sm:col-span-2">
                    <Field
                      label="Temporary password"
                      name="ownerPassword"
                      type="password"
                      minLength={10}
                      maxLength={128}
                      required
                      hint="At least 10 characters. Securely share with gym owner."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" icon={PlusCircle} className="w-full">
                  Create Pending Gym Workspace
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Subscription Plans Manager */}
        <div className="lg:col-span-5">
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  SaaS Plans & Pricing
                </h2>
                <p className="text-xs text-ink-muted">Platform-level tiers for gyms</p>
              </div>
            </div>

            <form action={createPlanAction} className="space-y-3">
              <Field
                label="Plan name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. Annual Growth Tier"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Price (INR)"
                  name="priceInr"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="9999.00"
                />
                <Field
                  label="Duration (days)"
                  name="durationDays"
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  required
                  placeholder="365"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                Add Platform Plan
              </Button>
            </form>

            <div className="mt-6 border-t border-line pt-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Active Catalog ({overview.plans.length})
              </span>
              <div className="divide-y divide-line/60">
                {overview.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between py-2.5 text-xs first:pt-1 last:pb-1"
                  >
                    <div>
                      <strong className="text-ink">{plan.name}</strong>
                      <span className="text-ink-muted block mt-0.5">
                        {plan.durationDays} days &middot; {formatInr(plan.priceInr)}
                      </span>
                    </div>
                    <form action={setSubscriptionPlanStatusAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(!plan.active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        type="submit"
                        className="h-7 px-2 text-[11px]"
                      >
                        {plan.active ? "Archive" : "Reactivate"}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Gym Accounts Directory Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated/40">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-brand" />
            <h3 className="font-display text-base font-bold text-ink">
              Gym Accounts Register
            </h3>
          </div>
          <Badge tone="brand" size="sm">
            {gyms.length} total workspaces
          </Badge>
        </div>

        <div className="divide-y divide-line/60">
          {gyms.map((gym) => (
            <div key={gym.id} className="p-6 transition-colors hover:bg-surface-elevated/40">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h4 className="font-display text-lg font-bold text-ink">
                      {gym.name}
                    </h4>
                    <span className="text-xs font-mono text-ink-muted bg-surface-elevated px-2 py-0.5 rounded border border-line">
                      /{gym.slug}
                    </span>
                    <Badge
                      tone={
                        gym.access === "ACTIVE"
                          ? "success"
                          : gym.access === "PENDING"
                          ? "warning"
                          : "danger"
                      }
                      size="sm"
                      dot
                    >
                      {gym.access}
                    </Badge>
                  </div>

                  <p className="text-xs text-ink-muted mt-1">
                    {gym.city || "City not set"} &middot; Owners:{" "}
                    {gym.gymUsers
                      .map(
                        (entry) =>
                          `${entry.user.name} (${entry.user.email ?? "no email"})`
                      )
                      .join(", ") || "No owner assigned"}
                  </p>

                  <p className="text-xs text-brand font-medium mt-1">
                    {gym.latest
                      ? `${gym.latest.plan.name} &middot; Subscription ends ${date(
                          gym.latest.endsAt
                        )}`
                      : "No subscription plan assigned yet"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {overview.plans.some((plan) => plan.active) && (
                    <form action={activateOrRenewAction} className="flex items-center gap-2">
                      <input type="hidden" name="gymId" value={gym.id} />
                      <select
                        name="planId"
                        required
                        className="h-9 rounded-xl border border-line bg-surface px-2.5 text-xs text-ink focus:border-brand focus:outline-none"
                      >
                        {overview.plans
                          .filter((plan) => plan.active)
                          .map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} ({plan.durationDays}d)
                            </option>
                          ))}
                      </select>
                      <Button type="submit" size="sm" className="h-9 text-xs">
                        {gym.access === "ACTIVE" ? "Renew" : "Activate"}
                      </Button>
                    </form>
                  )}

                  {gym.status !== "SUSPENDED" ? (
                    <form action={setGymStatusAction}>
                      <input type="hidden" name="gymId" value={gym.id} />
                      <input type="hidden" name="suspended" value="true" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-danger"
                      >
                        Suspend
                      </Button>
                    </form>
                  ) : (
                    <form action={setGymStatusAction}>
                      <input type="hidden" name="gymId" value={gym.id} />
                      <input type="hidden" name="suspended" value="false" />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        className="h-9 text-xs"
                      >
                        Reactivate
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Owner Management Collapsible */}
              <details className="mt-4 border-t border-line/60 pt-3">
                <summary className="cursor-pointer text-xs font-bold text-brand hover:underline flex items-center gap-1.5">
                  <UserPlus className="size-3.5" />
                  Manage Gym Owners & Password Resets
                </summary>

                <div className="mt-4 grid gap-6 border-l-2 border-brand/30 pl-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Existing Owners
                    </span>
                    {gym.gymUsers.map((entry) => (
                      <div
                        key={entry.userId}
                        className="rounded-xl border border-line bg-surface p-3 space-y-2"
                      >
                        <p className="text-sm font-bold text-ink">{entry.user.name}</p>
                        <p className="text-xs text-ink-muted">
                          {entry.user.email ?? "No email"}
                        </p>
                        <form
                          action={resetOwnerPasswordAction}
                          className="flex flex-wrap items-end gap-2 pt-1"
                        >
                          <input type="hidden" name="gymId" value={gym.id} />
                          <input
                            type="hidden"
                            name="ownerUserId"
                            value={entry.userId}
                          />
                          <input
                            name="password"
                            type="password"
                            minLength={10}
                            maxLength={128}
                            required
                            placeholder="New temp password (10+)"
                            className="h-8 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            type="submit"
                            icon={KeyRound}
                            className="h-8 text-xs"
                          >
                            Reset Password
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                      Add Additional Owner
                    </span>
                    <form action={addOwnerAction} className="space-y-3 bg-surface p-4 rounded-xl border border-line">
                      <input type="hidden" name="gymId" value={gym.id} />
                      <Field label="Owner name" name="name" required maxLength={80} />
                      <Field label="Owner email" name="email" type="email" required />
                      <Field
                        label="Temporary password"
                        name="password"
                        type="password"
                        minLength={10}
                        maxLength={128}
                        hint="Leave blank to link existing account"
                      />
                      <Button variant="secondary" size="sm" type="submit" className="w-full">
                        Add Owner to Gym
                      </Button>
                    </form>
                  </div>
                </div>
              </details>
            </div>
          ))}

          {gyms.length === 0 && (
            <div className="py-12 text-center text-sm text-ink-muted">
              No gyms have been onboarded yet on the platform.
            </div>
          )}
        </div>
      </Card>

      {/* Platform Activity Feed */}
      <Card className="p-6">
        <div className="flex items-center gap-2 border-b border-line pb-4 mb-4">
          <Activity className="size-4 text-brand" />
          <h2 className="font-display text-base font-bold text-ink">
            Recent Platform Audit Trail
          </h2>
        </div>
        <div className="divide-y divide-line/60">
          {overview.activity.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 text-xs first:pt-1 last:pb-1"
            >
              <span className="text-ink font-medium">{item.action}</span>
              <time dateTime={item.createdAt.toISOString()} className="text-ink-muted">
                {date(item.createdAt)}
              </time>
            </div>
          ))}
          {overview.activity.length === 0 && (
            <div className="py-6 text-center text-sm text-ink-muted">
              No platform events recorded yet.
            </div>
          )}
        </div>
      </Card>
    </Shell>
  );
}
