import Link from "next/link";
import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  SelectField,
  Notice,
  Card,
  Badge,
  Avatar,
  StatCard,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import {
  getMembershipPlans,
  listMembers,
  getOwnerDashboard,
} from "@/server/gyms/operations";
import { formatInr } from "@/server/money";
import { addMemberAction } from "../actions";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  UserPlus,
  Search,
  Filter,
  ChevronRight,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const { q = "", page: pageParam = "1", error, notice } = await searchParams;
  const requestedPage = /^\d+$/.test(pageParam) ? Number(pageParam) : 1;

  const [memberPage, plans, dashboardData] = await Promise.all([
    listMembers(me.gymId, q, requestedPage),
    getMembershipPlans(me.gymId),
    getOwnerDashboard(me.gymId),
  ]);

  const errors: Record<string, string> = {
    phone: "Enter a valid Indian 10-digit mobile number.",
    exists: "That mobile number is already registered as an active member in this gym.",
    member: "The member could not be added. Please verify the name and selected plan.",
  };

  const notices: Record<string, string> = {
    "member-added": "New member registered successfully.",
  };

  const now = new Date();

  return (
    <Shell
      title="Member Directory"
      subtitle="Registration, membership lifecycle, and active rosters"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error && errors[error] && <Notice tone="danger">{errors[error]}</Notice>}
      {notice && notices[notice] && <Notice tone="ok">{notices[notice]}</Notice>}

      {/* KPI Section */}
      <section aria-label="Member metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Members"
          value={dashboardData?.totalMembers ?? memberPage.total}
          icon={Users}
          tone="brand"
          subtext="Lifetime gym roster"
        />
        <StatCard
          label="Active Members"
          value={dashboardData?.activeMembers ?? 0}
          icon={UserCheck}
          tone="success"
          subtext="Currently holding valid plan"
        />
        <StatCard
          label="Expiring Soon"
          value={dashboardData?.expiring ?? 0}
          icon={Clock}
          tone="warning"
          subtext="Next 7 days"
        />
        <StatCard
          label="Expired / Inactive"
          value={dashboardData?.expired ?? 0}
          icon={UserX}
          tone="danger"
          subtext="Pending renewal or deactivated"
        />
      </section>

      {/* Registration & Directory Two-Column Layout */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Register Member Form */}
        <div className="lg:col-span-4">
          <Card className="p-6 sticky top-28">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Register Member</h2>
                <p className="text-xs text-ink-muted">Quick onboarding with SMS OTP login</p>
              </div>
            </div>

            <form action={addMemberAction} className="space-y-4">
              <Field
                label="Full name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. John Wick"
              />

              <Field
                label="Mobile number"
                name="phone"
                type="tel"
                required
                placeholder="98765 43210"
                hint="Used for member portal OTP sign-in"
              />

              <SelectField label="Initial membership plan" name="planId" defaultValue="">
                <option value="">No plan yet (Register as unassigned)</option>
                {plans
                  .filter((plan) => plan.active)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} &middot; {plan.durationDays} days &middot; {formatInr(plan.priceInr)}
                    </option>
                  ))}
              </SelectField>

              <div className="pt-2">
                <Button type="submit" icon={Sparkles} className="w-full">
                  Register Member
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Member Directory & Filters */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filter Bar */}
          <Card className="p-4">
            <form action="/owner/members" method="get" className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
                  <Search className="size-4" />
                </div>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search members by name or mobile number..."
                  className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-4 text-sm text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <Button type="submit" variant="secondary" icon={Filter} className="h-11">
                  Filter
                </Button>
                {q && (
                  <Link href="/owner/members">
                    <Button variant="ghost" className="h-11 text-xs">
                      Clear
                    </Button>
                  </Link>
                )}
              </div>
            </form>
          </Card>

          {/* Members Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated/40">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-brand" />
                <h3 className="font-display text-sm font-bold text-ink">Member List</h3>
              </div>
              <span className="text-xs font-semibold text-ink-muted">
                {memberPage.total} member{memberPage.total === 1 ? "" : "s"} found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-elevated/60 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    <th className="py-3.5 pl-6 pr-4">Member</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Current Plan</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {memberPage.members.map((entry) => {
                    const current = entry.memberships.find(
                      (m) => m.startsAt <= now && now < m.endsAt
                    );
                    const upcoming = entry.memberships.find((m) => m.startsAt > now);

                    const statusTone =
                      entry.status !== "ACTIVE"
                        ? "danger"
                        : current
                        ? "success"
                        : upcoming
                        ? "warning"
                        : "neutral";

                    const statusLabel =
                      entry.status !== "ACTIVE"
                        ? "Deactivated"
                        : current
                        ? "Active"
                        : upcoming
                        ? "Starts Soon"
                        : "Unassigned";

                    const memberName = entry.displayName ?? entry.user.name;

                    return (
                      <tr
                        key={entry.user.id}
                        className="group transition-colors hover:bg-surface-elevated/80"
                      >
                        {/* Member Identity & Avatar */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={memberName} size="md" />
                            <div>
                              <Link
                                href={`/owner/members/${entry.user.id}`}
                                className="font-bold text-ink group-hover:text-brand transition-colors block"
                              >
                                {memberName}
                              </Link>
                              <span className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                                <Calendar className="size-3" />
                                Joined{" "}
                                {new Intl.DateTimeFormat("en-IN", {
                                  dateStyle: "medium",
                                }).format(entry.createdAt)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4 text-ink-muted text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-brand shrink-0" />
                            {entry.user.phone}
                          </span>
                        </td>

                        {/* Current Plan */}
                        <td className="py-4 px-4">
                          {current ? (
                            <div>
                              <span className="font-semibold text-xs text-ink block">
                                {current.plan.name}
                              </span>
                              <span className="text-[11px] text-ink-muted">
                                Valid till{" "}
                                {new Intl.DateTimeFormat("en-IN", {
                                  dateStyle: "medium",
                                }).format(current.endsAt)}
                              </span>
                            </div>
                          ) : upcoming ? (
                            <div>
                              <span className="font-semibold text-xs text-ink block">
                                {upcoming.plan.name}
                              </span>
                              <span className="text-[11px] text-warning font-medium">
                                Starts{" "}
                                {new Intl.DateTimeFormat("en-IN", {
                                  dateStyle: "medium",
                                }).format(upcoming.startsAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-subtle italic">No active plan</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <Badge tone={statusTone} size="sm" dot>
                            {statusLabel}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Link href={`/owner/members/${entry.user.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              iconRight={ChevronRight}
                              className="h-8 text-xs font-bold"
                            >
                              Manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {memberPage.members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-ink-muted">
                        {q
                          ? `No members found matching "${q}". Try clearing the search filter.`
                          : "No members have been registered yet in this gym workspace."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {memberPage.total > 0 && (
              <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-surface-elevated/40 text-xs text-ink-muted">
                <span>
                  Showing page <strong className="text-ink">{memberPage.page}</strong> of{" "}
                  <strong className="text-ink">{memberPage.pageCount}</strong> ({memberPage.total}{" "}
                  total members)
                </span>
                <div className="flex gap-2">
                  {memberPage.page > 1 && (
                    <Link
                      href={`/owner/members?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        page: String(memberPage.page - 1),
                      })}`}
                    >
                      <Button variant="secondary" size="sm" className="h-8">
                        Previous
                      </Button>
                    </Link>
                  )}
                  {memberPage.page < memberPage.pageCount && (
                    <Link
                      href={`/owner/members?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        page: String(memberPage.page + 1),
                      })}`}
                    >
                      <Button variant="secondary" size="sm" className="h-8">
                        Next
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>
    </Shell>
  );
}
