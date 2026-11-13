import { MEMBER_NAV, Shell } from "@/components/shell";
import { Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { CheckInPanel } from "../check-in-panel";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

const messages: Record<string, { tone: "ok" | "warn" | "danger"; text: string }> = {
  "checked-in": { tone: "ok", text: "Attendance recorded. You can check in once per local day." },
  "already-checked-in": { tone: "warn", text: "Your attendance was already recorded today." },
  "membership-required": { tone: "danger", text: "An active membership is required to check in." },
  "invalid-qr": { tone: "danger", text: "That is not this gym's current QR code." },
  failed: { tone: "danger", text: "We could not record attendance. Please try again." },
};

export default async function MemberAttendancePage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const [{ result }, data] = await Promise.all([searchParams, getMemberPortal(me.gymId, me.userId)]);
  if (!data?.member) return null;
  const message = result ? messages[result] : undefined;
  return (
    <Shell title="Attendance" subtitle="Check in at your gym" who={data.member.name} nav={MEMBER_NAV}>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <section className="grid gap-8 border-b border-line pb-8 md:grid-cols-2">
        <div><h2 className="font-display text-xl font-bold">Check in</h2><p className="mb-5 mt-1 text-sm text-muted">Scan the gym&apos;s reception QR with your camera, or enter its code.</p><CheckInPanel /></div>
        <div><h2 className="font-display text-xl font-bold">Your membership</h2>{data.current ? <div className="mt-3 border-y border-line py-4"><p className="font-semibold">{data.current.plan.name}</p><p className="mt-1 text-sm text-muted">Valid through {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(data.current.endsAt)}</p></div> : <p className="mt-3 text-sm text-muted">No current membership.</p>}</div>
      </section>
      <section><h2 className="font-display text-xl font-bold">Check-in history</h2><ul className="mt-3 divide-y divide-line border-y border-line">{data.attendance.map((entry) => <li key={entry.id} className="flex justify-between gap-4 py-3"><time dateTime={entry.checkedInAt.toISOString()}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(entry.checkedInAt)}</time><span className="text-sm text-muted">{new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(entry.checkedInAt)}</span></li>)}{data.attendance.length === 0 && <li className="py-5 text-sm text-muted">No check-ins recorded.</li>}</ul></section>
    </Shell>
  );
}