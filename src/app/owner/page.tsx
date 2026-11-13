import Link from "next/link";
import { OWNER_NAV, Shell } from "@/components/shell";
import { Notice, StatCard, Card, Button, Badge } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getOwnerDashboard } from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  CalendarCheck,
  IndianRupee,
  AlertCircle,
  UserPlus,
  ArrowRight,
  Activity,
  CreditCard,
  QrCode,
  BarChart3,
  Building2,
} from "lucide-react";

export const metadata = { title: "Gym dashboard" };
export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  const me = await requireGym({ roles: ["OWNER"], access: "limited" });
  const data = await getOwnerDashboard(me.gymId);
  if (!data) return null;
  const { gym } = data;

  const quickActions = [
    {
      title: "Register new member",
      desc: "Add member details and assign plan",
      href: "/owner/members",
      icon: UserPlus,
      variant: "primary" as const,
    },
    {
      title: "Record member payment",
      desc: "Log cash, UPI, or bank collections",
      href: "/owner/payments",
      icon: IndianRupee,
      variant: "secondary" as const,
    },
    {
      title: "Attendance scanner desk",
      desc: "Display reception QR or view check-ins",
      href: "/owner/attendance",
      icon: QrCode,
      variant: "secondary" as const,
    },
    {
      title: "Manage membership plans",
      desc: "Create and price membership tiers",
      href: "/owner/plans",
      icon: CreditCard,
      variant: "secondary" as const,
    },
    {
      title: "Business & revenue reports",
      desc: "View collections and member growth",
      href: "/owner/reports",
      icon: BarChart3,
      variant: "secondary" as const,
    },
  ];

  return (
    <Shell
      title={gym.name}
      subtitle={gym.city ? `${gym.city} &middot; Active Workspace` : "Active Workspace"}
      who={me.name}
      nav={OWNER_NAV}
    >
      {me.gymAccess === "PENDING" && (
        <Notice tone="warn">
          Your gym is waiting for activation by FIXIA Platform Admin. You can review your gym
          details and settings; member registrations, plans, and payments will unlock once your
          subscription is activated.
        </Notice>
      )}

      {me.gymAccess === "EXPIRED" && (
        <Notice tone="danger">
          Your GymOS subscription has expired. Please contact FIXIA to renew; operational controls
          are paused until renewal is complete.
        </Notice>
      )}

      {me.gymAccess === "ACTIVE" && (
        <>
          {/* 8 Core KPIs Grid */}
          <section aria-label="Gym performance overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Members"
              value={data.totalMembers}
              icon={Users}
              tone="brand"
              subtext="Registered in workspace"
            />
            <StatCard
              label="Active Members"
              value={data.activeMembers}
              icon={UserCheck}
              tone="success"
              subtext="Current valid memberships"
            />
            <StatCard
              label="Expiring in 7 Days"
              value={data.expiring}
              icon={Clock}
              tone="warning"
              subtext="Needs renewal outreach"
            />
            <StatCard
              label="Expired Members"
              value={data.expired}
              icon={UserX}
              tone="danger"
              subtext="Inactive or pending renewal"
            />
            <StatCard
              label="Today's Attendance"
              value={data.todayAttendance}
              icon={CalendarCheck}
              tone="brand"
              subtext="Check-ins recorded today"
            />
            <StatCard
              label="Month Collections"
              value={formatInr(data.collectionsInr)}
              icon={IndianRupee}
              tone="success"
              subtext="Current calendar month"
            />
            <StatCard
              label="Outstanding Dues"
              value={formatInr(data.outstandingInr)}
              icon={AlertCircle}
              tone="warning"
              subtext="Pending member balances"
            />
            <StatCard
              label="New Today"
              value={data.newMembers}
              icon={UserPlus}
              tone="brand"
              subtext="Joined today"
            />
          </section>

          {/* Quick Actions & Activity Section */}
          <section className="grid gap-8 lg:grid-cols-12">
            {/* Quick Action Shortcuts */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Quick Operations</h2>
                <Badge tone="brand" size="sm">Workspace Shortcuts</Badge>
              </div>

              <div className="grid gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href} className="group">
                      <Card className="flex items-center justify-between p-4 transition-all duration-150 group-hover:border-brand/40 group-hover:shadow-md">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-light text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-ink group-hover:text-brand transition-colors">
                              {action.title}
                            </p>
                            <p className="truncate text-xs text-ink-muted">{action.desc}</p>
                          </div>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-brand" />
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* Gym Operating Details Card */}
              <Card className="p-5 mt-4 bg-surface-elevated">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-surface text-brand border border-line">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Gym Details</h3>
                    <p className="text-sm font-bold text-ink">{gym.name}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-ink-muted border-t border-line/60 pt-3">
                  <div className="flex justify-between">
                    <span>Operating Timezone:</span>
                    <span className="font-semibold text-ink">{gym.timezone}</span>
                  </div>
                  {gym.city && (
                    <div className="flex justify-between">
                      <span>City:</span>
                      <span className="font-semibold text-ink">{gym.city}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Activity Timeline */}
            <div className="lg:col-span-7">
              <Card className="p-6">
                <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-brand-light text-brand">
                      <Activity className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-ink">Recent Activity</h2>
                      <p className="text-xs text-ink-muted">Live audit events & member transactions</p>
                    </div>
                  </div>
                  <Badge tone="neutral" size="sm">{data.activity.length} recent</Badge>
                </div>

                <div className="divide-y divide-line/60">
                  {data.activity.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-1 last:pb-1">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-1.5 size-2 rounded-full bg-brand shrink-0" aria-hidden />
                        <p className="text-sm font-medium text-ink leading-relaxed">
                          {item.action}
                        </p>
                      </div>
                      <time
                        dateTime={item.createdAt.toISOString()}
                        className="shrink-0 text-xs font-medium text-ink-muted"
                      >
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(item.createdAt)}
                      </time>
                    </div>
                  ))}

                  {data.activity.length === 0 && (
                    <div className="py-12 text-center text-sm text-ink-muted">
                      Member registrations, attendance check-ins, and payments will stream here in real time.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
