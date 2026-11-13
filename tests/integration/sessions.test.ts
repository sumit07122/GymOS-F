import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDb } from "@/server/db";
import { createSession, hashToken, revokeAllSessions, revokeSessionToken, validateSessionToken, SESSION_POLICY } from "@/server/auth/sessions";
import { admin, makeUser, resetDb, rows } from "../helpers/admin";

let userId: string;
beforeEach(async () => { await resetDb(); userId = await makeUser({ email: "o@x.in", password: "correct horse battery" }); });
afterAll(async () => { await disconnectDb(); await admin.end(); });

const mk = (kind: "OWNER" | "MEMBER" | "PLATFORM_ADMIN", now?: Date) => createSession({ userId, gymId: null, kind, now });

describe("sessions", () => {
  it("stores only a hash of the token", async () => {
    const { token } = await mk("OWNER");
    const [row] = await rows<{ tokenHash: string }>(`SELECT "tokenHash" FROM "Session"`);
    expect(row!.tokenHash).toBe(hashToken(token));
    expect(row!.tokenHash).not.toContain(token);
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("validates a live session and rejects garbage", async () => {
    const { token } = await mk("OWNER");
    expect((await validateSessionToken(token))?.userId).toBe(userId);
    expect(await validateSessionToken(undefined)).toBeNull();
    expect(await validateSessionToken("short")).toBeNull();
    expect(await validateSessionToken(token + "x")).toBeNull();
  });

  it("revocation takes effect immediately", async () => {
    const { token } = await mk("OWNER");
    await revokeSessionToken(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("revoke-all signs the user out everywhere, optionally keeping one", async () => {
    const a = await mk("OWNER"); const b = await mk("OWNER");
    const keep = (await validateSessionToken(b.token))!.sessionId;
    await revokeAllSessions(userId, keep);
    expect(await validateSessionToken(a.token)).toBeNull();
    expect(await validateSessionToken(b.token)).not.toBeNull();
  });

  it("enforces absolute expiry", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const { token } = await mk("PLATFORM_ADMIN", t0);
    const later = new Date(t0.getTime() + SESSION_POLICY.PLATFORM_ADMIN.absoluteMs + 1000);
    expect(await validateSessionToken(token, later)).toBeNull();
  });

  it("enforces idle timeout, and activity extends it", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const { token } = await mk("PLATFORM_ADMIN", t0);
    const idle = SESSION_POLICY.PLATFORM_ADMIN.idleMs;
    const t1 = new Date(t0.getTime() + idle - 60_000);
    expect(await validateSessionToken(token, t1)).not.toBeNull(); // touches lastSeenAt
    const t2 = new Date(t1.getTime() + idle - 60_000);
    expect(await validateSessionToken(token, t2)).not.toBeNull();
    const t3 = new Date(t2.getTime() + idle + 1000);
    expect(await validateSessionToken(token, t3)).toBeNull();
  });

  it("a disabled user's sessions stop working", async () => {
    const { token } = await mk("OWNER");
    await admin.query(`UPDATE "User" SET status='DISABLED' WHERE id=$1`, [userId]);
    expect(await validateSessionToken(token)).toBeNull();
  });
});
