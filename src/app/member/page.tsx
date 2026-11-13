import Link from "next/link";
import { MEMBER_NAV, Shell } from "@/components/shell";
import { Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";

export const metadata = { title: "My membership" };
export const dynamic = "force-dynamic";

export default async function MemberHome() {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const data = await getMemberPortal(me.gymId, me.userId);
  if (!data?.member) return null;
  // eslint-disable-next-line react-hooks/purity
  const isExpiringSoon = Boolean(data.current && data.current.endsAt.getTime() - Date.now() <= 7 * 86_400_000);
  return (
    <Shell title={`Hi, ${data.member.name.split(" ")[0]}`} subtitle="Your gym membership" who={data.member.name} nav={MEMBER_NAV}>
      {!data.current && <Notice tone="warn">You do not have a current membership. Please contact your gym to renew.</Notice>}
      {isExpiringSoon && data.current && <Notice tone="warn">Your membership ends {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(data.current.endsAt)}.</Notice>}
      <section aria-label="Membership overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Membership", data.current?.plan.name ?? "No active plan"],
          ["Valid through", data.current ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(data.current.endsAt) : "—"],
          ["Outstanding dues", formatInr(data.balance)],
          ["Recent visits", data.attendance.length],
        ].map(([label, value]) => <div key={label} className="neo-card p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-display text-xl font-extrabold tracking-tight">{value}</p></div>)}
      </section>
      <section className="neo-card grid gap-8 p-5 sm:p-7 md:grid-cols-2">
        <div><h2 className="font-display text-xl font-bold">Recent payments</h2><ul className="mt-3 divide-y divide-line border-y border-line">{data.payments.slice(0, 5).map((payment) => <li key={payment.id} className="flex justify-between gap-3 py-3 text-sm"><span>{payment.membership.plan.name}{payment.voidedAt ? " · VOID" : ""}</span><Link href={`/receipts/${payment.id}`} className="font-medium text-deep hover:underline">{formatInr(payment.amountInr)}</Link></li>)}{data.payments.length === 0 && <li className="py-4 text-sm text-muted">No payments recorded.</li>}</ul></div>
        <div><h2 className="font-display text-xl font-bold">Membership history</h2><ul className="mt-3 divide-y divide-line border-y border-line">{data.memberships.slice(0, 5).map((membership) => <li key={membership.id} className="flex justify-between gap-3 py-3 text-sm"><span>{membership.plan.name}</span><span className="text-muted">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(membership.endsAt)}</span></li>)}{data.memberships.length === 0 && <li className="py-4 text-sm text-muted">No membership history yet.</li>}</ul></div>
      </section>
    </Shell>
  );
}
