import type { GymStatus, SubscriptionStatus } from "@/generated/prisma/client";
import type { Tx } from "../db";

/**
 * What a gym may do right now.
 *  ACTIVE    – activated by FIXIA and inside a paid subscription period: full operation.
 *  PENDING   – registered, not yet activated by FIXIA: limited access.
 *  EXPIRED   – activated before, but no subscription covers today: limited access (assumption, see docs).
 *  SUSPENDED – blocked by FIXIA: nothing but a status screen.
 */
export type GymAccess = "ACTIVE" | "PENDING" | "EXPIRED" | "SUSPENDED";

export function deriveGymAccess(input: {
  gymStatus: GymStatus;
  subscriptions: { status: SubscriptionStatus; startsAt: Date; endsAt: Date }[];
  now: Date;
}): GymAccess {
  if (input.gymStatus === "SUSPENDED") return "SUSPENDED";
  if (input.gymStatus === "PENDING") return "PENDING";
  const covered = input.subscriptions.some(
    (s) => s.status === "ACTIVE" && s.startsAt <= input.now && input.now < s.endsAt,
  );
  return covered ? "ACTIVE" : "EXPIRED";
}

/** Must be called inside withTenant/withPlatform: both tables are under row-level security. */
export async function loadGymAccess(tx: Tx, gymId: string, now = new Date()): Promise<GymAccess | null> {
  const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { status: true } });
  if (!gym) return null;
  const subscriptions = await tx.subscription.findMany({
    where: { gymId, status: "ACTIVE", endsAt: { gt: now } },
    select: { status: true, startsAt: true, endsAt: true },
  });
  return deriveGymAccess({ gymStatus: gym.status, subscriptions, now });
}
