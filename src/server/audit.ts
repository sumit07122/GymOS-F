import { Prisma } from "@/generated/prisma/client";
import { Tx, withPlatform } from "./db";

export type AuditEntry = {
  action: string;
  gymId?: string | null;
  actorUserId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
};

const row = (e: AuditEntry) => ({
  action: e.action,
  gymId: e.gymId ?? null,
  actorUserId: e.actorUserId ?? null,
  entityType: e.entityType ?? null,
  entityId: e.entityId ?? null,
  metadata: e.metadata ?? Prisma.JsonNull,
  ip: e.ip ?? null,
});

/** Append inside the caller's transaction, so the record commits or rolls back with the change. */
export async function auditTx(tx: Tx, entry: AuditEntry) {
  await tx.auditLog.create({ data: row(entry) });
}

/** Standalone append (authentication events and other things with no surrounding transaction). */
export async function audit(entry: AuditEntry) {
  await withPlatform((tx) => auditTx(tx, entry));
}
