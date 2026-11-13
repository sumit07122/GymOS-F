"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp } from "@/server/security/ip";
import { submitRegistrationRequest } from "@/server/platform/registration";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function submitRegistrationAction(form: FormData) {
  const h = await headers();
  try {
    await submitRegistrationRequest({
      gymName: value(form, "gymName"),
      ownerName: value(form, "ownerName"),
      ownerEmail: value(form, "ownerEmail"),
      ownerPhone: value(form, "ownerPhone"),
      city: value(form, "city"),
      address: value(form, "address"),
      notes: value(form, "notes"),
    }, clientIp(h));
  } catch (error) {
    const reason = error instanceof Error && error.message === "RATE_LIMITED" ? "limited" :
      error instanceof Error && error.message === "INVALID_PHONE" ? "phone" : "details";
    redirect(`/register?error=${reason}`);
  }
  redirect("/register?submitted=1");
}