import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  Card,
  Badge,
  StatCard,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getGymReport } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  BarChart3,
  Calendar,
  IndianRupee,
  Users,
  CalendarCheck,
  TrendingUp,
  Filter,
} from "lucide-react";

export const metadata = { title: "Gym reports" };
export const dynamic = "force-dynamic";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const query = await searchParams;
  const today = new Date();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? "")
    ? query.to!
    : dateKey(today);
  const fromFallback = new Date(today.getTime() - 29 * 86_400_000);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? "")
    ? query.from!
    : dateKey(fromFallback);

  const report = await getGymReport(me.gymId, from, to);
  if (!report) return null;

  return (
    <Shell
      title="Business Reports & Analytics"
      subtitle="Financial collections, footfall attendance, and member registration trends"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Date Filter Bar Card */}
      <Card className="p-5">
        <form
          method="get"
          action="/owner/reports"
          className="flex flex-col sm:flex-row items-end gap-4"
        >
          <div className="flex-1 w-full sm:w-auto">
            <Field
              label="From date"
              name="from"
              type="date"
              defaultValue={from}
              required
              icon={Calendar}
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <Field
              label="Through date"
              name="to"
              type="date"
              defaultValue={to}
              required
              icon={Calendar}
            />
          </div>
          <Button type="submit" variant="secondary" icon={Filter} className="h-11">
            Apply Date Range
          </Button>
        </form>
      </Card>

      {/* Aggregate Report Totals */}
      <section aria-label="Report totals" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Collections"
          value={formatInr(report.totalCollections)}
          icon={IndianRupee}
          tone="success"
          subtext="Total revenue during period"
        />
        <StatCard
          label="Total Attendance"
          value={report.totalAttendance}
          icon={CalendarCheck}
          tone="brand"
          subtext="Total check-ins during period"
        />
        <StatCard
          label="New Member Signups"
          value={report.totalSignups}
          icon={Users}
          tone="brand"
          subtext="New members registered"
        />
      </section>

      {/* Daily Breakdown Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Collections Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="size-4 text-brand" />
              <h3 className="font-display text-base font-bold text-ink">Collections by Day</h3>
            </div>
            <Badge tone="success" size="sm">
              {report.collections.length} days
            </Badge>
          </div>

          <div className="divide-y divide-line/60">
            {report.collections.map((item) => (
              <div
                key={item.day}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
              >
                <time dateTime={item.day} className="text-xs text-ink-muted font-medium">
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(new Date(`${item.day}T00:00:00.000Z`))}
                </time>
                <div className="text-right">
                  <span className="font-display font-bold text-sm text-ink block">
                    {formatInr(item.total)}
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {item.count} payment{item.count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}

            {report.collections.length === 0 && (
              <div className="py-10 text-center text-sm text-ink-muted">
                No collections recorded in this date range.
              </div>
            )}
          </div>
        </Card>

        {/* Attendance Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-brand" />
              <h3 className="font-display text-base font-bold text-ink">Attendance by Day</h3>
            </div>
            <Badge tone="brand" size="sm">
              {report.attendance.length} days
            </Badge>
          </div>

          <div className="divide-y divide-line/60">
            {report.attendance.map((item) => (
              <div
                key={item.day}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
              >
                <time dateTime={item.day} className="text-xs text-ink-muted font-medium">
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(new Date(`${item.day}T00:00:00.000Z`))}
                </time>
                <span className="font-bold text-xs rounded-full bg-brand-light text-brand px-2.5 py-1">
                  {item.count} visit{item.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}

            {report.attendance.length === 0 && (
              <div className="py-10 text-center text-sm text-ink-muted">
                No check-ins recorded in this date range.
              </div>
            )}
          </div>
        </Card>

        {/* Member Signups Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand" />
              <h3 className="font-display text-base font-bold text-ink">New Signups by Day</h3>
            </div>
            <Badge tone="brand" size="sm">
              {report.signups.length} days
            </Badge>
          </div>

          <div className="divide-y divide-line/60">
            {report.signups.map((item) => (
              <div
                key={item.day}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
              >
                <time dateTime={item.day} className="text-xs text-ink-muted font-medium">
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(new Date(`${item.day}T00:00:00.000Z`))}
                </time>
                <span className="font-bold text-xs rounded-full bg-success-soft text-success px-2.5 py-1">
                  +{item.count} member{item.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}

            {report.signups.length === 0 && (
              <div className="py-10 text-center text-sm text-ink-muted">
                No new registrations in this date range.
              </div>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
