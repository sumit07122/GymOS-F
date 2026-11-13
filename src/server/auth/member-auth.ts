import crypto from "node:crypto";
import { z } from "zod";
import { db, withPlatform } from "../db";
import { hashPassword, verifyPassword } from "../security/password";
import { normalizeIndianPhone, maskPhone } from "../security/phone";
import { hitAll } from "../security/ratelimit";
import { audit } from "../audit";
import { otpSecret } from "../env";
import {
  createSession,
  revokeAllSessions,
  listUserGyms,
  type SessionKind,
} from "./sessions";
import { listMemberLoginGyms } from "./otp";
import {
  sendMemberEmailVerificationOtp,
  sendPasswordResetEmail,
  sendPasswordChangedAlert,
} from "../email";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const emailCodeHash = (userId: string, email: string, code: string) =>
  crypto
    .createHmac("sha256", otpSecret())
    .update(`${userId}:${email.toLowerCase().trim()}:${code}`)
    .digest("hex");

const tokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export type MemberPasswordLoginResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      kind: SessionKind;
      mustChangePassword: boolean;
      needsGymSelection: boolean;
    }
  | {
      ok: false;
      reason: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "NO_ACTIVE_GYM";
      retryAfterSec?: number;
    };

/**
 * Authenticates a gym member using Phone Number + Password.
 * Enforces rate limiting, E.164 normalization, Argon2 verification,
 * and tenant eligibility.
 */
export async function loginMemberWithPassword(input: {
  phone: string;
  password: string;
  ip: string;
  userAgent?: string | null;
  now?: Date;
}): Promise<MemberPasswordLoginResult> {
  const now = input.now ?? new Date();
  const invalid = (): MemberPasswordLoginResult => ({
    ok: false,
    reason: "INVALID_CREDENTIALS",
  });

  const phone = normalizeIndianPhone(input.phone);
  if (!phone || !input.password || input.password.length > 128) {
    return invalid();
  }

  // Rate limit
  const blocked = await hitAll([
    [`login:member:phone:${phone}`, { limit: 10, windowSec: 900 }],
    [`login:member:ip:${input.ip}`, { limit: 40, windowSec: 900 }],
  ]);
  if (blocked) {
    return { ok: false, reason: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };
  }

  const user = await db().user.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      passwordHash: true,
      status: true,
      mustChangePassword: true,
    },
  });

  const passwordOk = await verifyPassword(user?.passwordHash, input.password);
  if (!user || !passwordOk || user.status !== "ACTIVE") {
    await audit({
      action: "auth.member_login_failed",
      ip: input.ip,
      actorUserId: user?.id ?? null,
      metadata: { phone: maskPhone(phone) },
    });
    return invalid();
  }

  // Check eligible gyms where member is active and gym is operational
  const eligibleGyms = await listMemberLoginGyms(user.id, now);
  if (eligibleGyms.length === 0) {
    await audit({
      action: "auth.member_login_failed",
      ip: input.ip,
      actorUserId: user.id,
      metadata: { why: "no_active_gym" },
    });
    return { ok: false, reason: "NO_ACTIVE_GYM" };
  }

  const gymId = eligibleGyms.length === 1 ? eligibleGyms[0]!.id : null;
  const needsGymSelection = eligibleGyms.length > 1;

  // Update last login
  await db().user.update({
    where: { id: user.id },
    data: { lastLoginAt: now },
  });

  const session = await createSession({
    userId: user.id,
    gymId,
    kind: "MEMBER",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });

  await audit({
    action: "auth.member_password_login",
    actorUserId: user.id,
    gymId,
    ip: input.ip,
  });

  return {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    kind: "MEMBER",
    mustChangePassword: user.mustChangePassword,
    needsGymSelection,
  };
}

/**
 * Mandatory first-login password change or regular password update.
 * Validates complexity, hashes with Argon2, clears mustChangePassword flag.
 */
