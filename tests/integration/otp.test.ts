import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDb } from "@/server/db";
import { requestMemberOtp, verifyMemberOtp, OTP_TTL_MS } from "@/server/auth/otp";
import { resolveContext } from "@/server/auth/context";
import { selectGymForSession, validateSessionToken } from "@/server/auth/sessions";
import { admin, join, makeGym, makeUser, resetDb, rows } from "../helpers/admin";
import { lastCode, outbox, resetOutbox } from "../helpers/sms";

const PHONE = "+919876543210";
let gym: string, userId: string;
beforeEach(async () => {
  await resetDb(); resetOutbox();
  gym = await makeGym();
  userId = await makeUser({ phone: PHONE, name: "Asha" });
  await join(gym, userId, "MEMBER");
});
afterAll(async () => { await disconnectDb(); await admin.end(); });

const ask = (phone = "98765 43210", ip = "2.2.2.2") => requestMemberOtp({ phone, ip });
const verify = (code: string, phone = PHONE, ip = "2.2.2.2") => verifyMemberOtp({ phone, code, ip });

describe("OTP request", () => {
  it("sends a 6-digit code to a registered member and stores only a hash", async () => {
    expect(await ask()).toEqual({ ok: true });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.to).toBe(PHONE);
    const code = lastCode()!;
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(await rows(`SELECT * FROM "OtpVerification"`))).not.toContain(`"${code}"`);
  });

  it("answers the same way for unknown numbers and sends nothing", async () => {
    expect(await ask("9000000000")).toEqual({ ok: true });
    expect(outbox).toHaveLength(0);
    expect(await rows(`SELECT 1 FROM "OtpVerification"`)).toHaveLength(0);
  });

  it("sends nothing for members of pending or suspended gyms, inactive members or disabled users", async () => {
    const cases: [string, () => Promise<void>][] = [
      ["pending gym", async () => void (await admin.query(`UPDATE "Gym" SET status='PENDING' WHERE id=$1`, [gym]))],
      ["suspended gym", async () => void (await admin.query(`UPDATE "Gym" SET status='SUSPENDED' WHERE id=$1`, [gym]))],
      ["inactive member", async () => void (await admin.query(`UPDATE "GymUser" SET status='INACTIVE'`))],
      ["disabled user", async () => void (await admin.query(`UPDATE "User" SET status='DISABLED'`))],
    ];
    for (const [i, [label, arrange]] of cases.entries()) {
      await resetDb(); resetOutbox();
      gym = await makeGym(); userId = await makeUser({ phone: PHONE }); await join(gym, userId, "MEMBER");
      await arrange();
      expect(await requestMemberOtp({ phone: PHONE, ip: `3.3.3.${i}` }), label).toEqual({ ok: true });
      expect(outbox, label).toHaveLength(0);
    }
  });

  it("rejects malformed numbers", async () => expect(await ask("12345")).toEqual({ ok: false, reason: "INVALID_PHONE" }));

  it("enforces a resend cooldown and an hourly cap per phone", async () => {
    expect(await ask()).toEqual({ ok: true });
    expect(await ask()).toMatchObject({ ok: false, reason: "RATE_LIMITED" });
  });

  it("a staff owner cannot receive a member login code", async () => {
    const o = await makeUser({ phone: "+919800000000", email: "o@x.in", password: "correct horse battery" });
    await join(gym, o, "OWNER");
    await ask("9800000000");
    expect(outbox).toHaveLength(0);
  });

  it("reports delivery problems without leaking whether the number exists", async () => {
    const { setSmsProviderForTests } = await import("@/server/sms");
    setSmsProviderForTests({ send: async () => { throw new Error("provider down"); } });
    expect(await ask()).toEqual({ ok: false, reason: "UNAVAILABLE" });
    expect((await rows<{ consumedAt: Date | null }>(`SELECT "consumedAt" FROM "OtpVerification"`))[0]!.consumedAt).not.toBeNull();
  });
});

describe("OTP verification", () => {
  it("logs the member in with a gym-bound session", async () => {
    await ask();
    const r = await verify(lastCode()!);
    expect(r.ok && r.needsGymSelection).toBe(false);
    expect(await resolveContext(r.ok ? r.token : undefined)).toMatchObject({ kind: "MEMBER", gymId: gym, gymAccess: "ACTIVE", name: "Asha" });
  });

  it("is single-use", async () => {
    await ask(); const code = lastCode()!;
    expect((await verify(code)).ok).toBe(true);
    expect(await verify(code)).toEqual({ ok: false, reason: "INVALID_CODE" });
  });

  it("only one of many parallel submissions wins", async () => {
    await ask(); const code = lastCode()!;
    const results = await Promise.all(Array.from({ length: 8 }, () => verify(code)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("locks the code after 5 wrong guesses, even if the right one follows", async () => {
    await ask(); const code = lastCode()!;
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(await verify(wrong)).toEqual({ ok: false, reason: "INVALID_CODE" });
    expect(await verify(code)).toEqual({ ok: false, reason: "INVALID_CODE" });
  });

  it("rejects expired codes", async () => {
    await ask(); const code = lastCode()!;
    const later = new Date(Date.now() + OTP_TTL_MS + 1000);
    expect(await verifyMemberOtp({ phone: PHONE, code, ip: "2.2.2.2", now: later })).toEqual({ ok: false, reason: "INVALID_CODE" });
  });

  it("a newer code invalidates the older one", async () => {
    await ask(); const first = lastCode()!;
    await admin.query(`DELETE FROM "RateLimit"`); // skip the resend cooldown
    await ask(); const second = lastCode()!;
    if (first !== second) expect(await verify(first)).toEqual({ ok: false, reason: "INVALID_CODE" });
    expect((await verify(second)).ok).toBe(true);
  });

  it("does not log in if the gym was deactivated after the code was sent", async () => {
    await ask(); const code = lastCode()!;
    await admin.query(`UPDATE "Gym" SET status='SUSPENDED' WHERE id=$1`, [gym]);
    expect(await verify(code)).toEqual({ ok: false, reason: "INVALID_CODE" });
  });

  it("rate limits guessing across codes per phone", async () => {
    for (let i = 0; i < 10; i++) await verify("123456", PHONE, `4.4.4.${i}`);
    expect(await verify("123456", PHONE, "4.4.4.99")).toMatchObject({ ok: false, reason: "RATE_LIMITED" });
  });

  it("ignores non-numeric and malformed input", async () => {
    expect(await verify("abcdef")).toEqual({ ok: false, reason: "INVALID_CODE" });
    expect(await verify("12345")).toEqual({ ok: false, reason: "INVALID_CODE" });
  });

  it("members of several gyms must pick one, and only one of theirs", async () => {
    const g2 = await makeGym({ name: "Second" }); const foreign = await makeGym({ name: "Foreign" });
    await join(g2, userId, "MEMBER");
    await ask(); const r = await verify(lastCode()!);
    expect(r.ok && r.needsGymSelection).toBe(true);
    const token = r.ok ? r.token : "";
    expect((await resolveContext(token))?.kind).toBe("NEEDS_GYM");
    const s = (await validateSessionToken(token))!;
    expect(await selectGymForSession(s.sessionId, userId, foreign)).toBe(false);
    expect(await selectGymForSession(s.sessionId, userId, g2)).toBe(true);
    expect(await resolveContext(token)).toMatchObject({ kind: "MEMBER", gymId: g2 });
  });
});
