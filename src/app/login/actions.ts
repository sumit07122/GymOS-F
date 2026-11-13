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

export type FormState = { error?: string; step?: "phone" | "code"; phone?: string };

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const wait = (s?: number) => `Too many attempts. Please try again in ${Math.max(1, Math.ceil((s ?? 60) / 60))} minute(s).`;

async function reqInfo() {
  const h = await headers();
  return { ip: clientIp(h), userAgent: h.get("user-agent") };
}

export async function passwordLoginAction(_: FormState, form: FormData): Promise<FormState> {
  let r;
  try {
    r = await loginWithPassword({ email: str(form, "email"), password: str(form, "password"), ...(await reqInfo()) });
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
  if (!r.ok) return { error: r.reason === "RATE_LIMITED" ? wait(r.retryAfterSec) : "Incorrect email or password." };
  await setSessionCookie(r.token, r.expiresAt);
  redirect("/");
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
