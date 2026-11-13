import { db } from "../db";

export type Limit = { limit: number; windowSec: number };
export type HitResult = { allowed: boolean; count: number; retryAfterSec: number };

/** Fixed-window counter in Postgres. Every call counts, allowed or not. */
export async function hit(key: string, { limit, windowSec }: Limit, now = new Date()): Promise<HitResult> {
  const windowMs = windowSec * 1000;
  const start = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${start}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  if (Math.random() < 0.01) void purgeOldRateLimits(now).catch(() => {});
  return {
    allowed: count <= limit,
    count,
    retryAfterSec: Math.max(1, Math.ceil((start.getTime() + windowMs - now.getTime()) / 1000)),
  };
}

/** Returns the first exceeded limit, or null when all pass. All limits are always incremented. */
export async function hitAll(checks: [key: string, limit: Limit][]): Promise<HitResult | null> {
  let blocked: HitResult | null = null;
  for (const [key, limit] of checks) {
    const r = await hit(key, limit);
    if (!r.allowed && !blocked) blocked = r;
  }
  return blocked;
}

export async function purgeOldRateLimits(now = new Date()) {
  await db().rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 24 * 3600_000) } } });
}
