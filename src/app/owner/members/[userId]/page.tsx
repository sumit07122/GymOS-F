import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberDetails, getMembershipPlans } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { assignMembershipAction, recordPaymentAction, setMemberStatusAction, updateMemberNameAction } from "../../actions";

export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);

export default async function MemberDetailsPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ userId }, { error, notice }] = await Promise.all([params, searchParams]);
  const [member, plans] = await Promise.all([getMemberDetails(me.gymId, userId), getMembershipPlans(me.gymId)]);
  if (!member) notFound();
  const errors: Record<string, string> = {
    membership: "The membership could not be assigned. Check that the selected plan is active.",
    payment: "Payment was not recorded. Check the amount and outstanding balance.",
    "member-status": "Member status could not be updated.",
    "member-profile": "Member name could not be saved.",
  };
  const notices: Record<string, string> = {
    "member-added": "Member profile created.",
    "membership-assigned": "Membership assigned or renewed.",
    "payment-recorded": "Payment recorded.",
    "member-status-updated": "Member status updated.",
    "member-profile-updated": "Member profile updated.",
  };
  const currentTime = new Date();
  return (
    <Shell title={member.displayName ?? member.user.name} subtitle={member.user.phone ?? undefined} who={me.name} nav={OWNER_NAV}>
      <Link href="/owner/members" className="text-sm font-medium text-deep hover:underline">← All members</Link>
      {error && errors[error] && <Notice>{errors[error]}</Notice>}
      {notice && notices[notice] && <Notice tone="ok">{notices[notice]}</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
        <div><p className="text-sm text-muted">Member status</p><p className="font-semibold">{member.status}</p></div>
        <form action={setMemberStatusAction}><input type="hidden" name="userId" value={userId} /><input type="hidden" name="active" value={String(member.status !== "ACTIVE")} /><Button type="submit" variant="ghost">{member.status === "ACTIVE" ? "Deactivate member" : "Reactivate member"}</Button></form>
      </div>
      <form action={updateMemberNameAction} className="grid max-w-lg gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><input type="hidden" name="userId" value={userId} /><Field label="Member name" name="name" defaultValue={member.displayName ?? member.user.name} required minLength={2} maxLength={80} /><Button type="submit" variant="ghost">Save name</Button><p className="text-xs text-muted sm:col-span-2">Mobile number is the member’s login identity and can’t be changed here.</p></form>
      <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Assign or renew</h2>
          <p className="mb-4 mt-1 text-sm text-muted">A renewal starts after any current membership ends.</p>
          <form action={assignMembershipAction} className="grid gap-3">
            <input type="hidden" name="userId" value={userId} />
            <label className="grid gap-1.5 text-sm font-medium">Plan<select name="planId" required className="h-11 rounded-xl border border-line bg-surface px-3">{plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.durationDays} days · {formatInr(plan.priceInr)}</option>)}</select></label>
            <Button type="submit" disabled={!plans.some((plan) => plan.active)}>Assign membership</Button>
          </form>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Membership history</h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {member.memberships.map((membership) => {
              const paid = membership.payments.filter((payment) => !payment.voidedAt).reduce((sum, payment) => sum.plus(payment.amountInr), new Prisma.Decimal(0));
              const due = Prisma.Decimal.max(membership.priceInr.minus(paid), 0);
              const current = membership.status === "ACTIVE" && membership.startsAt <= currentTime && currentTime < membership.endsAt;
              return <article key={membership.id} className="py-4">
                <div className="flex flex-wrap justify-between gap-2"><strong>{membership.plan.name}</strong><span className="text-sm text-muted">{current ? "CURRENT" : membership.status === "CANCELLED" ? "CANCELLED" : membership.endsAt <= currentTime ? "EXPIRED" : "UPCOMING"}</span></div>
                <p className="mt-1 text-sm text-muted">{date(membership.startsAt)} – {date(membership.endsAt)} · {formatInr(membership.priceInr)} · {due.gt(0) ? `${formatInr(due)} due` : "Paid"}</p>
                {membership.status === "ACTIVE" && due.gt(0) && <form action={recordPaymentAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="userId" value={userId} /><input type="hidden" name="membershipId" value={membership.id} />
                  <Field label="Payment amount (INR)" name="amountInr" type="number" min="0.01" max={due.toFixed(2)} step="0.01" required />
                  <label className="grid gap-1.5 text-sm font-medium">Method<select name="method" className="h-11 rounded-xl border border-line bg-surface px-3"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
                  <div className="sm:col-span-2"><Field label="Transaction reference (optional)" name="reference" maxLength={120} /></div>
                  <Button type="submit">Record payment</Button>
                </form>}
                {membership.payments.length > 0 && <ul className="mt-3 border-t border-line">{membership.payments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{formatInr(payment.amountInr)} · {payment.method} {payment.voidedAt ? "· VOIDED" : ""}</span><span className="text-muted">{date(payment.createdAt)} · <Link href={`/receipts/${payment.id}`} className="text-deep hover:underline">Receipt</Link></span></li>)}</ul>}
              </article>;
            })}
            {member.memberships.length === 0 && <p className="py-5 text-sm text-muted">No memberships yet.</p>}
          </div>
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">Attendance history</h2>
        <div className="mt-3 flex flex-wrap gap-2 border-y border-line py-4">{member.attendance.map((entry) => <time key={entry.id} dateTime={entry.checkedInAt.toISOString()} className="border border-line px-3 py-2 text-sm">{date(entry.checkedInAt)} · {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(entry.checkedInAt)}</time>)}{member.attendance.length === 0 && <p className="text-sm text-muted">No check-ins recorded.</p>}</div>
      </section>
    </Shell>
  );
}