export async function setupMemberPassword(params: {
  userId: string;
  currentPassword?: string;
  newPassword: string;
  ip: string;
}): Promise<
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string; retryAfterSec?: number }
> {
  const { userId, currentPassword, newPassword, ip } = params;

  // Validate strength
  const strengthCheck = passwordStrengthSchema.safeParse(newPassword);
  if (!strengthCheck.success) {
    return { ok: false, error: strengthCheck.error.issues[0]?.message ?? "Password is too weak." };
  }

  const user = await db().user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, mustChangePassword: true },
  });

  if (!user) return { ok: false, error: "User account not found." };

  // If user already had a password and not in mandatory change mode, verify current password
  if (user.passwordHash && !user.mustChangePassword && currentPassword) {
    const verified = await verifyPassword(user.passwordHash, currentPassword);
    if (!verified) {
      return { ok: false, error: "Current password does not match." };
    }
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date();

  await db().user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: now,
    },
  });

  await revokeAllSessions(userId);
  const session = await createSession({
    userId,
    gymId: null,
    kind: "MEMBER",
    ip,
  });

  await audit({
    action: "auth.member_password_changed",
    actorUserId: userId,
    ip,
  });

  return { ok: true, token: session.token, expiresAt: session.expiresAt };
}

/** Requests a 6-digit email enrollment verification OTP via Resend. */
export async function requestEmailVerificationOtp(params: {
  userId: string;
  email: string;
  ip: string;
}): Promise<{ ok: boolean; error?: string; retryAfterSec?: number }> {
  const { userId, email, ip } = params;

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const cleanEmail = parsed.data;

  // Rate limits
  const blocked = await hitAll([
    [`email_otp:cooldown:${userId}`, { limit: 1, windowSec: 60 }],
    [`email_otp:req:user:${userId}`, { limit: 5, windowSec: 3600 }],
    [`email_otp:req:ip:${ip}`, { limit: 20, windowSec: 3600 }],
  ]);
  if (blocked) {
    return { ok: false, error: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };
  }

  const user = await db().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) return { ok: false, error: "User not found." };

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hash = emailCodeHash(userId, cleanEmail, otp);
  const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 mins

  await db().emailVerificationToken.create({
    data: {
      userId,
      email: cleanEmail,
      codeHash: hash,
      expiresAt,
    },
  });

  // Dispatch via Resend
  await sendMemberEmailVerificationOtp({
    to: cleanEmail,
    memberName: user.name,
    otp,
  });

  await audit({
    action: "auth.email_verification_otp_sent",
    actorUserId: userId,
    ip,
    metadata: { targetEmail: cleanEmail },
  });

  return { ok: true };
}

/** Verifies the 6-digit email OTP and updates emailVerified status. */
export async function verifyEmailOtp(params: {
  userId: string;
  email: string;
  code: string;
  ip: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId, email, code, ip } = params;
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date();

  const tokenRecord = await db().emailVerificationToken.findFirst({
    where: {
      userId,
      email: cleanEmail,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord || tokenRecord.attempts >= 5) {
    return {
      ok: false,
      error: "Verification code is expired or invalid. Please request a new code.",
    };
  }

  // Increment attempts
  await db().emailVerificationToken.update({
    where: { id: tokenRecord.id },
    data: { attempts: { increment: 1 } },
  });

  const expectedHash = emailCodeHash(userId, cleanEmail, code.trim());
  const isMatch =
    expectedHash.length === tokenRecord.codeHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedHash, "utf8"),
      Buffer.from(tokenRecord.codeHash, "utf8")
    );

  if (!isMatch) {
    return { ok: false, error: "Incorrect verification code. Please try again." };
  }

  // Mark token consumed
  await db().emailVerificationToken.update({
    where: { id: tokenRecord.id },
    data: { consumedAt: now },
  });

  // Mark user email verified
  await db().user.update({
    where: { id: userId },
    data: {
      email: cleanEmail,
      emailVerified: true,
      emailVerifiedAt: now,
    },
  });

  await audit({
    action: "auth.email_verified_successfully",
    actorUserId: userId,
    ip,
    metadata: { verifiedEmail: cleanEmail },
  });

  return { ok: true };
}

