import { withTenant } from "../db";

/** Tenant-scoped read. `gymId` must come from the authenticated AuthContext. */
export async function getGymSummary(gymId: string) {
  return withTenant(gymId, (tx) =>
    tx.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, city: true, status: true } }),
  );
}
