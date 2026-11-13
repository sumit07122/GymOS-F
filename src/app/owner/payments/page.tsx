import Link from "next/link";
import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { listPayments } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { voidPaymentAction } from "../actions";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";


export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, payments] = await Promise.all([searchParams, listPayments(me.gymId)]);
  return (
    <Shell title="Payments" subtitle="Manually recorded collections and corrections" who={me.name} nav={OWNER_NAV}>
      {error && <Notice>{error === "correction" ? "Payment correction failed. It may already be voided." : "Payment update failed."}</Notice>}
      {notice && <Notice tone="ok">Payment correction recorded. The original entry remains in the history.</Notice>}
      <div className="overflow-x-auto border-y border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted"><tr><th className="py-3 pr-4">Member</th><th className="py-3 pr-4">Membership</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Method</th><th className="py-3 pr-4">Recorded</th><th className="py-3">Receipt / correction</th></tr></thead>
          <tbody className="divide-y divide-line">
            {payments.map((payment) => <tr key={payment.id} className="align-top">
              <td className="py-4 pr-4"><Link href={`/owner/members/${payment.userId}`} className="font-medium text-deep hover:underline">{payment.member.user.name}</Link><span className="mt-1 block text-muted">{payment.member.user.phone}</span></td>
              <td className="py-4 pr-4">{payment.membership.plan.name}</td>
              <td className="py-4 pr-4 font-semibold">{formatInr(payment.amountInr)}{payment.voidedAt && <span className="ml-2 text-xs text-danger">VOID</span>}</td>
              <td className="py-4 pr-4">{payment.method}{payment.reference && <span className="mt-1 block text-xs text-muted">{payment.reference}</span>}</td>
              <td className="py-4 pr-4">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(payment.createdAt)}</td>
              <td className="py-4">
                <Link href={`/receipts/${payment.id}`} className="font-medium text-deep hover:underline">Receipt</Link>
                {payment.voidedAt ? <p className="mt-1 max-w-48 text-xs text-muted">Correction: {payment.voidReason}</p> : <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-danger">Correct / void</summary><form action={voidPaymentAction} className="mt-2 grid gap-2"><input type="hidden" name="paymentId" value={payment.id} /><label className="grid gap-1 text-xs">Reason<textarea name="reason" required minLength={5} maxLength={300} className="min-h-16 rounded-lg border border-line bg-surface p-2" /></label><Button type="submit" variant="ghost" className="h-9 justify-self-start px-3 text-xs">Record correction</Button></form></details>}
              </td>
            </tr>)}
            {payments.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No payments have been recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}