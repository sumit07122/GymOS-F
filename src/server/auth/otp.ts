import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { audit } from "../audit";
import { db, withPlatform } from "../db";
import { otpSecret } from "../env";
import { hitAll } from "../security/ratelimit";
import { maskPhone, normalizeIndianPhone } from "../security/phone";
import { getSmsProvider, OtpDisabledError } from "../sms";
import { loadGymAccess } from "../subscriptions/access";
import { createSession } from "./sessions";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

const codeHash = (id: string, phone: string, code: string) =>
  createHmac("sha256", otpSecret()).update(`${id}:${phone}:${code}`).digest("hex");

/** Gyms where this phone belongs to an active member and the gym is fully active. Members cannot log in otherwise. */
export async function listMemberLoginGyms(userId: string, now = new Date()) {
  return withPlatform(async (tx) => {
    const rows = await tx.gymUser.findMany({
      where: { userId, role: "MEMBER", status: "ACTIVE" },
      select: { gym: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    const out: { id: string; name: string }[] = [];
    for (const r of rows) {
      if ((await loadGymAccess(tx, r.gym.id, now)) === "ACTIVE") out.push(r.gym);
    }
    return out;
  });
}

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_PHONE" | "RATE_LIMITED" | "UNAVAILABLE"; retryAfterSec?: number };

/**
 * Always answers `ok: true` for well-formed numbers, whether or not the number belongs to a member:
 * the response never reveals who is registered.
 */
export async function requestMemberOtp(input: { phone: string; ip: string; now?: Date }): Promise<RequestOtpResult> {
  const now = input.now ?? new Date();
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) return { ok: false, reason: "INVALID_PHONE" };

  const blocked = await hitAll([
    [`otp:req:cooldown:${phone}`, { limit: 1, windowSec: 60 }],
    [`otp:req:phone:${phone}`, { limit: 5, windowSec: 3600 }],
    [`otp:req:ip:${input.ip}`, { limit: 20, windowSec: 3600 }],
  ]);
  if (blocked) return { ok: false, reason: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };

  const user = await db().user.findUnique({ where: { phone }, select: { id: true, status: true } });
  const eligible = user?.status === "ACTIVE" && (await listMemberLoginGyms(user.id, now)).length > 0;
  if (!eligible) {
    await audit({ action: "otp.requested_ineligible", ip: input.ip, metadata: { phone: maskPhone(phone) } });
    return { ok: true };
  }

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().$transaction([
    db().otpVerification.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: now }, // only the newest code is ever valid
    }),
    db().otpVerification.create({
      data: {
        id,
        phone,
        purpose: "MEMBER_LOGIN",
        codeHash: codeHash(id, phone, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        createdAt: now,
        requestIp: input.ip,
      },
    }),
  ]);

  try {
    await getSmsProvider().send(
      phone,
      `${code} is your FIXIA GymOS login code. Valid for 5 minutes. Do not share it with anyone.`,
    );
  } catch (e) {
    await db().otpVerification.update({ where: { id }, data: { consumedAt: now } });
    if (!(e instanceof OtpDisabledError)) console.error("OTP delivery failed", e);
    return { ok: false, reason: "UNAVAILABLE" };
  }
  await audit({ action: "otp.requested", actorUserId: user.id, ip: input.ip, metadata: { phone: maskPhone(phone) } });
  return { ok: true };
}

export type VerifyOtpResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      gyms: { id: string; name: string }[];
      needsGymSelection: boolean;
    }
  | { ok: false; reason: "INVALID_CODE" | "RATE_LIMITED"; retryAfterSec?: number };

export async function verifyMemberOtp(input: {
  phone: string;
  code: string;
  ip: string;
  userAgent?: string | null;
  now?: Date;
}): Promise<VerifyOtpResult> {
  const now = input.now ?? new Date();
  const fail = (): VerifyOtpResult => ({ ok: false, reason: "INVALID_CODE" });
  const phone = normalizeIndianPhone(input.phone);
  if (!phone || !/^\d{6}$/.test(input.code)) return fail();

  const blocked = await hitAll([
    [`otp:verify:phone:${phone}`, { limit: 10, windowSec: 900 }],
    [`otp:verify:ip:${input.ip}`, { limit: 30, windowSec: 900 }],
  ]);
  if (blocked) return { ok: false, reason: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };

  const otp = await db().otpVerification.findFirst({
    where: { phone, purpose: "MEMBER_LOGIN", consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return fail();

  // Count the attempt atomically BEFORE comparing, so parallel guesses cannot exceed the limit.
  const counted = await db().otpVerification.updateMany({
    where: { id: otp.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count !== 1) return fail();

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(codeHash(otp.id, phone, input.code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await audit({ action: "otp.verify_failed", ip: input.ip, metadata: { phone: maskPhone(phone) } });
    return fail();
  }

  // Single use: exactly one concurrent request can consume the code.
  const consumed = await db().otpVerification.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) return fail();

  const user = await db().user.findUnique({ where: { phone }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return fail();
  const gyms = await listMemberLoginGyms(user.id, now);
  if (gyms.length === 0) return fail();

  const only = gyms.length === 1 ? gyms[0]! : null;
  const session = await createSession({
    userId: user.id,
    gymId: only?.id ?? null,
    kind: "MEMBER",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
  await audit({ action: "auth.member_login", actorUserId: user.id, gymId: only?.id ?? null, ip: input.ip });
  return { ok: true, ...session, gyms, needsGymSelection: gyms.length > 1 };
}
