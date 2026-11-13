import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, Card, Badge } from "@/components/ui";
import { requireSignedIn } from "@/server/auth/guards";
import { listUserGyms } from "@/server/auth/sessions";
import { selectGymAction } from "../login/actions";
import { Building2, ChevronRight, User } from "lucide-react";

export const metadata = { title: "Choose a gym" };
export const dynamic = "force-dynamic";

export default async function SelectGym() {
  const me = await requireSignedIn();
  if (me.kind !== "NEEDS_GYM") redirect("/");
  const gyms = await listUserGyms(me.userId, ["OWNER", "MEMBER"]);

  return (
    <Shell
      title="Choose a Workspace"
      subtitle="Your account is registered across multiple fitness centers"
      who={me.name}
    >
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-ink-muted">
          Select which gym workspace you want to open for this session:
        </p>

        <div className="space-y-3">
          {gyms.map((g) => (
            <Card key={g.gymId} className="p-5 transition-all hover:border-brand/40 hover:shadow-md">
              <form action={selectGymAction} className="flex items-center justify-between gap-4">
                <input type="hidden" name="gymId" value={g.gymId} />
                <div className="flex items-center gap-3.5">
                  <div className="grid size-11 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">
                      {g.gym.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge tone={g.role === "OWNER" ? "brand" : "neutral"} size="sm">
                        {g.role}
                      </Badge>
                      <Badge tone={g.gym.status === "ACTIVE" ? "success" : "warning"} size="sm" dot>
                        {g.gym.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button type="submit" size="sm" iconRight={ChevronRight}>
                  Open Workspace
                </Button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
