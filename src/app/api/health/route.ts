import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.ok) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        hasDatabaseUrl: dbHealth.hasDatabaseUrl,
        error: dbHealth.error,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "healthy",
    database: "connected",
    dbLatencyMs: dbHealth.latencyMs,
    totalLatencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  });
}
