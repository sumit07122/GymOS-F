import { z } from "zod";
import { audit } from "../audit";
import { db } from "../db";
import { verifyPassword } from "../security/password";
import { hitAll } from "../security/ratelimit";
import { createSession, listUserGyms, type SessionKind } from "./sessions";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export type PasswordLoginResult =
  | { ok: true; token: string; expiresAt: Date; kind: SessionKind; needsGymSelection: boolean }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED"; retryAfterSec?: number };

/** Platform admins and gym owners. One generic failure for every kind of wrong, so accounts cannot be probed. */
export async function loginWithPassword(input: {
  email: string;
  password: string;
  ip: string;
  userAgent?: string | null;
  now?: Date;
}): Promise<PasswordLoginResult> {
  const invalid = (): PasswordLoginResult => ({ ok: false, reason: "INVALID_CREDENTIALS" });
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success || input.password.length === 0 || input.password.length > 128) return invalid();
  const email = parsed.data;

  const blocked = await hitAll([
    [`login:email:${email}`, { limit: 10, windowSec: 900 }],
    [`login:ip:${input.ip}`, { limit: 40, windowSec: 900 }],
  ]);
  if (blocked) return { ok: false, reason: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };

  const user = await db().user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(user?.passwordHash, input.password);
  if (!user || !passwordOk || user.status !== "ACTIVE") {
    await audit({ action: "auth.login_failed", ip: input.ip, actorUserId: user?.id ?? null });
    return invalid();
  }

  let kind: SessionKind;
  let gymId: string | null = null;
  let needsGymSelection = false;
  if (user.globalRole === "PLATFORM_ADMIN") {
    kind = "PLATFORM_ADMIN";
  } else {
    const gyms = await listUserGyms(user.id, ["OWNER"]);
    if (gyms.length === 0) {
      await audit({ action: "auth.login_failed", ip: input.ip, actorUserId: user.id, metadata: { why: "no_gym" } });
      return invalid();
    }
    kind = "OWNER";
    gymId = gyms.length === 1 ? gyms[0]!.gymId : null;
    needsGymSelection = gyms.length > 1;
  }

  const session = await createSession({ userId: user.id, gymId, kind, ip: input.ip, userAgent: input.userAgent, now: input.now });
  await audit({ action: `auth.${kind.toLowerCase()}_login`, actorUserId: user.id, gymId, ip: input.ip });
  return { ok: true, ...session, kind, needsGymSelection };
}
