import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  SelectField,
  Notice,
  Card,
  Badge,
  Avatar,
  StatCard,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberDetails, getMembershipPlans } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  assignMembershipAction,
  recordPaymentAction,
  setMemberStatusAction,
  updateMemberNameAction,
} from "../../actions";
import {
  ArrowLeft,
  CreditCard,
  CalendarCheck,
  IndianRupee,
  Phone,
  UserCheck,
  AlertCircle,
  Receipt,
  Clock,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

const date = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);

export default async function MemberDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ userId }, { error, notice }] = await Promise.all([params, searchParams]);
  const [member, plans] = await Promise.all([
    getMemberDetails(me.gymId, userId),
    getMembershipPlans(me.gymId),
  ]);

  if (!member) notFound();

  const errors: Record<string, string> = {
    membership: "The membership could not be assigned. Check that the selected plan is active.",
    payment: "Payment was not recorded. Check the amount and outstanding balance.",
    "member-status": "Member status could not be updated.",
    "member-profile": "Member name could not be saved.",
  };

  const notices: Record<string, string> = {
    "member-added": "Member profile created.",
    "membership-assigned": "Membership assigned or renewed.",
    "payment-recorded": "Payment recorded.",
    "member-status-updated": "Member status updated.",
    "member-profile-updated": "Member profile updated.",
  };

  const currentTime = new Date();
  const memberName = member.displayName ?? member.user.name;

  // Calculate total outstanding balance
  let totalDue = new Prisma.Decimal(0);
  for (const m of member.memberships) {
    if (m.status === "ACTIVE") {
      const paid = m.payments
        .filter((p) => !p.voidedAt)
        .reduce((sum, p) => sum.plus(p.amountInr), new Prisma.Decimal(0));
      const due = Prisma.Decimal.max(m.priceInr.minus(paid), 0);
      totalDue = totalDue.plus(due);
    }
  }

  return (
    <Shell
      title={memberName}
      subtitle={`Member #${member.user.phone ?? "ID"}`}
      who={me.name}
      nav={OWNER_NAV}
      actions={
        <Link href="/owner/members">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Back to members
          </Button>
        </Link>
      }
    >
      {/* Alert Notices */}
      {error && errors[error] && <Notice tone="danger">{errors[error]}</Notice>}
      {notice && notices[notice] && <Notice tone="ok">{notices[notice]}</Notice>}

      {/* Member Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div className="flex items-center gap-4">
            <Avatar name={memberName} size="lg" />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl font-bold text-ink">{memberName}</h2>
                <Badge
                  tone={member.status === "ACTIVE" ? "success" : "danger"}
                  size="sm"
                  dot
                >
                  {member.status === "ACTIVE" ? "Active Member" : "Deactivated"}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-ink-muted mt-1">
                <Phone className="size-3.5 text-brand" />
                <span>{member.user.phone}</span>
                <span className="text-line">&bull;</span>
                <span>Login Mobile (SMS OTP)</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={setMemberStatusAction}>
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="active" value={String(member.status !== "ACTIVE")} />
              <Button
                variant={member.status === "ACTIVE" ? "outline" : "primary"}
                size="sm"
                type="submit"
              >
                {member.status === "ACTIVE" ? "Deactivate Account" : "Reactivate Account"}
              </Button>
            </form>
          </div>
        </div>

        {/* Quick Edit Name Form */}
        <div className="mt-5 pt-1">
          <form
            action={updateMemberNameAction}
            className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-lg"
          >
            <input type="hidden" name="userId" value={userId} />
            <div className="flex-1">
              <Field
                label="Edit display name"
                name="name"
                defaultValue={memberName}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              Update Name
            </Button>
          </form>
        </div>
      </Card>

      {/* Member Quick KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Check-ins"
          value={member.attendance.length}
          icon={CalendarCheck}
          tone="brand"
          subtext="Total gym visits logged"
        />
        <StatCard
          label="Total Memberships"
          value={member.memberships.length}
          icon={CreditCard}
          tone="brand"
          subtext="Lifetime plan assignments"
        />
        <StatCard
          label="Total Balance Due"
          value={formatInr(totalDue)}
          icon={IndianRupee}
          tone={totalDue.gt(0) ? "warning" : "success"}
          subtext={totalDue.gt(0) ? "Payment collection pending" : "All plans fully settled"}
        />
      </section>

      {/* Plan Assignment & History Two-Column Section */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Assign / Renew Plan */}
        <div className="lg:col-span-5">
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">Assign or Renew Plan</h3>
                <p className="text-xs text-ink-muted">Automatic consecutive duration calculation</p>
              </div>
            </div>

            <form action={assignMembershipAction} className="space-y-4">
              <input type="hidden" name="userId" value={userId} />

              <SelectField label="Select membership tier" name="planId" required>
                {plans
                  .filter((p) => p.active)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} &middot; {plan.durationDays} days &middot; {formatInr(plan.priceInr)}
                    </option>
                  ))}
              </SelectField>

              <div className="rounded-xl border border-line bg-surface-elevated p-3.5 text-xs text-ink-muted space-y-1">
                <p className="font-bold text-ink">Renewal Logic:</p>
                <p>If the member already has an active plan, this new assignment begins the day after the current plan expires.</p>
              </div>

              <Button
                type="submit"
                icon={Sparkles}
                className="w-full"
                disabled={!plans.some((p) => p.active)}
              >
                Assign Membership
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Membership History & Outstanding Payments */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">Membership History</h3>
              </div>
              <Badge tone="neutral" size="sm">
                {member.memberships.length} recorded
              </Badge>
            </div>

            <div className="space-y-5 divide-y divide-line/60">
              {member.memberships.map((membership) => {
                const paid = membership.payments
                  .filter((p) => !p.voidedAt)
                  .reduce((sum, p) => sum.plus(p.amountInr), new Prisma.Decimal(0));
                const due = Prisma.Decimal.max(membership.priceInr.minus(paid), 0);
                const isCurrent =
                  membership.status === "ACTIVE" &&
                  membership.startsAt <= currentTime &&
                  currentTime < membership.endsAt;

                const isUpcoming = membership.startsAt > currentTime;

                return (
                  <div key={membership.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-display font-bold text-sm text-ink">
                          {membership.plan.name}
                        </span>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {date(membership.startsAt)} &ndash; {date(membership.endsAt)} &middot;{" "}
                          <span className="font-semibold text-ink">
                            {formatInr(membership.priceInr)}
                          </span>
                        </p>
                      </div>

                      <Badge
                        tone={
                          isCurrent
                            ? "success"
                            : isUpcoming
                            ? "warning"
                            : membership.status === "CANCELLED"
                            ? "danger"
                            : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {isCurrent
                          ? "Current"
                          : isUpcoming
                          ? "Upcoming"
                          : membership.status === "CANCELLED"
                          ? "Cancelled"
                          : "Expired"}
                      </Badge>
                    </div>

                    {/* Due Notice & Payment Collection Form */}
                    {membership.status === "ACTIVE" && due.gt(0) && (
                      <div className="mt-4 rounded-2xl border border-warning/30 bg-warning-soft/40 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#9c6114]">
                            Balance Due: {formatInr(due)}
                          </span>
                          <span className="text-xs text-ink-muted">
                            Paid: {formatInr(paid)}
                          </span>
                        </div>

                        <form
                          action={recordPaymentAction}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <input type="hidden" name="userId" value={userId} />
                          <input type="hidden" name="membershipId" value={membership.id} />

                          <Field
                            label="Amount to collect (INR)"
                            name="amountInr"
                            type="number"
                            min="0.01"
                            max={due.toFixed(2)}
                            defaultValue={due.toFixed(2)}
                            step="0.01"
                            required
                          />

                          <SelectField label="Payment method" name="method">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </SelectField>

                          <div className="sm:col-span-2">
                            <Field
                              label="Transaction reference (optional)"
                              name="reference"
                              placeholder="e.g. UPI Ref / Cash register #4"
                              maxLength={120}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Button type="submit" size="sm" icon={IndianRupee}>
                              Record Payment ({formatInr(due)})
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Paid Receipts History */}
                    {membership.payments.length > 0 && (
                      <div className="mt-3 rounded-xl border border-line bg-surface-elevated/40 p-3 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          Payment Transactions
                        </span>
                        {membership.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between text-xs py-1 border-b border-line/40 last:border-0"
                          >
                            <span className="font-semibold text-ink">
                              {formatInr(payment.amountInr)} &middot; {payment.method}
                              {payment.voidedAt && (
                                <span className="ml-1.5 text-danger font-bold">(VOIDED)</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 text-ink-muted">
                              <span>{date(payment.createdAt)}</span>
                              <Link
                                href={`/receipts/${payment.id}`}
                                className="flex items-center gap-1 font-bold text-brand hover:underline"
                              >
                                <Receipt className="size-3" /> Receipt
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {member.memberships.length === 0 && (
                <div className="py-8 text-center text-sm text-ink-muted">
                  No memberships have been assigned to this member yet.
                </div>
              )}
            </div>
          </Card>

          {/* Attendance History */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">Attendance Log</h3>
              </div>
              <Badge tone="neutral" size="sm">
                {member.attendance.length} check-ins
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {member.attendance.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink flex items-center gap-2"
                >
                  <CalendarCheck className="size-3 text-brand" />
                  <span>{date(entry.checkedInAt)}</span>
                  <span className="text-line">&bull;</span>
                  <span className="text-ink-muted">
                    {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(
                      entry.checkedInAt
                    )}
                  </span>
                </div>
              ))}

              {member.attendance.length === 0 && (
                <div className="w-full py-6 text-center text-sm text-ink-muted">
                  No gym check-ins have been recorded for this member.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
