import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDb, db, withPlatform, withTenant } from "@/server/db";
import { audit, auditTx } from "@/server/audit";
import { admin, join, makeGym, makeUser, resetDb, rows } from "../helpers/admin";

let A: string, B: string;
beforeEach(async () => {
  await resetDb();
  A = await makeGym({ name: "Gym A" });
  B = await makeGym({ name: "Gym B" });
  await join(A, await makeUser({ phone: "+919000000001" }), "MEMBER");
  await join(B, await makeUser({ phone: "+919000000002" }), "MEMBER");
});
afterAll(async () => { await disconnectDb(); await admin.end(); });

describe("row-level security", () => {
  it("fails closed: the plain client sees no tenant rows at all", async () => {
    expect(await db().gym.findMany()).toHaveLength(0);
    expect(await db().gymUser.findMany()).toHaveLength(0);
    expect(await db().subscription.findMany()).toHaveLength(0);
    expect(await db().gymRegistrationRequest.findMany()).toHaveLength(0);
  });

  it("a tenant sees only its own rows", async () => {
    await withTenant(A, async (tx) => {
      expect((await tx.gym.findMany()).map((g) => g.name)).toEqual(["Gym A"]);
      expect(await tx.gymUser.count()).toBe(1);
      expect((await tx.subscription.findMany()).every((s) => s.gymId === A)).toBe(true);
      expect(await tx.membershipPlan.count()).toBe(0);
      expect(await tx.membership.count()).toBe(0);
      expect(await tx.payment.count()).toBe(0);
      expect(await tx.attendance.count()).toBe(0);
    });
  });

  it("a tenant cannot read another gym by id", async () => {
    await withTenant(A, async (tx) => {
      expect(await tx.gym.findUnique({ where: { id: B } })).toBeNull();
      expect(await tx.gymUser.findMany({ where: { gymId: B } })).toHaveLength(0);
      expect(await tx.membershipPlan.findMany({ where: { gymId: B } })).toHaveLength(0);
      expect(await tx.membership.findMany({ where: { gymId: B } })).toHaveLength(0);
      expect(await tx.payment.findMany({ where: { gymId: B } })).toHaveLength(0);
      expect(await tx.attendance.findMany({ where: { gymId: B } })).toHaveLength(0);
    });
  });

  it("a tenant cannot write into another gym", async () => {
    const intruder = await makeUser({ phone: "+919000000003" });
    await expect(
      withTenant(A, (tx) => tx.gymUser.create({ data: { gymId: B, userId: intruder, role: "MEMBER" } })),
    ).rejects.toThrow();
    const r = await withTenant(A, (tx) => tx.gym.updateMany({ where: { id: B }, data: { name: "pwned" } }));
    expect(r.count).toBe(0);
    expect((await rows<{ name: string }>(`SELECT name FROM "Gym" WHERE id=$1`, [B]))[0]!.name).toBe("Gym B");
  });

  it("a tenant cannot move its own row into another gym", async () => {
    await expect(
      withTenant(A, (tx) => tx.gymUser.updateMany({ where: { gymId: A }, data: { gymId: B } })),
    ).rejects.toThrow();
  });

  it("tenant context does not leak between transactions on pooled connections", async () => {
    await withTenant(A, async (tx) => expect(await tx.gym.count()).toBe(1));
    expect(await db().gym.count()).toBe(0);
    await withTenant(B, async (tx) => expect((await tx.gym.findFirst())?.name).toBe("Gym B"));
  });

  it("platform work sees every tenant", async () => {
    expect(await withPlatform((tx) => tx.gym.count())).toBe(2);
  });

  it("rejects anything that is not a UUID as a tenant id (no SQL injection surface)", async () => {
    await expect(withTenant("x'; DROP TABLE \"Gym\"; --", async () => 1)).rejects.toThrow("invalid gym id");
  });
});

describe("audit log", () => {
  it("is append-only for the application role", async () => {
    await audit({ action: "test.event", gymId: A });
    await expect(db().$executeRaw`UPDATE "AuditLog" SET "action" = 'edited'`).rejects.toThrow();
    await expect(db().$executeRaw`DELETE FROM "AuditLog"`).rejects.toThrow();
    await expect(db().$executeRaw`TRUNCATE "AuditLog"`).rejects.toThrow();
    expect(await rows(`SELECT 1 FROM "AuditLog"`)).toHaveLength(1);
  });

  it("tenants read only their own trail and cannot forge another gym's", async () => {
    await audit({ action: "a.event", gymId: A });
    await audit({ action: "b.event", gymId: B });
    await audit({ action: "platform.event" });
    await withTenant(A, async (tx) => {
      expect((await tx.auditLog.findMany()).map((r) => r.action)).toEqual(["a.event"]);
      await expect(auditTx(tx, { action: "forged", gymId: B })).rejects.toThrow();
    });
  });

  it("rolls back with the surrounding transaction", async () => {
    await expect(
      withTenant(A, async (tx) => {
        await auditTx(tx, { action: "will.rollback", gymId: A });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await rows(`SELECT 1 FROM "AuditLog"`)).toHaveLength(0);
  });
});

describe("database constraints", () => {
  it("rejects malformed identifiers and impossible subscription periods", async () => {
    await expect(admin.query(`INSERT INTO "User"("name","email","updatedAt") VALUES ('x','Mixed@Case.com',now())`)).rejects.toThrow();
    await expect(admin.query(`INSERT INTO "User"("name","phone","updatedAt") VALUES ('x','9876543210',now())`)).rejects.toThrow();
    await expect(admin.query(`INSERT INTO "User"("name","updatedAt") VALUES ('x',now())`)).rejects.toThrow();
    await expect(admin.query(`INSERT INTO "Gym"("name","slug","updatedAt") VALUES ('x','Bad Slug',now())`)).rejects.toThrow();
  });
});
