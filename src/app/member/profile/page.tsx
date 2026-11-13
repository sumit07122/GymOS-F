import { MEMBER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  Notice,
  Card,
  Avatar,
  Badge,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getMemberPortal } from "@/server/gyms/operations";
import { updateMemberProfileAction } from "../actions";
import {
  User,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  const [{ error, notice }, data] = await Promise.all([
    searchParams,
    getMemberPortal(me.gymId, me.userId),
  ]);

  if (!data?.member) return null;

  return (
    <Shell
      title="Member Profile"
      subtitle="Personal information and portal sign-in credentials"
      who={data.member.name}
      nav={MEMBER_NAV}
    >
      {/* Alert Notices */}
      {error && <Notice tone="danger">Please enter a valid full name with at least two characters.</Notice>}
      {notice && <Notice tone="ok">Profile details updated successfully.</Notice>}

      <div className="max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-4 border-b border-line pb-6 mb-6">
            <Avatar name={data.member.name} size="lg" />
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                {data.member.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge tone="success" size="sm" dot>
                  Verified Member
                </Badge>
                <span className="text-xs text-ink-muted">
                  Gym User #{me.userId.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>

          <form action={updateMemberProfileAction} className="space-y-5">
            <Field
              label="Full name"
              name="name"
              defaultValue={data.member.name}
              required
              minLength={2}
              maxLength={80}
              icon={User}
              placeholder="Your full legal name"
            />

            <Field
              label="Login mobile number"
              name="phone"
              type="tel"
              value={data.member.phone ?? ""}
              readOnly
              icon={Phone}
              hint="Your login phone number is verified via OTP. Visit the gym desk if your phone number changes."
            />

            <div className="border-t border-line/60 pt-4 flex items-center justify-between">
              <span className="text-xs text-ink-muted flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand" />
                Secured by GymOS Auth
              </span>
              <Button type="submit" icon={Save}>
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
