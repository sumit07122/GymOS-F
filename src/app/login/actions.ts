"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/server/audit";
import { loginWithPassword } from "@/server/auth/login";
import { requestMemberOtp, verifyMemberOtp } from "@/server/auth/otp";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "@/server/auth/cookie";
import { requireSignedIn } from "@/server/auth/guards";
import { revokeSessionToken, selectGymForSession } from "@/server/auth/sessions";
import { clientIp } from "@/server/security/ip";
import {
  loginMemberWithPassword,
  setupMemberPassword,
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/server/auth/member-auth";

export type FormState = {
  error?: string;
  step?: "phone" | "code";
  phone?: string;
  success?: boolean;
  message?: string;
};

const str = (f: unknown, k: string): string => {
  if (!f) return "";
  if (typeof (f as { get?: unknown }).get === "function") {
    const val = (f as FormData).get(k);
    return typeof val === "string" ? val : "";
  }
  if (typeof f === "object" && k in f) {
    const val = (f as Record<string, unknown>)[k];
    return typeof val === "string" ? val : "";
  }
  return "";
};

const wait = (s?: number) => `Too many attempts. Please try again in ${Math.max(1, Math.ceil((s ?? 60) / 60))} minute(s).`;

async function reqInfo() {
  try {
    const h = await headers();
    return {
      ip: h ? clientIp(h) : "unknown",
      userAgent: h ? h.get("user-agent") : null,
    };
  } catch {
    return { ip: "unknown", userAgent: null };
  }
}

export async function passwordLoginAction(_: FormState, form: FormData): Promise<FormState> {
  let r;
  try {
    r = await loginWithPassword({ email: str(form, "email"), password: str(form, "password"), ...(await reqInfo()) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login:password:exception]", err);
    return { error: `Sign-in error: ${msg}` };
  }
  if (!r.ok) return { error: r.reason === "RATE_LIMITED" ? wait(r.retryAfterSec) : "Incorrect email or password." };
  await setSessionCookie(r.token, r.expiresAt);
  if (r.kind === "PLATFORM_ADMIN") redirect("/admin");
  if (r.needsGymSelection) redirect("/select-gym");
  redirect("/owner");
}

export async function memberPasswordLoginAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = str(form, "phone");
  const password = str(form, "password");
  let r;
  try {
    r = await loginMemberWithPassword({ phone, password, ...(await reqInfo()) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login:memberPassword:exception]", err);
    return { error: `Sign-in error: ${msg}` };
  }
  if (!r.ok) {
    if (r.reason === "RATE_LIMITED") return { error: wait(r.retryAfterSec) };
    if (r.reason === "NO_ACTIVE_GYM") return { error: "No active gym membership found for this mobile number." };
    return { error: "Incorrect mobile number or password." };
  }
  await setSessionCookie(r.token, r.expiresAt);

  if (r.mustChangePassword) {
    redirect("/login/setup-password");
  }
  if (r.needsGymSelection) {
    redirect("/select-gym");
  }
  redirect("/member");
}

export async function setupPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireSignedIn();
  const currentPassword = str(form, "currentPassword");
  const newPassword = str(form, "newPassword");
  const confirmPassword = str(form, "confirmPassword");

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const { ip } = await reqInfo();
  const r = await setupMemberPassword({
    userId: ctx.userId,
    currentPassword,
    newPassword,
    ip,
  });

  if (!r.ok) {
    return { error: r.error || "Password update failed. Please try again." };
  }

  // Set new session cookie with fresh token
  await setSessionCookie(r.token, r.expiresAt);
  redirect("/member/enroll-email");
}

export async function requestEmailOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireSignedIn();
  const email = str(form, "email");
  const { ip } = await reqInfo();

  const r = await requestEmailVerificationOtp({
    userId: ctx.userId,
    email,
    ip,
  });

  if (!r.ok) {
    if (r.retryAfterSec) return { error: wait(r.retryAfterSec) };
    return { error: r.error || "Could not send verification code. Please check your email or try again later." };
  }

  return { success: true, message: `Verification code sent to ${email}` };
}

export async function verifyEmailOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireSignedIn();
  const email = str(form, "email");
  const code = str(form, "code");
  const { ip } = await reqInfo();

  const r = await verifyEmailOtp({
    userId: ctx.userId,
    email,
    code,
    ip,
  });

  if (!r.ok) {
    return { error: r.error || "Verification failed. Please try again." };
  }

  redirect("/member");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = str(form, "phone");
  const { ip } = await reqInfo();

  const r = await requestPasswordReset({ phone, ip });
  if (!r.ok) {
    if (r.retryAfterSec) return { error: wait(r.retryAfterSec) };
    return { error: r.error || "Unable to process password reset request. Please check your phone number." };
  }

  if (!r.hasVerifiedEmail) {
    return {
      success: false,
      message:
        "No verified email is linked to your account. Please visit your gym front desk or contact your gym manager to reset your password.",
    };
  }

  return {
    success: true,
    message: `Password reset instructions have been sent to your verified email address (${r.maskedEmail}). Check your inbox.`,
  };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form, "token");
  const newPassword = str(form, "newPassword");
  const confirmPassword = str(form, "confirmPassword");

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const { ip } = await reqInfo();
  const r = await resetPasswordWithToken({ token, newPassword, ip });

  if (!r.ok) {
    return { error: r.error || "Reset link is invalid or has expired. Please request a new password reset." };
  }

  redirect("/login?reset=success");
}

export async function requestOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = str(form, "phone");
  let r;
  try {
    r = await requestMemberOtp({ phone, ip: (await reqInfo()).ip });
  } catch {
    return { step: "phone", phone, error: "We could not send a code right now. Please try again shortly or ask your gym." };
  }
  if (r.ok) return { step: "code", phone };
  if (r.reason === "INVALID_PHONE") return { step: "phone", phone, error: "Enter a valid 10-digit Indian mobile number." };
  if (r.reason === "RATE_LIMITED") return { step: "phone", phone, error: wait(r.retryAfterSec) };
  return { step: "phone", phone, error: "We could not send a code right now. Please try again shortly or ask your gym." };
}

export async function verifyOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = str(form, "phone");
  let r;
  try {
    r = await verifyMemberOtp({ phone, code: str(form, "code").trim(), ...(await reqInfo()) });
  } catch {
    return { step: "code", phone, error: "We could not verify that code right now. Please try again shortly." };
  }
  if (!r.ok) {
    return { step: "code", phone, error: r.reason === "RATE_LIMITED" ? wait(r.retryAfterSec) : "That code is incorrect or has expired." };
  }
  await setSessionCookie(r.token, r.expiresAt);
  redirect("/");
}

export async function logoutAction() {
  const ctx = await requireSignedIn();
  await revokeSessionToken(await readSessionToken());
  await audit({ action: "auth.logout", actorUserId: ctx.userId, gymId: "gymId" in ctx ? ctx.gymId : null, ...(await reqInfo()) });
  await clearSessionCookie();
  redirect("/login");
}

export async function selectGymAction(form: FormData) {
  const ctx = await requireSignedIn();
  if (ctx.kind === "PLATFORM_ADMIN") redirect("/admin");
  const ok = await selectGymForSession(ctx.sessionId, ctx.userId, str(form, "gymId"));
  if (!ok) redirect("/select-gym");
  redirect("/");
}
