import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui";
import { requireSignedIn } from "@/server/auth/guards";
import { listUserGyms } from "@/server/auth/sessions";
import { selectGymAction } from "../login/actions";

export const metadata = { title: "Choose a gym" };
export const dynamic = "force-dynamic";

export default async function SelectGym() {
  const me = await requireSignedIn();
  if (me.kind !== "NEEDS_GYM") redirect("/");
  const gyms = await listUserGyms(me.userId, ["OWNER", "MEMBER"]);
  return (
    <Shell title="Choose a gym" subtitle="You belong to more than one gym." who={me.name}>
      <ul className="space-y-3">
        {gyms.map((g) => (
          <li key={g.gymId}>
            <form action={selectGymAction} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
              <input type="hidden" name="gymId" value={g.gymId} />
              <span className="font-semibold">{g.gym.name}</span>
              <Button type="submit" className="h-9 px-4 text-sm">Open</Button>
            </form>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
