import Link from "next/link";
import { MEMBER_NAV, Shell } from "@/components/shell";
import {
  Notice,
  Card,
  Badge,
  StatCard,
  Button,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  Receipt,
  IndianRupee,
  ExternalLink,
  Calendar,
} from "lucide-react";

export const metadata = { title: "Payment history" };
export const dynamic = "force-dynamic";

export default async function MemberPaymentsPage() {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const data = await getMemberPortal(me.gymId, me.userId);
  if (!data?.member) return null;

  return (
    <Shell
      title="Payments & Receipts"
      subtitle="Membership fees, settlement history, and digital invoices"
      who={data.member.name}
      nav={MEMBER_NAV}
    >
      {/* Outstanding Balance KPI */}
      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Outstanding Balance"
          value={formatInr(data.balance)}
          icon={IndianRupee}
          tone={data.balance.gt(0) ? "warning" : "success"}
          subtext={
            data.balance.gt(0)
              ? "Please settle dues at the gym reception desk"
              : "All dues fully settled"
          }
        />
        <StatCard
          label="Total Transactions"
          value={data.payments.length}
          icon={Receipt}
          tone="brand"
          subtext="Invoices and receipts recorded"
        />
      </section>

      {/* Transactions Register */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated/40">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-brand" />
            <h3 className="font-display text-base font-bold text-ink">Payment History</h3>
          </div>
          <Badge tone="brand" size="sm">
            {data.payments.length} records
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-line bg-surface-elevated/60 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th className="py-3.5 pl-6 pr-4">Date</th>
                <th className="py-3.5 px-4">Membership Plan</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {data.payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="transition-colors hover:bg-surface-elevated/60"
                >
                  <td className="py-4 pl-6 pr-4 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="size-3.5 text-ink-subtle" />
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                      }).format(payment.createdAt)}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-xs text-ink">
                    {payment.membership.plan.name}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-ink">
                        {payment.method}
                      </span>
                      {payment.voidedAt && (
                        <Badge tone="danger" size="sm">
                          VOID
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-display font-extrabold text-sm text-ink">
                    {formatInr(payment.amountInr)}
                  </td>
                  <td className="py-4 pl-4 pr-6 text-right">
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
                  </td>
                </tr>
              ))}

              {data.payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-ink-muted">
                    No payment records found.
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
