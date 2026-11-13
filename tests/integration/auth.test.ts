import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDb } from "@/server/db";
import { loginWithPassword } from "@/server/auth/login";
import { resolveContext } from "@/server/auth/context";
import { createSession, selectGymForSession, validateSessionToken } from "@/server/auth/sessions";
import { admin, join, makeGym, makeUser, resetDb, rows } from "../helpers/admin";

const PW = "correct horse battery";
const login = (email: string, password = PW, ip = "1.1.1.1") => loginWithPassword({ email, password, ip });
beforeEach(resetDb);
afterAll(async () => { await disconnectDb(); await admin.end(); });

describe("password login", () => {
  it("logs a platform admin in without a gym", async () => {
    await makeUser({ email: "root@fixia.in", password: PW, globalRole: "PLATFORM_ADMIN" });
    const r = await login("ROOT@fixia.in "); // normalised
    expect(r.ok && r.kind).toBe("PLATFORM_ADMIN");
    const ctx = await resolveContext(r.ok ? r.token : undefined);
    expect(ctx?.kind).toBe("PLATFORM_ADMIN");
  });

  it("logs a single-gym owner straight into their gym", async () => {
    const gym = await makeGym();
    await join(gym, await makeUser({ email: "own@x.in", password: PW }), "OWNER");
    const r = await login("own@x.in");
    expect(r.ok && r.needsGymSelection).toBe(false);
    const ctx = await resolveContext(r.ok ? r.token : undefined);
    expect(ctx).toMatchObject({ kind: "OWNER", gymId: gym, gymAccess: "ACTIVE" });
  });

  it("gives an owner of a pending gym a session with PENDING access", async () => {
    const gym = await makeGym({ status: "PENDING" });
    await join(gym, await makeUser({ email: "own@x.in", password: PW }), "OWNER");
    const r = await login("own@x.in");
    expect(await resolveContext(r.ok ? r.token : undefined)).toMatchObject({ kind: "OWNER", gymAccess: "PENDING" });
  });

  it("fails identically for wrong password, unknown user, disabled user and users without a gym", async () => {
    const gym = await makeGym();
    await join(gym, await makeUser({ email: "own@x.in", password: PW }), "OWNER");
    await makeUser({ email: "off@x.in", password: PW, status: "DISABLED" });
    await makeUser({ email: "nogym@x.in", password: PW });
    const results = await Promise.all([
      login("own@x.in", "wrong-password-1"), login("ghost@x.in"), login("off@x.in"), login("nogym@x.in"),
    ]);
    for (const r of results) expect(r).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("a member (no password) cannot use password login", async () => {
    const gym = await makeGym();
    await join(gym, await makeUser({ phone: "+919111111111", email: "m@x.in" }), "MEMBER");
    expect(await login("m@x.in")).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("rate limits repeated failures per email, even from rotating IPs", async () => {
    await makeUser({ email: "own@x.in", password: PW });
    for (let i = 0; i < 10; i++) await login("own@x.in", "wrong-password-1", `9.9.9.${i}`);
    const r = await login("own@x.in", PW, "9.9.9.200"); // correct password is refused while limited
    expect(r).toMatchObject({ ok: false, reason: "RATE_LIMITED" });
  });

  it("records successes and failures in the audit log without secrets", async () => {
    await makeUser({ email: "root@fixia.in", password: PW, globalRole: "PLATFORM_ADMIN" });
    await login("root@fixia.in", "wrong-password-1"); await login("root@fixia.in");
    const log = await rows<{ action: string; metadata: unknown }>(`SELECT action, metadata FROM "AuditLog" ORDER BY "createdAt"`);
    expect(log.map((l) => l.action)).toEqual(["auth.login_failed", "auth.platform_admin_login"]);
    expect(JSON.stringify(log)).not.toContain("wrong-password-1");
  });

  it("multi-gym owners must choose, and cannot choose a gym they do not belong to", async () => {
    const [g1, g2, other] = [await makeGym({ name: "One" }), await makeGym({ name: "Two" }), await makeGym({ name: "Not mine" })];
    const uid = await makeUser({ email: "multi@x.in", password: PW });
    await join(g1, uid, "OWNER"); await join(g2, uid, "OWNER");
    const r = await login("multi@x.in");
    expect(r.ok && r.needsGymSelection).toBe(true);
    const token = r.ok ? r.token : "";
    expect((await resolveContext(token))?.kind).toBe("NEEDS_GYM");
    const s = (await validateSessionToken(token))!;
    expect(await selectGymForSession(s.sessionId, uid, other)).toBe(false);
    expect((await resolveContext(token))?.kind).toBe("NEEDS_GYM");
    expect(await selectGymForSession(s.sessionId, uid, g2)).toBe(true);
    expect(await resolveContext(token)).toMatchObject({ kind: "OWNER", gymId: g2 });
  });
});

describe("context is always re-derived from the database", () => {
  it("removing the owner role or deactivating the link kills access on the next request", async () => {
    const gym = await makeGym();
    const uid = await makeUser({ email: "own@x.in", password: PW });
    await join(gym, uid, "OWNER");
    const r = await login("own@x.in"); const token = r.ok ? r.token : "";
    expect(await resolveContext(token)).not.toBeNull();
    await admin.query(`UPDATE "GymUser" SET status='INACTIVE' WHERE "userId"=$1`, [uid]);
    expect(await resolveContext(token)).toBeNull();
  });

  it("subscription expiry and suspension take effect immediately", async () => {
    const gym = await makeGym();
    await join(gym, await makeUser({ email: "own@x.in", password: PW }), "OWNER");
    const r = await login("own@x.in"); const token = r.ok ? r.token : "";
    expect((await resolveContext(token) as { gymAccess: string }).gymAccess).toBe("ACTIVE");
    await admin.query(`UPDATE "Subscription" SET "endsAt" = now() - interval '1 minute', "startsAt" = now() - interval '2 days' WHERE "gymId"=$1`, [gym]);
    expect((await resolveContext(token) as { gymAccess: string }).gymAccess).toBe("EXPIRED");
    await admin.query(`UPDATE "Gym" SET status='SUSPENDED' WHERE id=$1`, [gym]);
    expect((await resolveContext(token) as { gymAccess: string }).gymAccess).toBe("SUSPENDED");
  });

  it("a session pointing at a gym the user does not belong to yields no context", async () => {
    const mine = await makeGym(); const theirs = await makeGym();
    const uid = await makeUser({ email: "own@x.in", password: PW });
    await join(mine, uid, "OWNER");
    const { token } = await createSession({ userId: uid, gymId: theirs, kind: "OWNER" }); // forged/stale binding
    expect(await resolveContext(token)).toBeNull();
  });

  it("a gym's owner role is not valid in another gym", async () => {
    const [g1, g2] = [await makeGym(), await makeGym()];
    const uid = await makeUser({ email: "own@x.in", password: PW });
    await join(g1, uid, "OWNER"); await join(g2, uid, "MEMBER");
    const { token } = await createSession({ userId: uid, gymId: g2, kind: "OWNER" });
    expect(await resolveContext(token)).toMatchObject({ kind: "MEMBER", gymId: g2 }); // role comes from GymUser, not from the session kind
  });
});
