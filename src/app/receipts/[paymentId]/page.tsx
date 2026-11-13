import { notFound } from "next/navigation";
import Link from "next/link";
import { OWNER_NAV, MEMBER_NAV, Shell } from "@/components/shell";
import { PrintButton } from "@/components/print-button";
import { Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getPaymentReceipt } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";

export const metadata = { title: "Payment receipt" };
export const dynamic = "force-dynamic";


export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const me = await requireGym({ roles: ["OWNER", "MEMBER"], access: "operational" });
  const { paymentId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) notFound();
  const receipt = await getPaymentReceipt(me.gymId, paymentId, me.kind === "MEMBER" ? me.userId : undefined);
  if (!receipt) notFound();
  const nav = me.kind === "MEMBER" ? MEMBER_NAV : OWNER_NAV;
  return (
    <Shell title="Payment receipt" subtitle="GymOS payment record" who={me.name} nav={nav}>
      {receipt.voidedAt && <Notice tone="warn">This payment was corrected and is no longer included in the outstanding balance.</Notice>}
      <article className="mx-auto w-full max-w-xl border-y-2 border-forest bg-surface px-6 py-7 sm:px-9">
        <div className="flex items-start justify-between gap-5"><div><p className="text-sm font-bold uppercase text-deep">{receipt.gym.name}</p><p className="mt-1 text-sm text-muted">{[receipt.gym.address, receipt.gym.city, receipt.gym.phone].filter(Boolean).join(" · ")}</p><h2 className="mt-4 font-display text-2xl font-extrabold">{receipt.membership.plan.name}</h2><p className="mt-1 text-sm text-muted">Payment receipt</p></div><p className="font-display text-xl font-bold">{formatInr(receipt.amountInr)}</p></div>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t border-line pt-5 text-sm">
          <dt className="text-muted">Member</dt><dd className="text-right font-medium">{receipt.member.user.name}</dd>
          <dt className="text-muted">Mobile</dt><dd className="text-right">{receipt.member.user.phone}</dd>
          <dt className="text-muted">Date</dt><dd className="text-right">{new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(receipt.createdAt)}</dd>
          <dt className="text-muted">Method</dt><dd className="text-right">{receipt.method}</dd>
          {receipt.reference && <><dt className="text-muted">Reference</dt><dd className="text-right">{receipt.reference}</dd></>}
          <dt className="text-muted">Status</dt><dd className="text-right">{receipt.voidedAt ? "Corrected / void" : "Recorded"}</dd>
          {receipt.voidedAt && <><dt className="text-muted">Correction reason</dt><dd className="text-right">{receipt.voidReason}</dd></>}
        </dl>
        <div className="mt-6 flex justify-between border-t border-line pt-4"><span className="font-semibold">Amount recorded</span><strong>{formatInr(receipt.amountInr)}</strong></div>
        <p className="mt-5 text-xs text-muted">Receipt reference: {receipt.id.toUpperCase()}</p>
      </article>
      <div className="mx-auto flex max-w-xl flex-wrap gap-3 print:hidden"><PrintButton label="Print receipt" /><Link href={me.kind === "MEMBER" ? "/member/payments" : "/owner/payments"} className="inline-flex h-11 items-center border border-line px-4 text-sm font-medium hover:bg-soft">Back to payments</Link></div>
    </Shell>
  );
}