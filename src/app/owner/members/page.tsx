import Link from "next/link";
import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMembershipPlans, listMembers } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { addMemberAction } from "../actions";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; error?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const { q = "", page: pageParam = "1", error } = await searchParams;
  const requestedPage = /^\d+$/.test(pageParam) ? Number(pageParam) : 1;
  const [memberPage, plans] = await Promise.all([listMembers(me.gymId, q, requestedPage), getMembershipPlans(me.gymId)]);
  const errors: Record<string, string> = {
    phone: "Enter a valid Indian mobile number.",
    exists: "That phone number is already an active member of this gym.",
    member: "The member could not be added. Check the details and selected plan.",
  };
  return (
    <Shell title="Members" subtitle="Member records and current memberships" who={me.name} nav={OWNER_NAV}>
      {error && errors[error] && <Notice>{errors[error]}</Notice>}
      <section className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Register member</h2>
          <p className="mb-5 mt-1 text-sm text-muted">The member signs in with this phone number and a one-time code.</p>
          <form action={addMemberAction} className="grid gap-4">
            <Field label="Full name" name="name" required maxLength={80} />
            <Field label="Mobile number" name="phone" type="tel" required placeholder="98765 43210" />
            <label className="grid gap-1.5 text-sm font-medium">Initial membership plan<select name="planId" defaultValue="" className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px]"><option value="">No plan yet</option>{plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatInr(plan.priceInr)}</option>)}</select></label>
            <Button type="submit">Add member</Button>
          </form>
        </div>
        <div>
          <form className="flex items-end gap-3" action="/owner/members" method="get">
            <div className="flex-1"><Field label="Search members" name="q" defaultValue={q} placeholder="Name or mobile number" /></div>
            <Button type="submit" variant="ghost">Search</Button>
            {q && <Link href="/owner/members" className="pb-3 text-sm text-muted hover:text-ink">Clear</Link>}
          </form>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {memberPage.members.map((entry) => {
              const current = entry.memberships.find((membership) => membership.startsAt <= new Date() && new Date() < membership.endsAt);
              const upcoming = entry.memberships.find((membership) => membership.startsAt > new Date());
              const state = entry.status !== "ACTIVE" ? "Inactive" : current ? "Active" : upcoming ? `Starts ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(upcoming.startsAt)}` : "No current plan";
              return <Link key={entry.user.id} href={`/owner/members/${entry.user.id}`} className="flex min-h-16 items-center justify-between gap-4 py-3 hover:bg-surface">
                <span className="min-w-0"><strong className="block truncate">{entry.displayName ?? entry.user.name}</strong><span className="text-sm text-muted">{entry.user.phone}</span></span>
                <span className="shrink-0 text-right text-sm"><span className="block">{current?.plan.name ?? upcoming?.plan.name ?? state}</span><span className="text-muted">{entry.status === "INACTIVE" ? "Deactivated" : current ? `Until ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(current.endsAt)}` : state}</span></span>
              </Link>;
            })}
            {memberPage.members.length === 0 && <p className="py-6 text-sm text-muted">{q ? "No members match that search." : "No members have been registered yet."}</p>}
          </div>
          {memberPage.total > 0 && <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted">{memberPage.total} members · page {memberPage.page} of {memberPage.pageCount}</span><div className="flex gap-2">{memberPage.page > 1 && <Link href={`/owner/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(memberPage.page - 1) })}`} className="border border-line px-3 py-2 hover:bg-soft">Previous</Link>}{memberPage.page < memberPage.pageCount && <Link href={`/owner/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(memberPage.page + 1) })}`} className="border border-line px-3 py-2 hover:bg-soft">Next</Link>}</div></div>}
        </div>
      </section>
    </Shell>
  );
}