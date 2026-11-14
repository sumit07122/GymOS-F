import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Notice,
  Card,
  Badge,
  StatCard,
  Avatar,
} from "@/components/ui";
import { DynamicReceptionQr } from "@/components/dynamic-reception-qr";
import { OwnerReceptionDesk } from "@/components/owner-reception-desk";
import { PrintButton } from "@/components/print-button";
import { requireGym } from "@/server/auth/guards";
import { getAttendanceOverview, listMembers } from "@/server/gyms/operations";
import { getReceptionDeskData } from "@/server/gyms/attendance";
import { rotateAttendanceTokenAction } from "../actions";
import {
  QrCode,
  CalendarCheck,
  RotateCw,
  Clock,
  Printer,
  History,
  Users,
  Timer,
  Activity,
  CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Attendance Desk" };
export const dynamic = "force-dynamic";

export default async function OwnerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    scan?: string;
  }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice, scan }, data, deskData, membersResult] = await Promise.all([
    searchParams,
    getAttendanceOverview(me.gymId),
    getReceptionDeskData(me.gymId),
    listMembers(me.gymId, "", 1),
  ]);

  if (!data) return null;

  const scanNotices: Record<string, { tone: "ok" | "warn" | "danger"; text: string }> = {
    "checked-in": {
      tone: "ok",
      text: "Member check-in verified! Session started.",
    },
    "checked-out": {
      tone: "ok",
      text: "Member check-out recorded! Session completed.",
    },
    "already-checked-in": {
      tone: "warn",
      text: "Member already scanned recently. Check-out will unlock after 2 minutes.",
    },
    "membership-expired": {
      tone: "danger",
      text: "Member's plan has expired! Please renew before recording attendance.",
    },
    "membership-required": {
      tone: "danger",
      text: "No active membership plan found for this member.",
    },
    "invalid-qr": {
      tone: "danger",
      text: "Invalid or expired digital pass QR code. Ask the member to refresh their screen.",
    },
    "member-not-found": {
      tone: "danger",
      text: "Member profile not found in this gym workspace.",
    },
  };

  const memberList = membersResult.members.map((m) => {
    const todayRecord = deskData?.recentCheckIns.find((r) => r.userId === m.userId);
    return {
      userId: m.userId,
      name: m.displayName || m.user.name,
      phone: m.user.phone,
      planName: m.memberships[0]?.plan.name || "Active Member",
      isCheckedInToday: Boolean(todayRecord),
      checkedInAt: todayRecord?.checkedInAt,
      checkedOutAt: todayRecord?.checkedOutAt,
    };
  });

  return (
    <Shell
      title="Attendance Operations Desk"
      subtitle="Smart QR check-in engine, reception kiosk, and live occupancy monitor"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error === "qr" && <Notice tone="danger">The attendance QR code could not be rotated.</Notice>}
      {error === "manual-failed" && (
        <Notice tone="danger">Manual attendance operation could not be completed.</Notice>
      )}
      {notice === "qr-rotated" && (
        <Notice tone="ok">
          A new static fallback QR code is active! Previous printed posters are now revoked.
        </Notice>
      )}
      {notice === "manual-recorded" && (
        <Notice tone="ok">Manual attendance adjustment recorded successfully.</Notice>
      )}
      {scan && scanNotices[scan] && (
        <Notice tone={scanNotices[scan].tone}>{scanNotices[scan].text}</Notice>
      )}

      {/* 4 Real-Time Attendance KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Check-ins"
          value={deskData?.totalToday ?? data.today.length}
          icon={CalendarCheck}
          tone="brand"
          subtext="Total unique visits today"
        />
        <StatCard
          label="Currently in Gym"
          value={
            <span className="flex items-center gap-2">
              <span>{deskData?.currentOccupancy ?? 0}</span>
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          }
          icon={Activity}
          tone="success"
          subtext="Active working out members"
        />
        <StatCard
          label="Completed Sessions"
          value={deskData?.completedToday ?? 0}
          icon={Timer}
          tone="brand"
          subtext="Checked out sessions today"
        />
        <StatCard
          label="Estimated Peak Hour"
          value={deskData?.peakHour ?? "6 PM"}
          icon={Clock}
          tone="warning"
          subtext="Busiest workout window"
        />
      </section>

      {/* Main Operations Grid */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Rotating Dynamic QR Kiosk Display */}
        <div className="lg:col-span-5 space-y-4">
          <DynamicReceptionQr
            fallbackToken={data.gym.attendanceToken}
            gymName={data.gym.name}
          />

          {/* Backup Poster Tools */}
          <Card className="p-4 bg-surface-elevated">
            <div className="flex items-center justify-between text-xs text-ink-muted mb-3">
              <span className="font-bold uppercase tracking-wider text-ink">Poster Backup</span>
              <span className="text-[11px]">Static Printable Poster</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[120px]">
                <PrintButton />
              </div>
              <form action={rotateAttendanceTokenAction} className="flex-1 min-w-[120px]">
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  icon={RotateCw}
                  className="w-full text-xs"
                >
                  Rotate Poster Key
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Reception Desk Actions & Today's Live Sessions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Desk Operations (Pass Scanner + Manual Desk) */}
          <OwnerReceptionDesk members={memberList} />

          {/* Today's Live Sessions & Visit Audit */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-brand-light text-brand">
                  <CalendarCheck className="size-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Today&apos;s Attendance Roster
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Real-time check-in, check-out duration, and entry method
                  </p>
                </div>
              </div>
              <Badge tone="brand" size="sm">
                {deskData?.recentCheckIns.length ?? data.today.length} today
              </Badge>
            </div>

            <div className="divide-y divide-line/60">
              {(deskData?.recentCheckIns ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={entry.name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-ink truncate">{entry.name}</p>
                        {!entry.checkedOutAt ? (
                          <Badge tone="success" size="sm" dot>
                            Inside Gym
                          </Badge>
                        ) : (
                          <Badge tone="neutral" size="sm">
                            {entry.durationMinutes ? `${entry.durationMinutes} min` : "Checked out"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">
                        {entry.plan} &middot; Via{" "}
                        <span className="font-mono">{entry.method.replace("_", " ")}</span>
                        {entry.notes && (
                          <span className="italic text-ink-muted/80"> &mdash; {entry.notes}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs text-ink-muted">
                    <div className="text-right">
                      <p className="font-bold text-ink">
                        {new Intl.DateTimeFormat("en-IN", {
                          timeStyle: "short",
                          timeZone: data.gym.timezone,
                        }).format(new Date(entry.checkedInAt))}
                      </p>
                      {entry.checkedOutAt && (
                        <p className="text-[10px] text-ink-muted">
                          Out:{" "}
                          {new Intl.DateTimeFormat("en-IN", {
                            timeStyle: "short",
                            timeZone: data.gym.timezone,
                          }).format(new Date(entry.checkedOutAt))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!deskData?.recentCheckIns || deskData.recentCheckIns.length === 0) && (
                <div className="py-12 text-center text-xs text-ink-muted">
                  No check-ins recorded yet today. Members scanning reception QR or checked in at desk will appear here live.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
