import { MEMBER_NAV, Shell } from "@/components/shell";
import { Button, Field, Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { updateMemberProfileAction } from "../actions";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const [{ error, notice }, data] = await Promise.all([searchParams, getMemberPortal(me.gymId, me.userId)]);
  if (!data?.member) return null;
  return (
    <Shell title="My profile" subtitle="Basic member details" who={data.member.name} nav={MEMBER_NAV}>
      {error && <Notice>Enter a valid name with at least two characters.</Notice>}
      {notice && <Notice tone="ok">Profile saved.</Notice>}
      <form action={updateMemberProfileAction} className="grid max-w-lg gap-4">
        <Field label="Full name" name="name" defaultValue={data.member.name} required minLength={2} maxLength={80} />
        <Field label="Mobile number" name="phone" type="tel" value={data.member.phone ?? ""} readOnly hint="Contact your gym if your login number needs to change." />
        <Button type="submit">Save profile</Button>
      </form>
    </Shell>
  );
}