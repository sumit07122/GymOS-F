import { MEMBER_NAV, Shell } from "@/components/shell";
import {
  Notice,
  Card,
  Badge,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { CheckInPanel } from "../check-in-panel";
import {
  QrCode,
  CalendarCheck,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

const messages: Record<string, { tone: "ok" | "warn" | "danger"; text: string }> = {
  "checked-in": {
    tone: "ok",
    text: "Attendance confirmed! You are checked in for today.",
  },
  "checked-out": {
    tone: "ok",
    text: "Check-out recorded! Your visit duration has been logged.",
  },
  "already-checked-in": {
    tone: "warn",
    text: "You recently checked in. Scan again at the end of your workout to log your check-out.",
  },
  "membership-required": {
    tone: "danger",
    text: "An active membership is required to check in. Please renew at the gym desk.",
  },
  "membership-expired": {
    tone: "danger",
    text: "Your membership has expired. Please visit reception to renew your plan.",
  },
  "invalid-qr": {
    tone: "danger",
    text: "Invalid or expired QR code. Please scan the live reception screen code.",
  },
  failed: {
    tone: "danger",
    text: "Attendance recording failed. Please try again or ask reception.",
  },
};

export default async function MemberAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const [{ result }, data] = await Promise.all([
    searchParams,
    getMemberPortal(me.gymId, me.userId),
  ]);

  if (!data?.member) return null;
  const message = result ? messages[result] : undefined;

  return (
    <Shell
      title="Attendance Check-in"
      subtitle="Scan the reception QR poster or enter the daily code"
      who={data.member.name}
      nav={MEMBER_NAV}
    >
      {/* Alert Notice */}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section className="grid gap-8 md:grid-cols-12 items-start">
        {/* Left: Check-in Scanner */}
        <div className="md:col-span-7">
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <QrCode className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  Scan Reception QR
                </h2>
                <p className="text-xs text-ink-muted">
                  Position your camera over the code on the reception desk
                </p>
              </div>
            </div>

            <CheckInPanel />
          </Card>
        </div>

        {/* Right: Current Membership Status */}
        <div className="md:col-span-5 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-light text-brand">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink">
                  Membership Status
                </h3>
                <p className="text-xs text-ink-muted">Required for check-in</p>
              </div>
            </div>

            {data.current ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">
                    {data.current.plan.name}
                  </span>
                  <Badge tone="success" size="sm" dot>
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  Valid through{" "}
                  <strong className="text-ink">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                    }).format(data.current.endsAt)}
                  </strong>
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-danger font-medium">
                No active membership plan. Check-in is paused until renewed.
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Check-in History */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-brand" />
            <h3 className="font-display text-base font-bold text-ink">
              Your Check-in History
            </h3>
          </div>
          <Badge tone="brand" size="sm">
            {data.attendance.length} total visits
          </Badge>
        </div>

        <div className="divide-y divide-line/60">
          {data.attendance.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-3 text-xs first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-success" />
                <time
                  dateTime={entry.checkedInAt.toISOString()}
                  className="font-bold text-ink"
                >
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(
                    entry.checkedInAt
                  )}
                </time>
              </div>
              <span className="flex items-center gap-1 text-ink-muted">
                <Clock className="size-3" />
                {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(
                  entry.checkedInAt
                )}
              </span>
            </div>
          ))}

          {data.attendance.length === 0 && (
            <div className="py-8 text-center text-sm text-ink-muted">
              No gym check-ins recorded yet. Scan the reception code to start your streak!
            </div>
          )}
        </div>
      </Card>
    </Shell>
  );
}
