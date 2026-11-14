"use server";

import { redirect } from "next/navigation";
import { requireGym } from "@/server/auth/guards";
import {
  assignMembership,
  createMember,
  createMembershipPlan,
  recordPayment,
  rotateAttendanceToken,
  setMemberStatus,
  setMembershipPlanActive,
  updateGymSettings,
  updateMemberName,
  voidPayment,
} from "@/server/gyms/operations";
import {
  recordOwnerScannerCheck,
  recordManualAttendance,
} from "@/server/gyms/attendance";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function addMemberAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  let destination = "/owner/members?error=member";
  try {
    const result = await createMember(me.gymId, { name: value(form, "name"), phone: value(form, "phone") }, me.userId, value(form, "planId") || undefined);
    destination = `/owner/members/${result.userId}?notice=member-added`;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    destination = `/owner/members?error=${code === "INVALID_PHONE" ? "phone" : code === "ALREADY_MEMBER" ? "exists" : "member"}`;
  }
  redirect(destination);
}

export async function createMembershipPlanAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  let failed = false;
  try {
    await createMembershipPlan(me.gymId, { name: value(form, "name"), durationDays: value(form, "durationDays"), priceInr: value(form, "priceInr") }, me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/owner/plans?error=plan" : "/owner/plans?notice=plan-created");
}

export async function setMembershipPlanStatusAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  let failed = false;
  try {
    await setMembershipPlanActive(me.gymId, value(form, "planId"), value(form, "active") === "true", me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/owner/plans?error=plan-status" : "/owner/plans?notice=plan-status-updated");
}

export async function assignMembershipAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const userId = value(form, "userId");
  let failed = false;
  try {
    await assignMembership(me.gymId, userId, value(form, "planId"), me.userId);
  } catch {
    failed = true;
  }
  redirect(`/owner/members/${userId}?${failed ? "error=membership" : "notice=membership-assigned"}`);
}

export async function setMemberStatusAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const userId = value(form, "userId");
  let failed = false;
  try {
    await setMemberStatus(me.gymId, userId, value(form, "active") === "true", me.userId);
  } catch {
    failed = true;
  }
  redirect(`/owner/members/${userId}?${failed ? "error=member-status" : "notice=member-status-updated"}`);
}

export async function recordPaymentAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const userId = value(form, "userId");
  let failed = false;
  try {
    await recordPayment(me.gymId, userId, value(form, "membershipId"), {
      amountInr: value(form, "amountInr"),
      method: value(form, "method"),
      reference: value(form, "reference"),
    }, me.userId);
  } catch {
    failed = true;
  }
  redirect(`/owner/members/${userId}?${failed ? "error=payment" : "notice=payment-recorded"}`);
}

export async function voidPaymentAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  let failed = false;
  try {
    await voidPayment(me.gymId, value(form, "paymentId"), value(form, "reason"), me.userId);
  } catch {
    failed = true;
  }
  redirect(`/owner/payments?${failed ? "error=correction" : "notice=payment-corrected"}`);
}

export async function updateGymSettingsAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "limited" });
  let failed = false;
  try {
    await updateGymSettings(me.gymId, {
      name: value(form, "name"),
      phone: value(form, "phone"),
      address: value(form, "address"),
      city: value(form, "city"),
      timezone: value(form, "timezone"),
    }, me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/owner/settings?error=settings" : "/owner/settings?notice=settings-saved");
}

export async function rotateAttendanceTokenAction() {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  try {
    await rotateAttendanceToken(me.gymId, me.userId);
  } catch {
    redirect("/owner/attendance?error=qr");
  }
  redirect("/owner/attendance?notice=qr-rotated");
}

export async function updateMemberNameAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const userId = value(form, "userId");
  let failed = false;
  try {
    await updateMemberName(me.gymId, userId, value(form, "name"), me.userId);
  } catch {
    failed = true;
  }
  redirect(`/owner/members/${userId}?${failed ? "error=member-profile" : "notice=member-profile-updated"}`);
}

export async function ownerCheckMemberAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const token = value(form, "token");
  const res = await recordOwnerScannerCheck(me.gymId, token, me.userId);
  redirect(`/owner/attendance?scan=${res.status.toLowerCase().replaceAll("_", "-")}`);
}

export async function manualAttendanceAction(form: FormData) {
  const me = await requireGym({ roles: ["OWNER"], access: "operational" });
  const userId = value(form, "userId");
  const action = (value(form, "action") || "CHECK_IN") as "CHECK_IN" | "CHECK_OUT";
  const reason = value(form, "reason") || "Front desk manual check";
  let failed = false;
  try {
    await recordManualAttendance({
      gymId: me.gymId,
      userId,
      action,
      reason,
      actorUserId: me.userId,
    });
  } catch {
    failed = true;
  }
  redirect(`/owner/attendance?${failed ? "error=manual-failed" : "notice=manual-recorded"}`);
}