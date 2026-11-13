import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Notice,
  Card,
  Badge,
  StatCard,
  Avatar,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { listPayments } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { voidPaymentAction } from "../actions";
import {
  Receipt,
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Calendar,
} from "lucide-react";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, payments] = await Promise.all([
    searchParams,
    listPayments(me.gymId),
  ]);

  // Aggregate metrics
  const validPayments = payments.filter((p) => !p.voidedAt);
  const totalCollections = validPayments.reduce(
    (sum, p) => sum.plus(p.amountInr),
    new Prisma.Decimal(0)
  );

  const upiTotal = validPayments
    .filter((p) => p.method === "UPI")
    .reduce((sum, p) => sum.plus(p.amountInr), new Prisma.Decimal(0));

  const cashTotal = validPayments
    .filter((p) => p.method === "CASH")
    .reduce((sum, p) => sum.plus(p.amountInr), new Prisma.Decimal(0));

  const voidedCount = payments.filter((p) => Boolean(p.voidedAt)).length;

  const methodIcons: Record<string, typeof IndianRupee> = {
    CASH: Banknote,
    UPI: Smartphone,
    BANK_TRANSFER: Building,
  };

  return (
    <Shell
      title="Payments & Collections"
      subtitle="Transaction history, digital receipts, and audit corrections"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error && (
        <Notice tone="danger">
          {error === "correction"
            ? "Payment correction failed. The payment may already be voided."
            : "Payment update failed."}
        </Notice>
      )}

      {notice && (
        <Notice tone="ok">
          Payment correction recorded successfully. The original transaction is archived for audit purposes.
        </Notice>
      )}

      {/* Financial KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Collected"
          value={formatInr(totalCollections)}
          icon={IndianRupee}
          tone="success"
          subtext="Net confirmed collections"
        />
        <StatCard
          label="UPI Collections"
          value={formatInr(upiTotal)}
          icon={Smartphone}
          tone="brand"
          subtext="Instant digital payments"
        />
        <StatCard
          label="Cash Collections"
          value={formatInr(cashTotal)}
          icon={Banknote}
          tone="brand"
          subtext="Physical desk receipts"
        />
        <StatCard
          label="Voided Records"
          value={voidedCount}
          icon={AlertTriangle}
          tone={voidedCount > 0 ? "warning" : "neutral"}
          subtext="Corrected transaction entries"
        />
      </section>

      {/* Transactions Table Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated/40">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-brand" />
            <h3 className="font-display text-base font-bold text-ink">Transaction Register</h3>
          </div>
          <Badge tone="brand" size="sm">
            {payments.length} transactions
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-line bg-surface-elevated/60 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th className="py-3.5 pl-6 pr-4">Member</th>
                <th className="py-3.5 px-4">Membership Tier</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method & Ref</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {payments.map((payment) => {
                const MethodIcon = methodIcons[payment.method] ?? IndianRupee;

                return (
                  <tr
                    key={payment.id}
                    className={`group transition-colors ${
                      payment.voidedAt
                        ? "bg-danger-soft/10 opacity-70"
                        : "hover:bg-surface-elevated/80"
                    }`}
                  >
                    {/* Member */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={payment.member.user.name} size="sm" />
                        <div>
                          <Link
                            href={`/owner/members/${payment.userId}`}
                            className="font-bold text-ink group-hover:text-brand transition-colors block"
                          >
                            {payment.member.user.name}
                          </Link>
                          <span className="text-xs text-ink-muted">
                            {payment.member.user.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-4">
                      <span className="font-semibold text-xs text-ink">
                        {payment.membership.plan.name}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-display font-extrabold text-sm ${
                            payment.voidedAt
                              ? "line-through text-danger"
                              : "text-ink"
                          }`}
                        >
                          {formatInr(payment.amountInr)}
                        </span>
                        {payment.voidedAt && (
                          <Badge tone="danger" size="sm">
                            Voided
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Method & Ref */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <MethodIcon className="size-3.5 text-brand shrink-0" />
                        <span className="text-xs font-semibold text-ink">
                          {payment.method}
                        </span>
                      </div>
                      {payment.reference && (
                        <span className="text-[11px] text-ink-muted block truncate max-w-40 mt-0.5">
                          Ref: {payment.reference}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-xs text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-ink-subtle" />
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(payment.createdAt)}
                      </span>
                    </td>

                    {/* Actions & Void details */}
                    <td className="py-4 pl-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/receipts/${payment.id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ExternalLink}
                            className="h-8 text-xs font-bold"
                          >
                            Receipt
                          </Button>
                        </Link>
                      </div>

                      {/* Void details or trigger */}
                      {payment.voidedAt ? (
                        <p className="mt-1 text-[11px] text-danger font-medium">
                          Reason: {payment.voidReason}
                        </p>
                      ) : (
                        <details className="mt-1.5 text-right">
                          <summary className="cursor-pointer text-[11px] font-semibold text-danger hover:underline">
                            Correct / Void
                          </summary>
                          <form
                            action={voidPaymentAction}
                            className="mt-2 text-left bg-surface border border-line rounded-xl p-3 shadow-md space-y-2 max-w-xs ml-auto"
                          >
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                              Correction reason
                              <textarea
                                name="reason"
                                required
                                minLength={5}
                                maxLength={300}
                                placeholder="e.g. Accidental duplicate entry, wrong amount recorded"
                                className="mt-1 min-h-16 w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink focus:border-danger focus:outline-none"
                              />
                            </label>
                            <Button
                              type="submit"
                              variant="danger"
                              size="sm"
                              icon={RotateCcw}
                              className="w-full text-xs"
                            >
                              Confirm Void
                            </Button>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-ink-muted">
                    No payment collections have been recorded yet in this workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
