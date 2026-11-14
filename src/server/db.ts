import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

export type Tx = Prisma.TransactionClient;

const g = globalThis as unknown as { __gymosDb?: PrismaClient };

/** Plain client. Tables under row-level security return NOTHING through it: use withTenant/withPlatform. */
export function db(): PrismaClient {
  return (g.__gymosDb ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: env().DATABASE_URL }),
  }));
}

export async function disconnectDb() {
  await g.__gymosDb?.$disconnect();
  g.__gymosDb = undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run tenant work. The gym id MUST come from the authenticated session (AuthContext.gymId),
 * never from request input. The database enforces the boundary on top of this (RLS).
 */
export async function withTenant<T>(gymId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!UUID.test(gymId)) throw new Error("withTenant: invalid gym id");
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.gym_id', ${gymId}, true)`;
      return fn(tx);
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Cross-tenant work (authentication lookups, FIXIA admin operations, audit appends).
 * Restricted by tests/platform-usage.test.ts to an allow-list of modules.
 */
export async function withPlatform<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.bypass', 'on', true)`;
      return fn(tx);
    },
    { maxWait: 15000, timeout: 30000 }
  );
}
