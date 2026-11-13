import type { GymAccess } from "../subscriptions/access";

export type AuthContext =
  | { kind: "PLATFORM_ADMIN"; userId: string; sessionId: string; name: string }
  | { kind: "NEEDS_GYM"; userId: string; sessionId: string; name: string }
  | {
      kind: "OWNER" | "MEMBER";
      userId: string;
      sessionId: string;
      name: string;
      gymId: string;
      gymAccess: GymAccess;
    };

export type Policy =
  | { who: "PLATFORM_ADMIN" }
  | {
      who: "GYM";
      roles: readonly ("OWNER" | "MEMBER")[];
      /** operational: gym ACTIVE. limited: also PENDING/EXPIRED (owners only). any: every state, for status screens. */
      access: "operational" | "limited" | "any";
    };

export type Denial =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NEEDS_GYM"
  | "GYM_PENDING"
  | "GYM_EXPIRED"
  | "GYM_SUSPENDED";

export type Decision<C extends AuthContext = AuthContext> = { ok: true; ctx: C } | { ok: false; reason: Denial };

/** Pure decision function: the single place that maps (who you are, what the gym may do) to allow/deny. */
export function authorize(ctx: AuthContext | null, policy: Policy): Decision {
  if (!ctx) return { ok: false, reason: "UNAUTHENTICATED" };
  if (policy.who === "PLATFORM_ADMIN") {
    return ctx.kind === "PLATFORM_ADMIN" ? { ok: true, ctx } : { ok: false, reason: "FORBIDDEN" };
  }
  if (ctx.kind === "NEEDS_GYM") return { ok: false, reason: "NEEDS_GYM" };
  if (ctx.kind === "PLATFORM_ADMIN") return { ok: false, reason: "FORBIDDEN" };
  if (!policy.roles.includes(ctx.kind)) return { ok: false, reason: "FORBIDDEN" };

  const a = ctx.gymAccess;
  if (policy.access === "any") return { ok: true, ctx };
  if (a === "SUSPENDED") return { ok: false, reason: "GYM_SUSPENDED" };
  if (a === "ACTIVE") return { ok: true, ctx };
  // Pending or expired: owners keep limited access, members get none.
  if (policy.access === "limited" && ctx.kind === "OWNER") return { ok: true, ctx };
  return { ok: false, reason: a === "PENDING" ? "GYM_PENDING" : "GYM_EXPIRED" };
}
