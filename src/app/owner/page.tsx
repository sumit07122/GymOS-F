import Link from "next/link";
import { OWNER_NAV, Shell } from "@/components/shell";
import { Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getOwnerDashboard } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";

export const metadata = { title: "Gym dashboard" };
export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  const me = await requireGym({ roles: ["OWNER"], access: "limited" });
  const data = await getOwnerDashboard(me.gymId);
  if (!data) return null;
  const { gym } = data;
  const shortcuts = [["Register a member", "/owner/members"], ["Set membership pricing", "/owner/plans"], ["Record a payment", "/owner/payments"], ["Open attendance desk", "/owner/attendance"]] as const;
  return (
    <Shell title={gym.name} subtitle={gym.city ?? undefined} who={me.name} nav={OWNER_NAV}>
      {me.gymAccess === "PENDING" && (
        <Notice tone="warn">Your gym is waiting for activation by FIXIA. You can sign in and review your gym details; members, plans and payments unlock once your subscription is activated.</Notice>
      )}
      {me.gymAccess === "EXPIRED" && (
        <Notice tone="warn">Your GymOS subscription has expired. Please contact FIXIA to renew; operations are paused until then.</Notice>
      )}
      {me.gymAccess === "ACTIVE" && (
        <>
          <section aria-label="Gym overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total members", data.totalMembers], ["Active memberships", data.activeMembers], ["New today", data.newMembers], ["Today's attendance", data.todayAttendance],
              ["Collected this month", formatInr(data.collectionsInr)], ["Outstanding dues", formatInr(data.outstandingInr)], ["Expiring in 7 days", data.expiring], ["Expired memberships", data.expired],
            ].map(([label, value]) => <div key={label} className="neo-card p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{value}</p></div>)}
          </section>
          <section className="neo-card grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="font-display text-xl font-bold">Recent activity</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {data.activity.map((item) => <li key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span>{item.action}</span><time className="text-muted" dateTime={item.createdAt.toISOString()}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(item.createdAt)}</time></li>)}
                {data.activity.length === 0 && <li className="py-4 text-sm text-muted">Member and payment activity will appear here.</li>}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Quick actions</h2>
              <div className="mt-3 grid gap-2">
                {shortcuts.map(([label, href]) => <Link key={href} href={href} className="flex min-h-12 items-center justify-between border-b border-line py-3 font-medium hover:text-deep">{label}<span aria-hidden>→</span></Link>)}
              </div>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
