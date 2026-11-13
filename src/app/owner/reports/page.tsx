import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Field } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getGymReport } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";

export const metadata = { title: "Gym reports" };
export const dynamic = "force-dynamic";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const query = await searchParams;
  const today = new Date();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? "") ? query.to! : dateKey(today);
  const fromFallback = new Date(today.getTime() - 29 * 86_400_000);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? "") ? query.from! : dateKey(fromFallback);
  const report = await getGymReport(me.gymId, from, to);
  if (!report) return null;
  const rows = [
    ["Collections", report.collections.map((item) => [item.day, formatInr(item.total), `${item.count} payment${item.count === 1 ? "" : "s"}`])],
    ["Attendance", report.attendance.map((item) => [item.day, `${item.count} check-in${item.count === 1 ? "" : "s"}`, ""])],
    ["New members", report.signups.map((item) => [item.day, `${item.count} member${item.count === 1 ? "" : "s"}`, ""])],
  ] as const;
  return (
    <Shell title="Gym reports" subtitle="Collections, attendance, and member registrations" who={me.name} nav={OWNER_NAV}>
      <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line pb-5">
        <Field label="From" name="from" type="date" defaultValue={from} required />
        <Field label="Through" name="to" type="date" defaultValue={to} required />
        <Button type="submit" variant="ghost">Apply dates</Button>
      </form>
      <section aria-label="Report totals" className="grid gap-3 sm:grid-cols-3">
        {[["Collections", formatInr(report.totalCollections)], ["Attendance", report.totalAttendance], ["New members", report.totalSignups]].map(([label, value]) => <div key={label} className="border-l-2 border-deep bg-surface px-5 py-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div>)}
      </section>
      <div className="grid gap-8 lg:grid-cols-3">
        {rows.map(([title, items]) => <section key={title}><h2 className="font-display text-lg font-bold">{title} by day</h2><ul className="mt-3 divide-y divide-line border-y border-line">{items.map(([day, primary, secondary]) => <li key={day} className="flex justify-between gap-3 py-3"><time dateTime={day}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`))}</time><span className="text-right"><strong>{primary}</strong>{secondary && <span className="block text-xs text-muted">{secondary}</span>}</span></li>)}{items.length === 0 && <li className="py-5 text-sm text-muted">No activity in this date range.</li>}</ul></section>)}
      </div>
    </Shell>
  );
}