import { db } from "./db";

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Date.now();
  try {
    await db().$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error("[health:db:ping_failed]", err);
    return { ok: false, latencyMs: Date.now() - t0 };
  }
}

