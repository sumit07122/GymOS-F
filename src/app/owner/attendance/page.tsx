import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Notice } from "@/components/ui";
import { GymQr } from "@/components/gym-qr";
import { PrintButton } from "@/components/print-button";
import { requireGym } from "@/server/auth/guards";
import { getAttendanceOverview } from "@/server/gyms/operations";
import { rotateAttendanceTokenAction } from "../actions";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function OwnerAttendancePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const [{ error, notice }, data] = await Promise.all([searchParams, getAttendanceOverview(me.gymId)]);
  if (!data) return null;
  return (
    <Shell title="Attendance" subtitle="Gym QR code and member check-ins" who={me.name} nav={OWNER_NAV}>
      {error && <Notice>QR code could not be rotated.</Notice>}
      {notice && <Notice tone="ok">A new QR code is active. Replace any printed copies.</Notice>}
      <section className="grid gap-8 border-b border-line pb-8 md:grid-cols-[auto_1fr]">
        <div className="print:block"><GymQr token={data.gym.attendanceToken} label={data.gym.name} /></div>
        <div className="max-w-lg">
          <h2 className="font-display text-xl font-bold">{data.gym.name} attendance QR</h2>
          <p className="mt-2 text-sm text-muted">Print this code and display it at reception. Members scan it from their signed-in portal. Each active membership can check in once per local calendar day.</p>
          <div className="mt-5 flex flex-wrap gap-3"><PrintButton /><form action={rotateAttendanceTokenAction}><Button type="submit" variant="ghost">Replace QR code</Button></form></div>
          <p className="mt-3 text-xs text-muted">Replacing the code immediately invalidates the old poster.</p>
        </div>
      </section>
      <section>
        <div className="flex items-end justify-between"><div><h2 className="font-display text-xl font-bold">Today&apos;s check-ins</h2><p className="mt-1 text-sm text-muted">{data.today.length} member{data.today.length === 1 ? "" : "s"} checked in today</p></div></div>
        <div className="mt-3 divide-y divide-line border-y border-line">{data.today.map((entry) => <div key={entry.id} className="flex justify-between gap-4 py-3"><span className="font-medium">{entry.member.user.name}</span><time dateTime={entry.checkedInAt.toISOString()} className="text-sm text-muted">{new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: data.gym.timezone }).format(entry.checkedInAt)}</time></div>)}{data.today.length === 0 && <p className="py-6 text-sm text-muted">No check-ins yet today.</p>}</div>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">Recent attendance</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">{data.recent.map((entry) => <div key={entry.id} className="flex justify-between gap-4 py-3"><span>{entry.member.user.name}</span><time dateTime={entry.checkedInAt.toISOString()} className="text-sm text-muted">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: data.gym.timezone }).format(entry.checkedInAt)}</time></div>)}{data.recent.length === 0 && <p className="py-6 text-sm text-muted">No attendance history yet.</p>}</div>
      </section>
    </Shell>
  );
}