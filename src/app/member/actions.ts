"use server";

import { redirect } from "next/navigation";
import { requireGym } from "@/server/auth/guards";
import { updateMemberProfile } from "@/server/gyms/operations";
import { recordMemberReceptionScan } from "@/server/gyms/attendance";

export async function checkInAction(form: FormData) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  let result: string;
  try {
    const res = await recordMemberReceptionScan(me.gymId, me.userId, String(form.get("token") ?? ""));
    result = res.status;
  } catch {
    result = "FAILED";
  }
  redirect(`/member/attendance?result=${result.toLowerCase().replaceAll("_", "-")}`);
}

export async function updateMemberProfileAction(form: FormData) {
  const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
  let failed = false;
  try {
    await updateMemberProfile(me.gymId, me.userId, String(form.get("name") ?? ""), me.userId);
  } catch {
    failed = true;
  }
  redirect(failed ? "/member/profile?error=profile" : "/member/profile?notice=profile-saved");
}