/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { MEMBER_NAV, Shell } from "@/components/shell";
import {
  Notice,
  Card,
  Badge,
  StatCard,
  Button,
} from "@/components/ui";
import { DigitalPassCard } from "./digital-pass-card";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  CreditCard,
  CalendarCheck,
  IndianRupee,
  History,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "My membership" };
export const dynamic = "force-dynamic";

export default async function MemberHome() {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const data = await getMemberPortal(me.gymId, me.userId);
  if (!data?.member) return null;

  const isExpiringSoon = Boolean(
    data.current && data.current.endsAt.getTime() - Date.now() <= 7 * 86_400_000
  );

  const firstName = data.member.name.split(" ")[0];

  return (
    <Shell
      title={`Hi, ${firstName}!`}
      subtitle="Member Portal & Digital Pass"
      who={data.member.name}
      nav={MEMBER_NAV}
      actions={
        <Link href="/member/attendance">
          <Button icon={QrCode} size="sm">
            Check-in Scanner
          </Button>
        </Link>
      }
    >
      {/* Alert Notices */}
      {!data.current && (
        <Notice tone="warn">
          You do not currently hold an active membership. Please contact your gym desk to renew or select a new plan.
        </Notice>
      )}

      {isExpiringSoon && data.current && (
        <Notice tone="warn">
          Your membership ends on{" "}
          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
            data.current.endsAt
          )}
          . Please visit the reception desk to renew in advance.
        </Notice>
      )}

      {/* Digital Membership Pass Card (Hero with Dynamic 60s Signed Pass QR) */}
      <DigitalPassCard
        memberName={data.member.name}
        phone={data.member.phone}
        planName={data.current ? data.current.plan.name : "Unassigned Plan"}
        endsAt={data.current ? data.current.endsAt : null}
        status={data.current ? "ACTIVE" : "EXPIRED"}
      />

      {/* Member KPIs */}
      <section aria-label="Membership overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current Membership"
          value={data.current?.plan.name ?? "None"}
          icon={CreditCard}
          tone="brand"
          subtext="Active enrollment tier"
        />
        <StatCard
          label="Valid Through"
          value={
            data.current
              ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                  data.current.endsAt
                )
              : "—"
          }
          icon={CalendarCheck}
          tone={isExpiringSoon ? "warning" : "success"}
          subtext="Membership expiration date"
        />
        <StatCard
          label="Outstanding Balance"
          value={formatInr(data.balance)}
          icon={IndianRupee}
          tone={data.balance.gt(0) ? "warning" : "success"}
          subtext={data.balance.gt(0) ? "Pay at gym desk" : "Fully paid"}
        />
        <StatCard
          label="Total Visits"
          value={data.attendance.length}
          icon={History}
          tone="brand"
          subtext="Recorded check-ins"
        />
      </section>

      {/* Recent Payments & Membership History Grid */}
      <section className="grid gap-8 md:grid-cols-2">
        {/* Payments History */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-brand" />
              <h3 className="font-display text-base font-bold text-ink">Recent Payments</h3>
            </div>
            <Link
              href="/member/payments"
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {data.payments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-3 text-xs first:pt-1 last:pb-1"
              >
                <div>
                  <span className="font-bold text-ink block">
                    {payment.membership.plan.name}
                  </span>
                  <span className="text-ink-muted">
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                      payment.createdAt
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-extrabold text-ink">
                    {formatInr(payment.amountInr)}
                  </span>
                  <Link
                    href={`/receipts/${payment.id}`}
                    className="rounded-lg border border-line bg-surface-elevated px-2 py-1 text-[11px] font-bold text-brand hover:bg-surface"
                  >
                    Receipt
                  </Link>
                </div>
              </div>
            ))}

            {data.payments.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-muted">
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </Card>

        {/* Membership Enrollment History */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-brand" />
              <h3 className="font-display text-base font-bold text-ink">
                Membership Enrollments
              </h3>
            </div>
            <Badge tone="neutral" size="sm">
              {data.memberships.length} recorded
            </Badge>
          </div>

          <div className="divide-y divide-line/60">
            {data.memberships.slice(0, 5).map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between py-3 text-xs first:pt-1 last:pb-1"
              >
                <div>
                  <span className="font-bold text-ink block">{membership.plan.name}</span>
                  <span className="text-ink-muted">
                    Ends{" "}
                    {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                      membership.endsAt
                    )}
                  </span>
                </div>
                <Badge
                  tone={
                    membership.status === "ACTIVE" && membership.endsAt > new Date()
                      ? "success"
                      : "neutral"
                  }
                  size="sm"
                >
                  {membership.status === "ACTIVE" && membership.endsAt > new Date()
                    ? "Active"
                    : "Archived"}
                </Badge>
              </div>
            ))}

            {data.memberships.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-muted">
                No past memberships recorded.
              </div>
            )}
          </div>
        </Card>
      </section>
    </Shell>
  );
}
