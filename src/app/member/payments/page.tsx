import Link from "next/link";
import { MEMBER_NAV, Shell } from "@/components/shell";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";

export const metadata = { title: "Payment history" };
export const dynamic = "force-dynamic";


export default async function MemberPaymentsPage() {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const data = await getMemberPortal(me.gymId, me.userId);
  if (!data?.member) return null;
  return (
    <Shell title="Payments" subtitle="Payment history, receipts, and outstanding dues" who={data.member.name} nav={MEMBER_NAV}>
      <div className="border-l-2 border-deep bg-surface px-5 py-4"><p className="text-sm text-muted">Outstanding dues</p><p className="mt-1 font-display text-2xl font-bold">{formatInr(data.balance)}</p></div>
      <div className="overflow-x-auto border-y border-line"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-line text-xs uppercase text-muted"><tr><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Membership</th><th className="py-3 pr-4">Method</th><th className="py-3 pr-4">Amount</th><th className="py-3">Receipt</th></tr></thead><tbody className="divide-y divide-line">{data.payments.map((payment) => <tr key={payment.id}><td className="py-4 pr-4">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(payment.createdAt)}</td><td className="py-4 pr-4">{payment.membership.plan.name}</td><td className="py-4 pr-4">{payment.method}{payment.voidedAt && <span className="ml-2 text-xs text-danger">VOID</span>}</td><td className="py-4 pr-4">{formatInr(payment.amountInr)}</td><td className="py-4"><Link href={`/receipts/${payment.id}`} className="font-medium text-deep hover:underline">View receipt</Link></td></tr>)}{data.payments.length === 0 && <tr><td colSpan={5} className="py-7 text-center text-muted">No payments recorded yet.</td></tr>}</tbody></table></div>
    </Shell>
  );
}