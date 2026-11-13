import { OWNER_NAV, Shell } from "@/components/shell";
import {
  Button,
  Field,
  Notice,
  Card,
  Badge,
} from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { getGymSettings } from "@/server/gyms/operations";
import { updateGymSettingsAction } from "../actions";
import {
  Settings,
  Building2,
  Clock,
  MapPin,
  Phone,
  Save,
  Globe,
} from "lucide-react";

export const metadata = { title: "Gym settings" };
export const dynamic = "force-dynamic";

export default async function GymSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await requireGym({ roles: ["OWNER"], access: "limited" });
  const [{ error, notice }, gym] = await Promise.all([
    searchParams,
    getGymSettings(me.gymId),
  ]);

  if (!gym) return null;

  return (
    <Shell
      title="Gym Workspace Settings"
      subtitle="Business identity, contact details, and operating timezone"
      who={me.name}
      nav={OWNER_NAV}
    >
      {/* Alert Notices */}
      {error && (
        <Notice tone="danger">
          Please check the profile details and ensure timezone is a valid IANA identifier (e.g. Asia/Kolkata).
        </Notice>
      )}

      {notice && <Notice tone="ok">Gym profile settings saved successfully.</Notice>}

      {me.gymAccess !== "ACTIVE" && (
        <Notice tone="warn">
          You can update profile details while your workspace is awaiting activation. Operational controls
          stay locked until FIXIA Platform Admin activates your subscription.
        </Notice>
      )}

      {/* Main Settings Form Card */}
      <Card className="p-6 max-w-4xl">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Gym Profile & Location</h2>
              <p className="text-xs text-ink-muted">Displayed on member receipts and check-in portals</p>
            </div>
          </div>
          <Badge tone="brand" size="sm">
            Slug: {gym.slug}
          </Badge>
        </div>

        <form action={updateGymSettingsAction} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Gym business name"
              name="name"
              defaultValue={gym.name}
              required
              maxLength={100}
              placeholder="e.g. Matrix Gym & Fitness Club"
              icon={Building2}
            />

            <Field
              label="Official contact phone"
              name="phone"
              type="tel"
              defaultValue={gym.phone ?? ""}
              maxLength={30}
              placeholder="+91 98765 43210"
              icon={Phone}
            />

            <Field
              label="City"
              name="city"
              defaultValue={gym.city ?? ""}
              maxLength={80}
              placeholder="e.g. Mumbai, Bangalore, Delhi"
              icon={MapPin}
            />

            <Field
              label="Operating timezone"
              name="timezone"
              defaultValue={gym.timezone}
              required
              hint="Use standard IANA timezone (e.g. Asia/Kolkata)"
              icon={Clock}
            />

            <div className="sm:col-span-2">
              <Field
                label="Full gym physical address"
                name="address"
                defaultValue={gym.address ?? ""}
                maxLength={200}
                placeholder="Floor, building, street, area, pincode"
                icon={MapPin}
              />
            </div>
          </div>

          <div className="border-t border-line/60 pt-4 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              Changes reflect immediately across member portals and receipts.
            </p>
            <Button type="submit" icon={Save}>
              Save Gym Profile
            </Button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}
