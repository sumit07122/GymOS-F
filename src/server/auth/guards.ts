import { cache } from "react";
import { redirect } from "next/navigation";
import { authorize, type AuthContext, type Denial, type Policy } from "./authorize";
import { resolveContext } from "./context";
import { readSessionToken } from "./cookie";

type GymContext = Extract<AuthContext, { gymId: string }>;
type AdminContext = Extract<AuthContext, { kind: "PLATFORM_ADMIN" }>;

/** One database round-trip per request, however many components ask. */
export const currentContext = cache(async () => resolveContext(await readSessionToken()));

export function homeFor(ctx: AuthContext | null): string {
  if (!ctx) return "/login";
  switch (ctx.kind) {
    case "PLATFORM_ADMIN": return "/admin";
    case "NEEDS_GYM": return "/select-gym";
    case "OWNER": return "/owner";
    case "MEMBER": return "/member";
  }
}

function deny(reason: Denial, ctx: AuthContext | null): never {
  if (reason === "UNAUTHENTICATED") redirect("/login");
  if (reason === "NEEDS_GYM") redirect("/select-gym");
  if (reason === "FORBIDDEN") redirect(homeFor(ctx));
  redirect("/gym-status");
}

/** Every protected page AND every server action calls one of these first. Layouts alone are never relied on. */
export async function requirePlatformAdmin(): Promise<AdminContext> {
  const ctx = await currentContext();
  const d = authorize(ctx, { who: "PLATFORM_ADMIN" });
  if (!d.ok) deny(d.reason, ctx);
  return d.ctx as AdminContext;
}

export async function requireGym(policy: Omit<Extract<Policy, { who: "GYM" }>, "who">): Promise<GymContext> {
  const ctx = await currentContext();
  const d = authorize(ctx, { who: "GYM", ...policy });
  if (!d.ok) deny(d.reason, ctx);
  return d.ctx as GymContext;
}

/** Any signed-in identity (used by sign-out and gym selection). */
export async function requireSignedIn(): Promise<AuthContext> {
  const ctx = await currentContext();
  if (!ctx) redirect("/login");
  return ctx;
}
