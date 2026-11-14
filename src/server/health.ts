// Health check service for FIXIA GymOS (v1.0-prod)
import { db } from "./db";

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string; hasDatabaseUrl?: boolean }> {
  const t0 = Date.now();
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0);
  try {
    await db().$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t0, hasDatabaseUrl };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[health:db:ping_failed]", err);
    return { ok: false, latencyMs: Date.now() - t0, error: errorMsg, hasDatabaseUrl };
  }
}