/** Initiates a forgot-password workflow. Sends reset link via Resend if email is verified. */
export async function requestPasswordReset(params: {
  phone: string;
  ip: string;
  appUrl?: string;
}): Promise<{
  ok: boolean;
  hasVerifiedEmail: boolean;
  maskedEmail?: string;
  error?: string;
  retryAfterSec?: number;
}> {
  const { phone: rawPhone, ip, appUrl } = params;
  const phone = normalizeIndianPhone(rawPhone);
  if (!phone) {
    return { ok: false, hasVerifiedEmail: false, error: "Please enter a valid mobile number." };
  }

  // Rate limit
  const blocked = await hitAll([
    [`forgot_pw:phone:${phone}`, { limit: 3, windowSec: 3600 }],
    [`forgot_pw:ip:${ip}`, { limit: 15, windowSec: 3600 }],
  ]);
  if (blocked) {
    return { ok: false, hasVerifiedEmail: false, error: "RATE_LIMITED", retryAfterSec: blocked.retryAfterSec };
  }

  const user = await db().user.findUnique({
    where: { phone },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  // If user does not exist or has no verified email, return generic safe response
  if (!user || !user.email || !user.emailVerified) {
    await audit({
      action: "auth.password_reset_unverified_attempt",
      ip,
      metadata: { phone: maskPhone(phone), hasAccount: Boolean(user) },
    });
    return { ok: true, hasVerifiedEmail: false };
  }

  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = tokenHash(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60_000); // 30 minutes

  await db().passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashed,
      expiresAt,
    },
  });

  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  // Send Resend email
  await sendPasswordResetEmail({
    to: user.email,
    memberName: user.name,
    resetUrl,
    expiresMinutes: 30,
  });

  const [localPart, domain] = user.email.split("@");
  const maskedEmail =
    localPart && domain
      ? `${localPart.slice(0, 2)}***@${domain}`
      : "your registered email";

  await audit({
    action: "auth.password_reset_link_dispatched",
    actorUserId: user.id,
    ip,
  });

  return {
    ok: true,
    hasVerifiedEmail: true,
    maskedEmail,
  };
}

/** Validates reset token and sets new password. Revokes all existing user sessions. */
export async function resetPasswordWithToken(params: {
  token: string;
  newPassword: string;
  ip: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { token, newPassword, ip } = params;

  if (!token || token.length < 32) {
    return { ok: false, error: "Invalid or expired password reset link." };
  }

  const strengthCheck = passwordStrengthSchema.safeParse(newPassword);
  if (!strengthCheck.success) {
    return { ok: false, error: strengthCheck.error.issues[0]?.message ?? "Password is too weak." };
  }

  const hashed = tokenHash(token);
  const now = new Date();

  return withPlatform(async (tx) => {
    const tokenRecord = await tx.passwordResetToken.findUnique({
      where: { tokenHash: hashed },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt !== null ||
      tokenRecord.expiresAt < now
    ) {
      return {
        ok: false,
        error: "This password reset link has expired or has already been used.",
      };
    }

    const newHash = await hashPassword(newPassword);

    // Update password, mark mustChangePassword false
    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: now,
      },
    });

    // Mark token used
    await tx.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: now },
    });

    // Revoke all existing sessions
    await revokeAllSessions(tokenRecord.userId);

    // Send confirmation alert email if user has email
    if (tokenRecord.user.email) {
      await sendPasswordChangedAlert({
        to: tokenRecord.user.email,
        memberName: tokenRecord.user.name,
      });
    }

    await audit({
      action: "auth.password_reset_completed",
      actorUserId: tokenRecord.userId,
      ip,
    });

    return { ok: true };
  });
}

