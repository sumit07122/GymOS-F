import Link from "next/link";
import { Shell } from "@/components/shell";
import { Notice } from "@/components/ui";
import { requireGym } from "@/server/auth/guards";

export const metadata = { title: "Account status" };
export const dynamic = "force-dynamic";

export default async function GymStatus() {
  const me = await requireGym({ roles: ["OWNER", "MEMBER"], access: "any" });
  const a = me.gymAccess;
  const copy = {
    ACTIVE: "Everything is running normally.",
    PENDING: "This gym is waiting to be activated by FIXIA.",
    EXPIRED: "This gym's GymOS subscription has expired.",
    SUSPENDED: "This gym's account is suspended. Please contact FIXIA.",
  }[a];
  return (
    <Shell title="Account status" who={me.name}>
      <Notice tone={a === "ACTIVE" ? "ok" : "warn"}>{copy}</Notice>
      <Link className="text-sm font-semibold text-deep underline-offset-4 hover:underline" href={me.kind === "OWNER" && a !== "SUSPENDED" ? "/owner" : "/"}>Continue</Link>
    </Shell>
  );
}
