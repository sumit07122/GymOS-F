import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Notice,
  Card,
  Badge,
  StatCard,
  Avatar,
} from "@/components/ui";
import { GymQr } from "@/components/gym-qr";
import { PrintButton } from "@/components/print-button";
import { requireGym } from "@/server/auth/guards";
import { getAttendanceOverview } from "@/server/gyms/operations";
import { rotateAttendanceTokenAction } from "../actions";
import {
  QrCode,
  CalendarCheck,
  RotateCw,
  Clock,
  Printer,
  History,
  Building2,
  Users,
} from "lucide-react";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function OwnerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, data] = await Promise.all([
    searchParams,
    getAttendanceOverview(me.gymId),
  ]);

  if (!data) return null;

  return (
    <Shell
      title="Attendance Desk"
      subtitle="Reception QR code scanner, daily check-ins, and visit logs"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error && <Notice tone="danger">The attendance QR code could not be rotated.</Notice>}
      {notice && (
        <Notice tone="ok">
          A new reception QR code is active! Any previous printed posters are now revoked.
        </Notice>
      )}

      {/* Attendance Metrics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today's Check-ins"
          value={data.today.length}
          icon={CalendarCheck}
          tone="brand"
          subtext="Members checked in today"
        />
        <StatCard
          label="Recent Visits Logged"
          value={data.recent.length}
          icon={History}
          tone="brand"
          subtext="Recent check-in feed"
        />
        <StatCard
          label="Local Timezone"
          value={data.gym.timezone}
          icon={Clock}
          tone="neutral"
          subtext="Active calendar date calculation"
        />
      </section>

      {/* QR Poster & Reception Section */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: QR Code Display Card */}
        <div className="lg:col-span-5">
          <Card className="p-6 text-center">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <div className="flex items-center gap-2">
                <QrCode className="size-4 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">Reception QR Poster</h3>
              </div>
              <Badge tone="success" size="sm" dot>
                Live Code
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-line shadow-sm inline-block mx-auto">
              <GymQr token={data.gym.attendanceToken} label={data.gym.name} />
            </div>

            <div className="mt-5 space-y-2 text-left">
              <h4 className="font-display font-bold text-sm text-ink">{data.gym.name} Attendance QR</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Display this code at reception or print it as a poster. Members scan it using their phone
                camera in their signed-in Member Portal. Each active membership is permitted one check-in per local day.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
              <div className="flex-1">
                <PrintButton />
              </div>
              <form action={rotateAttendanceTokenAction} className="flex-1">
                <Button
                  variant="secondary"
                  size="md"
                  type="submit"
                  icon={RotateCw}
                  className="w-full text-xs"
                >
                  Rotate QR
                </Button>
              </form>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted text-center">
              Rotating invalidates previous posters instantly.
            </p>
          </Card>
        </div>

        {/* Right Column: Today's Check-ins & Recent Activity */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Check-ins */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">
                  Today&apos;s Check-ins
                </h3>
              </div>
              <Badge tone="brand" size="sm">
                {data.today.length} today
              </Badge>
            </div>

            <div className="divide-y divide-line/60">
              {data.today.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={entry.member.user.name} size="sm" />
                    <span className="font-bold text-sm text-ink">
                      {entry.member.user.name}
                    </span>
                  </div>
                  <time
                    dateTime={entry.checkedInAt.toISOString()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand"
                  >
                    <Clock className="size-3.5" />
                    {new Intl.DateTimeFormat("en-IN", {
                      timeStyle: "short",
                      timeZone: data.gym.timezone,
                    }).format(entry.checkedInAt)}
                  </time>
                </div>
              ))}

              {data.today.length === 0 && (
                <div className="py-10 text-center text-sm text-ink-muted">
                  No members have checked in today yet. When members scan the QR poster, check-ins will update here.
                </div>
              )}
            </div>
          </Card>

          {/* Recent Attendance Feed */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <History className="size-4 text-brand" />
                <h3 className="font-display text-base font-bold text-ink">Recent Attendance Log</h3>
              </div>
              <span className="text-xs text-ink-muted">Past visits</span>
            </div>

            <div className="divide-y divide-line/60">
              {data.recent.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
                >
                  <span className="text-sm font-medium text-ink">
                    {entry.member.user.name}
                  </span>
                  <time
                    dateTime={entry.checkedInAt.toISOString()}
                    className="text-xs text-ink-muted"
                  >
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: data.gym.timezone,
                    }).format(entry.checkedInAt)}
                  </time>
                </div>
              ))}

              {data.recent.length === 0 && (
                <div className="py-6 text-center text-sm text-ink-muted">
                  No previous check-in records found.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
