import { createHash, randomBytes } from "node:crypto";
import { db, withPlatform } from "../db";

export type SessionKind = "PLATFORM_ADMIN" | "OWNER" | "MEMBER";

/** Absolute lifetime and idle timeout per kind. Platform admins can reach every tenant, so they get the shortest. */
export const SESSION_POLICY: Record<SessionKind, { absoluteMs: number; idleMs: number }> = {
  PLATFORM_ADMIN: { absoluteMs: 12 * 3600_000, idleMs: 2 * 3600_000 },
  OWNER: { absoluteMs: 14 * 86400_000, idleMs: 3 * 86400_000 },
  MEMBER: { absoluteMs: 30 * 86400_000, idleMs: 14 * 86400_000 },
};

const TOUCH_INTERVAL_MS = 5 * 60_000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(input: {
  userId: string;
  gymId: string | null;
  kind: SessionKind;
  ip?: string | null;
  userAgent?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_POLICY[input.kind].absoluteMs);
  await db().session.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      gymId: input.gymId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
      lastSeenAt: now,
      ip: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

export type LiveSession = {
  sessionId: string;
  userId: string;
  gymId: string | null;
  user: { id: string; name: string; globalRole: "PLATFORM_ADMIN" | null };
};

/** Resolves an opaque cookie token to a live session, or null. Enforces revocation, absolute expiry, idle timeout. */
export async function validateSessionToken(token: string | undefined, now = new Date()): Promise<LiveSession | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const s = await db().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, globalRole: true, status: true } } },
  });
  if (!s || s.revokedAt || s.expiresAt <= now || s.user.status !== "ACTIVE") return null;
  const idleMs = SESSION_POLICY[s.kind].idleMs;
  if (s.lastSeenAt.getTime() + idleMs <= now.getTime()) return null;
  if (now.getTime() - s.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db().session.update({ where: { id: s.id }, data: { lastSeenAt: now } });
  }
  return {
    sessionId: s.id,
    userId: s.userId,
    gymId: s.gymId,
    user: { id: s.user.id, name: s.user.name, globalRole: s.user.globalRole },
  };
}

export async function revokeSessionToken(token: string | undefined, now = new Date()) {
  if (!token) return;
  await db().session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: now } });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string, now = new Date()) {
  await db().session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: now },
  });
}

/** Gyms the user may act in (active gym membership). Cross-tenant by nature, scoped by userId. */
export async function listUserGyms(userId: string, roles: ("OWNER" | "MEMBER")[]) {
  return withPlatform((tx) =>
    tx.gymUser.findMany({
      where: { userId, status: "ACTIVE", role: { in: roles } },
      select: { gymId: true, role: true, gym: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

/** Binds a session to a gym the user genuinely belongs to. */
export async function selectGymForSession(sessionId: string, userId: string, gymId: string): Promise<boolean> {
  const gyms = await listUserGyms(userId, ["OWNER", "MEMBER"]);
  if (!gyms.some((g) => g.gymId === gymId)) return false;
  await db().session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { gymId } });
  return true;
}
