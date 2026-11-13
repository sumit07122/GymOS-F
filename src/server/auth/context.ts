import { withTenant } from "../db";
import { loadGymAccess } from "../subscriptions/access";
import type { AuthContext } from "./authorize";
import { validateSessionToken } from "./sessions";

/**
 * Builds the caller's identity from the session cookie token. Roles and gym access are read from the
 * database on every request: nothing about authority is trusted from the cookie or the client.
 */
export async function resolveContext(token: string | undefined, now = new Date()): Promise<AuthContext | null> {
  const s = await validateSessionToken(token, now);
  if (!s) return null;
  const base = { userId: s.userId, sessionId: s.sessionId, name: s.user.name };

  if (s.user.globalRole === "PLATFORM_ADMIN") return { kind: "PLATFORM_ADMIN", ...base };
  if (!s.gymId) return { kind: "NEEDS_GYM", ...base };

  const gymId = s.gymId;
  return withTenant(gymId, async (tx) => {
    const membership = await tx.gymUser.findUnique({
      where: { gymId_userId: { gymId, userId: s.userId } },
      select: { role: true, status: true },
    });
    if (!membership || membership.status !== "ACTIVE") return null;
    const gymAccess = await loadGymAccess(tx, gymId, now);
    if (!gymAccess) return null;
    return { kind: membership.role, ...base, gymId, gymAccess } satisfies AuthContext;
  });
}
