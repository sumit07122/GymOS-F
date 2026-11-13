import Link from "next/link";
import { Shell } from "@/components/shell";
import { Notice, Card, Button, Badge } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";
import { Building2, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata = { title: "Account status" };
export const dynamic = "force-dynamic";

export default async function GymStatus() {
  const me = await requireGym({ roles: ["OWNER", "MEMBER"], access: "any" });
  const status = me.gymAccess;

  const copy = {
    ACTIVE: "Your gym workspace is active and operational. All features are accessible.",
    PENDING: "This gym is pending activation by FIXIA Platform Administration. Member records and payments will unlock upon approval.",
    EXPIRED: "This gym's SaaS subscription has expired. Please contact FIXIA to renew access.",
    SUSPENDED: "This gym's account is currently suspended. Please contact FIXIA Platform Support.",
  }[status];

  const tone = status === "ACTIVE" ? "ok" : status === "PENDING" ? "warn" : "danger";

  return (
    <Shell title="Workspace Status" subtitle="Access verification and subscription condition" who={me.name}>
      <div className="max-w-2xl">
        <Card className="p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-light text-brand">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Subscription State</h2>
                <p className="text-xs text-ink-muted">GymOS Tenant Verification</p>
              </div>
            </div>
            <Badge tone={tone === "ok" ? "success" : tone === "warn" ? "warning" : "danger"} size="md" dot>
              {status}
            </Badge>
          </div>

          <Notice tone={tone}>{copy}</Notice>

          <div className="pt-2 flex items-center justify-between border-t border-line/60">
            <span className="text-xs text-ink-muted">Role: {me.kind}</span>
            <Link href={me.kind === "OWNER" && status !== "SUSPENDED" ? "/owner" : me.kind === "MEMBER" && status === "ACTIVE" ? "/member" : "/"}>
              <Button size="sm" iconRight={ArrowRight}>
                Continue to Workspace
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
