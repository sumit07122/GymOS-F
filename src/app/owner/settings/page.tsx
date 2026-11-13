import { OWNER_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getGymSettings } from "@/server/gyms/operations";
import { updateGymSettingsAction } from "../actions";

export const metadata = { title: "Gym settings" };
export const dynamic = "force-dynamic";

export default async function GymSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["OWNER"], access: "limited" });
  const [{ error, notice }, gym] = await Promise.all([searchParams, getGymSettings(me.gymId)]);
  if (!gym) return null;
  return (
    <Shell title="Gym settings" subtitle="Workspace identity and local operating time" who={me.name} nav={OWNER_NAV}>
      {error && <Notice>Check the profile details and IANA timezone value.</Notice>}
      {notice && <Notice tone="ok">Gym profile saved.</Notice>}
      {me.gymAccess !== "ACTIVE" && <Notice tone="warn">You can update profile details while your workspace is awaiting activation. Operational controls stay locked until FIXIA activates a subscription.</Notice>}
      <form action={updateGymSettingsAction} className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Gym name" name="name" defaultValue={gym.name} required maxLength={100} />
        <Field label="Gym phone" name="phone" type="tel" defaultValue={gym.phone ?? ""} maxLength={30} />
        <Field label="City" name="city" defaultValue={gym.city ?? ""} maxLength={80} />
        <Field label="Timezone" name="timezone" defaultValue={gym.timezone} required hint="Use an IANA timezone, e.g. Asia/Kolkata." />
        <div className="sm:col-span-2"><Field label="Address" name="address" defaultValue={gym.address ?? ""} maxLength={200} /></div>
        <div><Button type="submit">Save gym profile</Button></div>
      </form>
    </Shell>
  );
}