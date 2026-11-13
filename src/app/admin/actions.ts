"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/guards";
import {
  activateOrRenewGym,
  createGymAndOwner,
  createSubscriptionPlan,
  createAdditionalOwner,
  resetGymOwnerPassword,
  setSubscriptionPlanActive,
  setGymSuspended,
} from "@/server/platform/admin";
import { approveRegistrationRequest, rejectRegistrationRequest } from "@/server/platform/registration";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createGymAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let error: string | undefined;
  try {
    await createGymAndOwner({
      name: value(form, "name"),
      slug: value(form, "slug"),
      phone: value(form, "phone"),
      address: value(form, "address"),
      city: value(form, "city"),
      ownerName: value(form, "ownerName"),
      ownerEmail: value(form, "ownerEmail"),
      ownerPassword: String(form.get("ownerPassword") ?? ""),
    }, me.userId);
  } catch (cause) {
    error = cause instanceof Error && cause.message === "SLUG_TAKEN" ? "slug" :
      cause instanceof Error && cause.message === "EMAIL_TAKEN" ? "email" : "invalid";
  }
  redirect(error ? `/admin?error=${error}` : "/admin?notice=gym-created");
}

export async function createPlanAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let failed = false;
  try {
    await createSubscriptionPlan({
      name: value(form, "name"),
      priceInr: value(form, "priceInr"),
      durationDays: value(form, "durationDays"),
    }, me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/admin?error=plan" : "/admin?notice=plan-created");
}

export async function activateOrRenewAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let failed = false;
  try {
    await activateOrRenewGym(value(form, "gymId"), value(form, "planId"), me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/admin?error=subscription" : "/admin?notice=subscription-updated");
}

export async function setGymStatusAction(form: FormData) {
  const me = await requirePlatformAdmin();
  const gymId = value(form, "gymId");
  const suspended = value(form, "suspended") === "true";
  let failed = false;
  try {
    await setGymSuspended(gymId, suspended, me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/admin?error=gym-status" : "/admin?notice=gym-status-updated");
}

export async function approveRegistrationAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let error: string | undefined;
  try {
    await approveRegistrationRequest({
      requestId: value(form, "requestId"),
      slug: value(form, "slug"),
      ownerPassword: String(form.get("ownerPassword") ?? "") || undefined,
    }, me.userId);
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    error = code === "SLUG_TAKEN" ? "slug" : code === "PASSWORD_REQUIRED" ? "password" : code === "ACCOUNT_DISABLED" || code === "ACCOUNT_ROLE_CONFLICT" ? "account" : "request";
  }
  redirect(error ? `/admin?registrationError=${error}` : "/admin?notice=request-approved");
}

export async function rejectRegistrationAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let failed = false;
  try {
    await rejectRegistrationRequest(value(form, "requestId"), me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/admin?registrationError=request" : "/admin?notice=request-rejected");
}

export async function setSubscriptionPlanStatusAction(form: FormData) {
  const me = await requirePlatformAdmin();
  let failed = false;
  try {
    await setSubscriptionPlanActive(value(form, "planId"), value(form, "active") === "true", me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/admin?error=plan-status" : "/admin?notice=plan-status-updated");
}

export async function addOwnerAction(form: FormData) {
  const me = await requirePlatformAdmin();
  const gymId = value(form, "gymId");
  let result = "owner-created";
  try {
    await createAdditionalOwner(gymId, { name: value(form, "name"), email: value(form, "email"), password: String(form.get("password") ?? "") || undefined }, me.userId);
  } catch (error) {
    result = error instanceof Error && error.message === "EMAIL_TAKEN" ? "email" : "owner";
  }
  redirect(`/admin?${result === "owner-created" ? "notice" : "error"}=${result}`);
}

export async function resetOwnerPasswordAction(form: FormData) {
  const me = await requirePlatformAdmin();
  const gymId = value(form, "gymId");
  let result = "password-reset";
  try {
    await resetGymOwnerPassword(gymId, value(form, "ownerUserId"), String(form.get("password") ?? ""), me.userId);
  } catch {
    result = "owner-password";
  }
  redirect(`/admin?${result === "password-reset" ? "notice" : "error"}=${result}`);
}