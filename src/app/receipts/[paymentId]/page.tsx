import { notFound } from "next/navigation";
import Link from "next/link";
import { OWNER_NAV, MEMBER_NAV, Shell } from "@/components/shell";
import { PrintButton } from "@/components/print-button";
import { Notice, Card, Badge, Button } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getPaymentReceipt } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  Printer,
  ArrowLeft,
  ShieldCheck,
  Phone,
  MapPin,
} from "lucide-react";

export const metadata = { title: "Payment receipt" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER", "MEMBER"], access: "operational" });
  const { paymentId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      paymentId
    )
  ) {
    notFound();
  }

  const receipt = await getPaymentReceipt(
    me.gymId,
    paymentId,
    me.kind === "MEMBER" ? me.userId : undefined
  );

  if (!receipt) notFound();
  const nav = me.kind === "MEMBER" ? MEMBER_NAV : OWNER_NAV;

  return (
    <Shell
      title="Payment Receipt"
      subtitle="Official GymOS transaction receipt"
      who={me.name}
      nav={nav}
    >
      {/* Alert Notices */}
      {receipt.voidedAt && (
        <Notice tone="warn">
          This payment was corrected/voided on the ledger and is no longer credited toward the membership balance.
        </Notice>
      )}

      {/* Printable Receipt Card */}
      <div className="mx-auto w-full max-w-xl">
        <Card className="p-8 sm:p-10 border-2 border-line bg-white shadow-xl relative overflow-hidden">
          {/* Top Brand & Gym Header */}
          <div className="flex items-start justify-between gap-6 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2 text-brand mb-1">
                <Building2 className="size-4" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {receipt.gym.name}
                </span>
              </div>
              <h2 className="font-display text-xl font-black text-ink">
                {receipt.membership.plan.name}
              </h2>
              <p className="text-xs text-ink-muted mt-1 space-y-0.5">
                {[receipt.gym.address, receipt.gym.city, receipt.gym.phone]
                  .filter(Boolean)
                  .join(" &bull; ")}
              </p>
            </div>

            <div className="text-right">
              <Badge
                tone={receipt.voidedAt ? "danger" : "success"}
                size="sm"
                dot
              >
                {receipt.voidedAt ? "Voided" : "Confirmed"}
              </Badge>
              <p className="mt-2 font-display text-2xl font-black text-ink">
                {formatInr(receipt.amountInr)}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <dl className="mt-6 grid grid-cols-2 gap-y-3.5 text-xs border-b border-line pb-6">
            <dt className="text-ink-muted font-medium">Billed To Member</dt>
            <dd className="text-right font-bold text-ink">
              {receipt.member.user.name}
            </dd>

            <dt className="text-ink-muted font-medium">Mobile Contact</dt>
            <dd className="text-right text-ink font-mono">
              {receipt.member.user.phone}
            </dd>

            <dt className="text-ink-muted font-medium">Transaction Date</dt>
            <dd className="text-right text-ink">
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(receipt.createdAt)}
            </dd>

            <dt className="text-ink-muted font-medium">Payment Method</dt>
            <dd className="text-right font-semibold text-ink">
              {receipt.method}
            </dd>

            {receipt.reference && (
              <>
                <dt className="text-ink-muted font-medium">Reference Code</dt>
                <dd className="text-right font-mono text-ink">
                  {receipt.reference}
                </dd>
              </>
            )}

            {receipt.voidedAt && (
              <>
                <dt className="text-danger font-medium">Correction Reason</dt>
                <dd className="text-right font-medium text-danger">
                  {receipt.voidReason}
                </dd>
              </>
            )}
          </dl>

          {/* Amount Paid Callout */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
                Total Amount Paid
              </span>
              <span className="text-[11px] text-ink-muted">
                Zero balance remaining for this receipt
              </span>
            </div>
            <strong className="font-display text-2xl font-black text-brand">
              {formatInr(receipt.amountInr)}
            </strong>
          </div>

          {/* Verification Code Footer */}
          <div className="mt-8 border-t border-line/60 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-ink-muted gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-3.5 text-brand" />
              Verified FIXIA GymOS Transaction
            </span>
            <span className="font-mono text-[10px]">
              ID: {receipt.id.toUpperCase()}
            </span>
          </div>
        </Card>

        {/* Buttons Bar */}
        <div className="mt-6 flex items-center justify-between print:hidden">
          <Link
            href={
              me.kind === "MEMBER" ? "/member/payments" : "/owner/payments"
            }
          >
            <Button variant="secondary" size="sm" icon={ArrowLeft}>
              Back to Payments
            </Button>
          </Link>
          <PrintButton label="Print Receipt" />
        </div>
      </div>
    </Shell>
  );
}
